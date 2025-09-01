const { exec } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { Notification, BrowserWindow, screen, shell, app } = require('electron');

class GameMonitorService {
  constructor(db, gameSessionService, configService) {
    this.db = db;
    this.gameSessionService = gameSessionService;
    this.configService = configService;
    this.monitoredGames = new Map(); // gameId -> { gameId, processName, startTime, sessionId }
    this.monitoringInterval = null;
    this.isMonitoring = false;
    this.gameTimerInterval = null; // single interval since only one game is monitored
    this.overlayWindow = null;
    this.overlayHideTimeout = null;
    this.audioWindow = null;
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
        await this.setupGameTimer(gameId);
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
      await this.setupGameTimer(gameId);
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
        // Clear any game timer
        this.clearGameTimer(gameId);
        
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
    // Clear timer
    this.clearGameTimer();
  }

  async setupGameTimer(gameId) {
    try {
      if (!this.configService) return;
      const cfg = await this.configService.getConfig();
      const minutes = typeof cfg?.gameTimerMinutes === 'number' ? cfg.gameTimerMinutes : 0;

      if (minutes > 0) {
        console.log(`Setting up game timer for game ${gameId} with ${minutes} minutes`);
        this.clearGameTimer(gameId);
        const delayMs = Math.max(1, Math.floor(minutes)) * 60 * 1000;
        this.gameTimerInterval = setInterval(() => {
          console.log(`Showing playtime notification for game ${gameId}`);
          this.showPlaytimeNotification(gameId).catch((err) => {
            console.error('Game timer notification error:', err);
          });
          this.playReminderSound();
        }, delayMs);
      } else {
        this.clearGameTimer(gameId);
      }
    } catch (err) {
      console.error('Failed to setup game timer:', err);
    }
  }

