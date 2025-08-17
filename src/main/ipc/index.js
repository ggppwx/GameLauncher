const { setupGameHandlers } = require('./gameHandlers');
const { setupTagHandlers } = require('./tagHandlers');
const { setupConfigHandlers } = require('./configHandlers');
const { setupSteamHandlers } = require('./steamHandlers');

function setupIPC(services) {
  const { gameService, tagService, configService } = services;
  
  // Setup all IPC handlers
  setupGameHandlers(gameService);
  setupTagHandlers(tagService);
  setupConfigHandlers(configService);
  setupSteamHandlers(configService);
  
  console.log('IPC handlers setup complete');
}

module.exports = { setupIPC };
