const { exec } = require('child_process');
const os = require('os');

class GameMonitorService {
  constructor(db, gameSessionService) {
    this.db = db;
    this.gameSessionService = gameSessionService;
    this.monitoredGames = new Map(); // sessionId -> { gameId, processName, startTime }
    this.monitoringInterval = null;
    this.isMonitoring = false;
  }

  async startMonitoring(gameId, processName) {
    try {
      console.log(`Starting monitoring for game ${gameId} with process: ${processName}`);
      
      // Start a new game session
      const sessionId = await this.gameSessionService.startGameSession(gameId);
      
      // Add to monitored games
      this.monitoredGames.set(sessionId, {
        gameId,
        processName,
        startTime: new Date(),
        sessionId
      });
      
      // Start monitoring if not already running
      if (!this.isMonitoring) {
        this.startMonitoringLoop();
      }
      
      return sessionId;
    } catch (error) {
      console.error('Error starting game monitoring:', error);
      throw error;
    }
  }

  async stopMonitoring(sessionId) {
    try {
      console.log(`Stopping monitoring for session: ${sessionId}`);
      
      const monitoredGame = this.monitoredGames.get(sessionId);
      if (monitoredGame) {
        // End the game session
        await this.gameSessionService.endGameSession(sessionId);
        
        // Remove from monitored games
        this.monitoredGames.delete(sessionId);
        
        console.log(`Stopped monitoring for game ${monitoredGame.gameId}`);
      }
      
      // Stop monitoring loop if no more games are being monitored
      if (this.monitoredGames.size === 0) {
        this.stopMonitoringLoop();
      }
    } catch (error) {
      console.error('Error stopping game monitoring:', error);
      throw error;
    }
  }

  startMonitoringLoop() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('Starting game monitoring loop...');
    
    // delay 60 seconds before starting the monitoring loop
    setTimeout(() => {
      this.checkRunningGames();
      this.monitoringInterval = setInterval(async () => {
        await this.checkRunningGames();
      }, 10000); // Check every 10 seconds
    }, 60000);
  }

  stopMonitoringLoop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.isMonitoring = false;
      console.log('Stopped game monitoring loop');
    }
  }

  async checkRunningGames() {
    for (const [sessionId, monitoredGame] of this.monitoredGames.entries()) {
      try {
        const isRunning = await this.isProcessRunning(monitoredGame.processName);
        
        if (!isRunning) {
          console.log(`Process ${monitoredGame.processName} is no longer running, ending session ${sessionId}`);
          await this.stopMonitoring(sessionId);
        }
      } catch (error) {
        console.error(`Error checking process ${monitoredGame.processName}:`, error);
      }
    }
  }

  async isProcessRunning(processName) {
    return new Promise((resolve) => {
      const platform = os.platform();
      
      if (platform === 'win32') {
        // Windows: use tasklist
        const command = `tasklist /FI "IMAGENAME eq ${processName}" /FO CSV /NH`;
        exec(command, (error, stdout) => {
          if (error) {
            console.error('Error checking Windows process:', error);
            resolve(false);
            return;
          }
          
          // Check if the process is in the output
          const isRunning = stdout.toLowerCase().includes(processName.toLowerCase());
          resolve(isRunning);
        });
      } else {
        // Unix-like systems: use pgrep
        const command = `pgrep -f "${processName}"`;
        exec(command, (error, stdout) => {
          if (error) {
            // pgrep returns non-zero exit code if no process found
            resolve(false);
            return;
          }
          
          resolve(stdout.trim().length > 0);
        });
      }
    });
  }

  async getMonitoredGames() {
    const monitoredGamesList = [];
    
    for (const [sessionId, monitoredGame] of this.monitoredGames.entries()) {
      try {
        // Get game info from database
        const game = await this.getGameById(monitoredGame.gameId);
        if (game) {
          monitoredGamesList.push({
            sessionId: monitoredGame.sessionId,
            gameId: monitoredGame.gameId,
            gameName: game.name,
            processName: monitoredGame.processName,
            startTime: monitoredGame.startTime,
            isRunning: await this.isProcessRunning(monitoredGame.processName)
          });
        }
      } catch (error) {
        console.error(`Error getting monitored game info for ${monitoredGame.gameId}:`, error);
      }
    }
    
    return monitoredGamesList;
  }

  async getGameById(gameId) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM games WHERE id = ?', [gameId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // Cleanup method to be called when the app is shutting down
  async cleanup() {
    console.log('Cleaning up game monitoring...');
    this.stopMonitoringLoop();
    
    // End all active sessions
    for (const [sessionId, monitoredGame] of this.monitoredGames.entries()) {
      try {
        await this.gameSessionService.endGameSession(sessionId);
      } catch (error) {
        console.error(`Error ending session ${sessionId} during cleanup:`, error);
      }
    }
    
    this.monitoredGames.clear();
  }
}

module.exports = GameMonitorService;