  clearGameTimer(gameId) {
    if (this.gameTimerInterval) {
      clearInterval(this.gameTimerInterval);
      this.gameTimerInterval = null;
    }
    if (this.overlayHideTimeout) {
      clearTimeout(this.overlayHideTimeout);
      this.overlayHideTimeout = null;
    }
    try {
      if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
        this.overlayWindow.hide();
      }
    } catch (_) {}
  }

  async showPlaytimeOverlay(gameId) {
    try {
      const monitored = this.monitoredGames.get(gameId);
      if (!monitored) return;

      const start = monitored.startTime instanceof Date ? monitored.startTime : new Date(monitored.startTime);
      const now = new Date();
      const elapsedMinutes = Math.max(0, Math.floor((now - start) / 60000));

      const game = await this.getGameById(monitored.gameId).catch(() => null);
      const title = game?.name ? `${game.name}` : 'Game';
      const body = elapsedMinutes > 0
        ? `You've been playing for ${elapsedMinutes} minute${elapsedMinutes === 1 ? '' : 's'}.`
        : `Game session started.`;

      const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'unsafe-inline'" />
    <style>
      body { margin: 0; font-family: -apple-system, Segoe UI, Roboto, sans-serif; }
      .overlay {
        width: 100%; height: 100%;
        display: flex; flex-direction: column; justify-content: center; align-items: flex-start;
        padding: 12px 14px; box-sizing: border-box;
        color: #fff; background: rgba(20,20,20,0.85);
        border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.35);
      }
      .title { font-size: 14px; font-weight: 600; opacity: 0.95; }
      .msg { font-size: 13px; margin-top: 4px; opacity: 0.9; }
    </style>
  </head>
  <body>
    <div class="overlay">
      <div class="title">${title} timer</div>
      <div class="msg">${body}</div>
    </div>
  </body>
</html>`;

      // Create or reuse overlay window
      if (!this.overlayWindow || this.overlayWindow.isDestroyed()) {
        const display = screen.getPrimaryDisplay();
        const workArea = display?.workArea || { x: 0, y: 0, width: 1280, height: 720 };
        const width = 320;
        const height = 88;
        const x = Math.max(0, workArea.x + workArea.width - width - 20);
        const y = Math.max(0, workArea.y + 20);

        this.overlayWindow = new BrowserWindow({
          width,
          height,
          x,
          y,
          frame: false,
          transparent: true,
          resizable: false,
          fullscreenable: false,
          skipTaskbar: true,
          alwaysOnTop: true,
          focusable: false,
          hasShadow: false,
          backgroundColor: '#00000000',
          show: false,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
          },
        });

        try {
          this.overlayWindow.setIgnoreMouseEvents(true, { forward: true });
          this.overlayWindow.setVisibleOnAllWorkspaces(true);
          this.overlayWindow.setAlwaysOnTop(true, 'screen-saver');
        } catch (_) {}

        this.overlayWindow.on('closed', () => {
          this.overlayWindow = null;
        });
      }

      const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
      await this.overlayWindow.loadURL(dataUrl);
      try { this.overlayWindow.setAlwaysOnTop(true, 'screen-saver'); } catch (_) {}
      if (!this.overlayWindow.isVisible()) {
        this.overlayWindow.showInactive();
      } else {
        this.overlayWindow.moveTop();
      }

      // Auto-hide after a few seconds
      if (this.overlayHideTimeout) {
        clearTimeout(this.overlayHideTimeout);
      }
      this.overlayHideTimeout = setTimeout(() => {
        try {
          if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
            this.overlayWindow.hide();
          }
        } catch (_) {}
      }, 4000);

    } catch (err) {
      console.error('Error showing playtime overlay:', err);
    }
  }

  async showPlaytimeNotification(gameId) {
    try {
      const monitored = this.monitoredGames.get(gameId);
      if (!monitored) return;
      const start = monitored.startTime instanceof Date ? monitored.startTime : new Date(monitored.startTime);
      const now = new Date();
      const elapsedMinutes = Math.max(0, Math.floor((now - start) / 60000));

      const game = await this.getGameById(monitored.gameId).catch(() => null);
      const title = game?.name ? `${game.name} timer` : 'Game timer';
      const body = elapsedMinutes > 0
        ? `You've been playing for ${elapsedMinutes} minute${elapsedMinutes === 1 ? '' : 's'}.`
        : `Game session started.`;

      const notification = new Notification({ title, body, silent: false });
      notification.show();
    } catch (err) {
      console.error('Error showing playtime notification:', err);
    }
  }

  playReminderSound() {
    try {
      // Prefer playing a bundled sound file if present
      const base = app.getAppPath();
      const candidates = [
        path.join(base, 'assets', 'sounds', 'reminder.mp3'),
        path.join(base, 'assets', 'sounds', 'reminder.ogg'),
        path.join(base, 'assets', 'sounds', 'reminder.wav'),
        path.join(base, 'assets', 'reminder.mp3'),
        path.join(base, 'assets', 'reminder.ogg'),
        path.join(base, 'assets', 'reminder.wav'),
      ];
      const soundPath = candidates.find(p => {
        try { return fs.existsSync(p); } catch (_) { return false; }
      });
      if (soundPath) {
        this.playSoundFile(soundPath);
        return;
      }

      // Windows: try system beep via PowerShell
      const platform = os.platform();
      if (platform === 'win32') {
        const { exec } = require('child_process');
        // Play a short 800Hz, 200ms beep using .NET Beep
        const cmd = 'powershell -NoProfile -Command "[console]::beep(800,200)"';
        exec(cmd, (err) => {
          if (err) {
            try { require('electron').app.beep(); } catch (_) {}
          }
        });
      } else {
        // Fallback beep on other platforms
        try { require('electron').app.beep(); } catch (_) {}
      }
    } catch (_) {
      try { require('electron').app.beep(); } catch (_) {}
    }
  }

  playSoundFile(absPath) {
    try {
      // Reuse a hidden window to play audio
      if (!this.audioWindow || this.audioWindow.isDestroyed()) {
        this.audioWindow = new BrowserWindow({
          width: 0,
          height: 0,
          show: false,
          frame: false,
          transparent: true,
          resizable: false,
          skipTaskbar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            autoplayPolicy: 'no-user-gesture-required',
          },
        });
        this.audioWindow.on('closed', () => { this.audioWindow = null; });
      }

      const audioUrl = 'local-file://' + absPath; // uses registered protocol
      const html = `<!doctype html><html><head><meta charset="utf-8" /><style>body{margin:0}</style></head><body>
        <audio src="${audioUrl}" autoplay></audio>
      </body></html>`;
      const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
      this.audioWindow.loadURL(dataUrl).catch(() => {});
    } catch (err) {
      try { require('electron').app.beep(); } catch (_) {}
    }
  }
}

module.exports = GameMonitorService;
