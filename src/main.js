const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');

let mainWindow;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    title: 'Game Launcher',
    show: true,
    titleBarStyle: 'default',
    center: true
  });

  // Load the React app
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    // Try different ports in case 3000 is busy
    const ports = [3000, 3001, 3002, 3003];
    let loaded = false;
    
    for (const port of ports) {
      try {
        await mainWindow.loadURL(`http://localhost:${port}`);
        loaded = true;
        console.log(`Loaded from http://localhost:${port}`);
        break;
      } catch (error) {
        console.log(`Failed to load from port ${port}:`, error.message);
      }
    }
    
    if (!loaded) {
      console.error('Failed to load from any development port');
    }
    
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Window is already shown, but we can focus it
  mainWindow.once('ready-to-show', () => {
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => createWindow());

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for game detection and launching
ipcMain.handle('detect-steam-games', async () => {
  try {
    const steamPaths = getSteamPaths();
    const games = [];
    
    for (const steamPath of steamPaths) {
      const libraryFoldersPath = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');
      
      if (await fs.pathExists(libraryFoldersPath)) {
        const libraryFolders = await parseLibraryFolders(libraryFoldersPath);
        
        for (const libraryPath of libraryFolders) {
          const appsPath = path.join(libraryPath, 'steamapps');
          
          if (await fs.pathExists(appsPath)) {
            const appFiles = await fs.readdir(appsPath);
            
            for (const file of appFiles) {
              if (file.endsWith('.acf')) {
                const appInfo = await parseAppManifest(path.join(appsPath, file));
                if (appInfo) {
                  games.push(appInfo);
                }
              }
            }
          }
        }
      }
    }
    
    return games;
  } catch (error) {
    console.error('Error detecting Steam games:', error);
    return [];
  }
});

ipcMain.handle('launch-game', async (event, gamePath) => {
  try {
    const { spawn } = require('child_process');
    spawn(gamePath, [], { detached: true });
    return { success: true };
  } catch (error) {
    console.error('Error launching game:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('select-game-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Game Folder'
  });
  
  if (!result.canceled) {
    return result.filePaths[0];
  }
  return null;
});

// Helper functions
function getSteamPaths() {
  const paths = [];
  
  if (process.platform === 'win32') {
    // Windows Steam paths
    const programFiles = process.env['ProgramFiles(x86)'] || process.env['ProgramFiles'];
    if (programFiles) {
      paths.push(path.join(programFiles, 'Steam'));
    }
  } else if (process.platform === 'darwin') {
    // macOS Steam path
    paths.push(path.join(process.env.HOME, 'Library', 'Application Support', 'Steam'));
  } else {
    // Linux Steam path
    paths.push(path.join(process.env.HOME, '.steam', 'steam'));
  }
  
  return paths;
}

async function parseLibraryFolders(libraryFoldersPath) {
  try {
    const content = await fs.readFile(libraryFoldersPath, 'utf8');
    const paths = [];
    
    // Simple parsing of libraryfolders.vdf
    const pathMatches = content.match(/"path"\s+"([^"]+)"/g);
    if (pathMatches) {
      for (const match of pathMatches) {
        const pathMatch = match.match(/"path"\s+"([^"]+)"/);
        if (pathMatch) {
          paths.push(pathMatch[1]);
        }
      }
    }
    
    return paths;
  } catch (error) {
    console.error('Error parsing library folders:', error);
    return [];
  }
}

async function parseAppManifest(acfPath) {
  try {
    const content = await fs.readFile(acfPath, 'utf8');
    
    // Extract app info from .acf file
    const appIdMatch = content.match(/"appid"\s+"(\d+)"/);
    const nameMatch = content.match(/"name"\s+"([^"]+)"/);
    const installDirMatch = content.match(/"installdir"\s+"([^"]+)"/);
    
    if (appIdMatch && nameMatch && installDirMatch) {
      const appId = appIdMatch[1];
      const name = nameMatch[1];
      const installDir = installDirMatch[1];
      
      // Find the executable
      const gamePath = path.dirname(acfPath);
      const gameDir = path.join(gamePath, 'common', installDir);
      
      if (await fs.pathExists(gameDir)) {
        const exeFiles = await findExecutables(gameDir);
        
        return {
          id: appId,
          name: name,
          path: gameDir,
          executable: exeFiles[0] || null,
          type: 'steam'
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing app manifest:', error);
    return null;
  }
}

async function findExecutables(dir) {
  try {
    const files = await fs.readdir(dir);
    const exeFiles = [];
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isFile()) {
        const ext = path.extname(file).toLowerCase();
        if (ext === '.exe' || ext === '.app' || ext === '') {
          exeFiles.push(filePath);
        }
      } else if (stat.isDirectory()) {
        // Recursively search subdirectories
        const subExeFiles = await findExecutables(filePath);
        exeFiles.push(...subExeFiles);
      }
    }
    
    return exeFiles;
  } catch (error) {
    console.error('Error finding executables:', error);
    return [];
  }
}
