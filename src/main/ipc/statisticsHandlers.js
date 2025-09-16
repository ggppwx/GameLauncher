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

  // Get month playtime breakdown (per-day, per-game)
  ipcMain.handle('get-month-playtime-breakdown', async (event, year, month) => {
    try {
      return await statisticsService.getMonthPlaytimeBreakdown(year, month);
    } catch (error) {
      console.error('Error getting month playtime breakdown:', error);
      throw error;
    }
  });

  // Get this week's summary
  ipcMain.handle('get-this-week-summary', async () => {
    try {
      return await statisticsService.getThisWeekSummary();
    } catch (error) {
      console.error('Error getting this week summary:', error);
      throw error;
    }
  });

  // Get weekly playtime for last 8 weeks
  ipcMain.handle('get-weekly-playtime-last-8-weeks', async () => {
    try {
      return await statisticsService.getWeeklyPlaytimeLast8Weeks();
    } catch (error) {
      console.error('Error getting weekly playtime:', error);
      throw error;
    }
  });

  // Delete a session by id
  ipcMain.handle('delete-session', async (event, id) => {
    try {
      return await statisticsService.deleteSessionById(id);
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  });
}

module.exports = { setupStatisticsHandlers };
