const { exec } = require('child_process');
const os = require('os');

class GameMonitorService {
  constructor(db, gameSessionService) {
    this.db = db;
    this.gameSessionService = gameSessionService;
    this.monitoredGames = new Map(); // gameId -> { gameId, processName, startTime, sessionId }
    this.monitoringInterval = null;
    this.isMonitoring = false;
  }

  async startMonitoring(gameId, processName) {
    try {
      // Start monitoring if not already running
      if (this.isMonitoring) {
        console.log("Monitoring already running, skipping startMonitoring");
      }

      console.log(`Starting monitoring for game ${gameId} with process: ${processName}`);

      // Enforce only one monitored game at a time
      if (this.monitoredGames.size > 0 && !this.monitoredGames.has(gameId)) {
        for (const [existingGameId] of this.monitoredGames.entries()) {
          try {
            await this.stopMonitoring(existingGameId);
          } catch (e) {
            console.error(`Failed to stop existing monitored game ${existingGameId}:`, e);
          }
        }
      }

      // If this game is already monitored, return the existing session
      const existing = this.monitoredGames.get(gameId);
      if (existing) {
        console.log(`Game ${gameId} is already being monitored; reusing session ${existing.sessionId}`);
        this.startMonitoringLoop();
        return existing.sessionId;
      }

      
      // Start a new game session
      const sessionId = await this.gameSessionService.startGameSession(gameId);
      
      // Add to monitored games
      this.monitoredGames.set(gameId, {
        gameId,
        processName,
        startTime: new Date(),
        sessionId
      });


      // this.monitoredGames.set(sessionId, {
      //   gameId,
      //   processName,
      //   startTime: new Date(),
      //   sessionId
      // });
      
      this.startMonitoringLoop();

      
      return sessionId;
    } catch (error) {
      console.error('Error starting game monitoring:', error);
      throw error;
    }
  }

  async stopMonitoring(gameId) {
    try {
      console.log(`Stopping monitoring for game: ${gameId}`);
      
      const monitoredGame = this.monitoredGames.get(gameId);
      if (monitoredGame) {
        // End the game session
        await this.gameSessionService.endGameSession(monitoredGame.sessionId);
        
        // Remove from monitored games
        this.monitoredGames.delete(gameId);
        
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
    for (const [gameId, monitoredGame] of this.monitoredGames.entries()) {
      try {
        const isRunning = await this.isProcessRunning(monitoredGame.processName);
        
        if (!isRunning) {
          console.log(`Process ${monitoredGame.processName} is no longer running, stopping monitoring for game ${gameId}`);
          await this.stopMonitoring(gameId);
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
    
    for (const [gameId, monitoredGame] of this.monitoredGames.entries()) {
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
    for (const [gameId, monitoredGame] of this.monitoredGames.entries()) {
      try {
        await this.gameSessionService.endGameSession(monitoredGame.sessionId);
      } catch (error) {
        console.error(`Error ending session ${monitoredGame.sessionId} during cleanup:`, error);
      }
    }
    
    this.monitoredGames.clear();
  }
}

module.exports = GameMonitorService;
