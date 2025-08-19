const { setupGameHandlers } = require('./gameHandlers');
const { setupTagHandlers } = require('./tagHandlers');
const { setupConfigHandlers } = require('./configHandlers');
const { setupSteamHandlers } = require('./steamHandlers');
const { setupStatisticsHandlers } = require('./statisticsHandlers');

function setupIPC(services) {
  const { gameService, tagService, configService, statisticsService } = services;
  
  // Setup all IPC handlers
  setupGameHandlers(gameService);
  setupTagHandlers(tagService);
  setupConfigHandlers(configService);
  setupSteamHandlers(configService);
  setupStatisticsHandlers(statisticsService);
  
  console.log('IPC handlers setup complete');
}

module.exports = { setupIPC };
