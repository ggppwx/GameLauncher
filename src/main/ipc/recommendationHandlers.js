const { ipcMain } = require('electron');

function setupRecommendationHandlers(recommendationService) {
  // Get smart recommendations
  ipcMain.handle('get-smart-recommendations', async (event, count = 3, diversityFactor = 0.05) => {
    try {
      const recommendations = await recommendationService.getRecommendations(count, diversityFactor);
      return recommendations;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      throw error;
    }
  });

  // Record game launch from recommendations
  ipcMain.handle('record-recommendation-launch', async (event, gameId) => {
    try {
      await recommendationService.recordLaunch(gameId);
    } catch (error) {
      console.error('Error recording recommendation launch:', error);
    }
  });

  console.log('✓ Recommendation IPC handlers registered');
}

module.exports = setupRecommendationHandlers;
