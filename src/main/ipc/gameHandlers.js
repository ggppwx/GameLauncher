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


  // Import Steam games via Steam Web API
  ipcMain.handle('import-steam-games', async (event, rescan = true) => {
    try {
      const progressCallback = (data) => {
        event.sender.send('scan-progress', data);
      };
      return await gameService.importSteamGames(progressCallback, rescan);
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

  // Set override process for a game
  ipcMain.handle('set-override-process', (event, { gameId, overrideProcess }) => {
    return gameService.setOverrideProcess(gameId, overrideProcess);
  });

  // Get game notes
  ipcMain.handle('get-game-notes', (event, gameId) => {
    return gameService.getGameNotes(gameId);
  });

  // Update game notes
  ipcMain.handle('update-game-notes', (event, { gameId, notes }) => {
    return gameService.updateGameNotes(gameId, notes);
  });

  // Remove game
  ipcMain.handle('remove-game', (event, gameId) => {
    return gameService.removeGame(gameId);
  });

  // Retrieve missing data for a game
  ipcMain.handle('retrieve-missing-data', (event, gameId) => {
    return gameService.retrieveMissingData(gameId);
  });

  // Refresh all missing data for installed games
  ipcMain.handle('refresh-all-missing-data', async (event) => {
    try {
      return await gameService.refreshAllMissingData();
    } catch (error) {
      console.error('Error in refresh-all-missing-data handler:', error);
      throw error;
    }
  });
}

module.exports = { setupGameHandlers };
