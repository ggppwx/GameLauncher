const { ipcMain, shell } = require('electron');
const path = require('path');

function setupSteamHandlers(configService) {
  // Open external URL (for Steam URLs)
  ipcMain.handle('open-external', async (event, url) => {
    try {
      console.log('Opening external URL:', url);
      
      // Special handling for Steam URLs
      if (url.startsWith('steam://')) {
        console.log('Detected Steam URL, attempting to launch...');
        
        // Extract appid from URL (supports both steam://rungameid/ and steam://run/)
        const appIdMatch = url.match(/steam:\/\/(?:rungameid|run)\/(\d+)/);
        if (appIdMatch) {
          const appId = appIdMatch[1];
          console.log('Extracted appid:', appId);
          
          // Try to launch Steam directly with appid
          try {
            const { spawn } = require('child_process');
            const config = await configService.getConfig();
            const steamPath = config.steamPath;
            
            if (steamPath) {
              const steamExe = path.join(steamPath, 'Steam.exe');
              console.log('Trying to launch Steam directly:', steamExe, 'with appid:', appId);
              
              spawn(steamExe, [`-applaunch`, appId], { 
                detached: true,
                stdio: 'ignore'
              });
              
              console.log('Successfully launched Steam with appid:', appId);
              return { success: true };
            }
          } catch (steamError) {
            console.log('Failed to launch Steam directly:', steamError.message);
          }
        }
        
        // Try different Steam URI formats as fallback
        const steamUrls = [
          url,
          url.replace('steam://run/', 'steam://rungameid/'),
          url.replace('steam://rungameid/', 'steam://run/')
        ];
        
        for (const steamUrl of steamUrls) {
          try {
            console.log('Trying Steam URL:', steamUrl);
            await shell.openExternal(steamUrl);
            console.log('Successfully opened Steam URL:', steamUrl);
            return { success: true };
          } catch (steamError) {
            console.log('Failed to open Steam URL:', steamUrl, steamError.message);
            continue;
          }
        }
        
        // If all Steam URLs failed, throw error
        throw new Error('All Steam URL formats failed');
      }
      
      // Regular external URL handling
      await shell.openExternal(url);
      console.log('Successfully opened external URL:', url);
      return { success: true };
    } catch (error) {
      console.error('Error opening external URL:', url, error);
      return { success: false, error: error.message };
    }
  });

  // Select game folder
  ipcMain.handle('select-game-folder', async (event) => {
    const dialog = require('electron').dialog;
    const mainWindow = require('electron').BrowserWindow.getAllWindows()[0];
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Game Folder'
    });
    if (!result.canceled) {
      return result.filePaths[0];
    }
    return null;
  });
}

module.exports = { setupSteamHandlers };
