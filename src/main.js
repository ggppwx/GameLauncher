const { app, BrowserWindow, ipcMain, shell, protocol } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const sqlite3 = require('sqlite3').verbose();

// Import services
const { setupDB, getDB } = require('./main/db');
const ConfigService = require('./main/services/ConfigService');
const GameService = require('./main/services/GameService');
const TagService = require('./main/services/TagService');
const GameSessionService = require('./main/services/GameSessionService');
const GameMonitorService = require('./main/services/GameMonitorService');
const StatisticsService = require('./main/services/StatisticsService');

// Import IPC setup
const { setupIPC } = require('./main/ipc');

// Global service variables
let gameMonitorService = null;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    const indexHtmlPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexHtmlPath);
  }

  return mainWindow;
}

app.whenReady().then(() => {
  // Register custom protocol for serving local files
  protocol.registerFileProtocol('local-file', (request, callback) => {
    const filePath = request.url.replace('local-file://', '');
    callback({ path: filePath });
  });

  // Setup database
  setupDB();
  const db = getDB();
  
  // Initialize services
  const configService = new ConfigService();
  const gameSessionService = new GameSessionService(db);
  gameMonitorService = new GameMonitorService(db, gameSessionService);
  const gameService = new GameService(db, configService, gameSessionService, gameMonitorService);
  const tagService = new TagService(db);
  const statisticsService = new StatisticsService(db);
  
  // Setup IPC handlers with services
  setupIPC({ gameService, tagService, configService, statisticsService });
  
  // Create window
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  // Cleanup monitoring service
  try {
    if (gameMonitorService) {
      await gameMonitorService.cleanup();
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
