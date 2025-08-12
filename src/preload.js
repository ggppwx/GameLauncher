const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  detectSteamGames: () => ipcRenderer.invoke('detect-steam-games'),
  launchGame: (gamePath) => ipcRenderer.invoke('launch-game', gamePath),
  selectGameFolder: () => ipcRenderer.invoke('select-game-folder'),
});
