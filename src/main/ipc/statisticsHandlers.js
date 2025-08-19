const { ipcMain } = require('electron');

function setupStatisticsHandlers(statisticsService) {
  // Get comprehensive statistics
  ipcMain.handle('get-comprehensive-stats', async () => {
    try {
      return await statisticsService.getComprehensiveStats();
    } catch (error) {
      console.error('Error getting comprehensive stats:', error);
      throw error;
    }
  });

  // Get most played games in last 7 days
  ipcMain.handle('get-most-played-games-7-days', async () => {
    try {
      return await statisticsService.getMostPlayedGamesLast7Days();
    } catch (error) {
      console.error('Error getting most played games:', error);
      throw error;
    }
  });

  // Get overall statistics
  ipcMain.handle('get-overall-stats', async () => {
    try {
      return await statisticsService.getOverallStats();
    } catch (error) {
      console.error('Error getting overall stats:', error);
      throw error;
    }
  });

  // Get current month playtime
  ipcMain.handle('get-current-month-playtime', async () => {
    try {
      return await statisticsService.getCurrentMonthPlaytime();
    } catch (error) {
      console.error('Error getting current month playtime:', error);
      throw error;
    }
  });

  // Get most played game
  ipcMain.handle('get-most-played-game', async () => {
    try {
      return await statisticsService.getMostPlayedGame();
    } catch (error) {
      console.error('Error getting most played game:', error);
      throw error;
    }
  });

  // Get recent sessions
  ipcMain.handle('get-recent-sessions', async (event, limit = 10) => {
    try {
      return await statisticsService.getRecentSessions(limit);
    } catch (error) {
      console.error('Error getting recent sessions:', error);
      throw error;
    }
  });

  // Get completed games count
  ipcMain.handle('get-completed-games-count', async () => {
    try {
      return await statisticsService.getGamesWithTag('complete');
    } catch (error) {
      console.error('Error getting completed games count:', error);
      throw error;
    }
  });
}

module.exports = { setupStatisticsHandlers };
