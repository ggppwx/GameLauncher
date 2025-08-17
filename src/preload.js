const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  launchGame: (gamePath) => ipcRenderer.invoke('launch-game', gamePath),
  detectSteamGames: () => ipcRenderer.invoke('detect-steam-games'),
  selectGameFolder: () => ipcRenderer.invoke('select-game-folder'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (config) => ipcRenderer.invoke('set-config', config),
  getSteamPath: () => ipcRenderer.invoke('get-steam-path'),
  setSteamPath: (steamPath) => ipcRenderer.invoke('set-steam-path', steamPath),
  getGames: () => ipcRenderer.invoke('get-games'),
  addOrUpdateGame: (game) => ipcRenderer.invoke('add-or-update-game', game),
  getThumbnailPath: (appId) => ipcRenderer.invoke('get-thumbnail-path', appId),
  getCoverImage: (appId) => ipcRenderer.invoke('get-cover-image', appId),
  onScanProgress: (callback) => ipcRenderer.on('scan-progress', callback),
  removeScanProgressListener: () => ipcRenderer.removeAllListeners('scan-progress'),
  // Tag-related APIs
  getTags: () => ipcRenderer.invoke('get-tags'),
  addTag: (tag) => ipcRenderer.invoke('add-tag', tag),
  addTagsToGame: (gameId, tagNames) => ipcRenderer.invoke('add-tags-to-game', { gameId, tagNames }),
});
