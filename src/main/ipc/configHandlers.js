const { ipcMain } = require('electron');

function setupConfigHandlers(configService) {
  // Get config
  ipcMain.handle('get-config', () => {
    return configService.getConfig();
  });

  // Set config
  ipcMain.handle('set-config', (event, config) => {
    return configService.setConfig(config);
  });

  // Update config
  ipcMain.handle('update-config', (event, updates) => {
    return configService.updateConfig(updates);
  });

  // Get Steam path
  ipcMain.handle('get-steam-path', () => {
    return configService.getSteamPath();
  });

  // Set Steam path
  ipcMain.handle('set-steam-path', (event, steamPath) => {
    return configService.setSteamPath(steamPath);
  });
}

module.exports = { setupConfigHandlers };
