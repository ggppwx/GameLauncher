const { ipcMain } = require('electron');

function setupGameHandlers(gameService) {
  // Get all games
  ipcMain.handle('get-games', () => {
    return gameService.getAllGames();
  });

  // Add or update game
  ipcMain.handle('add-or-update-game', (event, game) => {
    return gameService.addOrUpdateGame(game);
  });

  // Detect Steam games
  ipcMain.handle('detect-steam-games', async (event) => {
    try {
      const progressCallback = (data) => {
        event.sender.send('scan-progress', data);
      };
      
      return await gameService.detectSteamGames(progressCallback);
    } catch (error) {
      console.error('Error in detect-steam-games handler:', error);
      throw error;
    }
  });

  // Import Steam games via Steam Web API
  ipcMain.handle('import-steam-games', async (event) => {
    try {
      const progressCallback = (data) => {
        event.sender.send('scan-progress', data);
      };
      return await gameService.importSteamGames(progressCallback);
    } catch (error) {
      console.error('Error in import-steam-games handler:', error);
      throw error;
    }
  });

  // Launch game
  ipcMain.handle('launch-game', (event, gameData) => {
    return gameService.launchGame(gameData);
  });

  // Get monitored games
  ipcMain.handle('get-monitored-games', () => {
    return gameService.gameMonitorService.getMonitoredGames();
  });

  // Get thumbnail path
  ipcMain.handle('get-thumbnail-path', (event, appId) => {
    return gameService.getThumbnailPath(appId);
  });

  // Get cover image
  ipcMain.handle('get-cover-image', (event, appId) => {
    return gameService.getCoverImage(appId);
  });

  // Add tags to game
  ipcMain.handle('add-tags-to-game', (event, { gameId, tagNames }) => {
    return gameService.updateGameTags(gameId, tagNames);
  });
}

module.exports = { setupGameHandlers };
