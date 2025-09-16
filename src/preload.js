const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  launchGame: (gamePath) => ipcRenderer.invoke('launch-game', gamePath),
  detectSteamGames: () => ipcRenderer.invoke('detect-steam-games'),
  importSteamGames: (rescan = true) => ipcRenderer.invoke('import-steam-games', rescan),
  selectGameFolder: () => ipcRenderer.invoke('select-game-folder'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getConfig: () => ipcRenderer.invoke('get-config'),
  // Statistics API
  getComprehensiveStats: () => ipcRenderer.invoke('get-comprehensive-stats'),
  getMostPlayedGames7Days: () => ipcRenderer.invoke('get-most-played-games-7-days'),
  getOverallStats: () => ipcRenderer.invoke('get-overall-stats'),
  getCurrentMonthPlaytime: () => ipcRenderer.invoke('get-current-month-playtime'),
  getMostPlayedGame: () => ipcRenderer.invoke('get-most-played-game'),
  getRecentSessions: (limit) => ipcRenderer.invoke('get-recent-sessions', limit),
  getCompletedGamesCount: () => ipcRenderer.invoke('get-completed-games-count'),
  deleteSession: (id) => ipcRenderer.invoke('delete-session', id),
  getMonthPlaytimeBreakdown: (year, month) => ipcRenderer.invoke('get-month-playtime-breakdown', year, month),
  getThisWeekSummary: () => ipcRenderer.invoke('get-this-week-summary'),
  getWeeklyPlaytimeLast8Weeks: () => ipcRenderer.invoke('get-weekly-playtime-last-8-weeks'),
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
  setOverrideProcess: (data) => ipcRenderer.invoke('set-override-process', data),
  // Session-related APIs
  getGameStats: () => ipcRenderer.invoke('get-game-stats'),
  getGameSessions: () => ipcRenderer.invoke('get-game-sessions'),
  getActiveSessions: () => ipcRenderer.invoke('get-active-sessions'),
  endGameSession: (sessionId) => ipcRenderer.invoke('end-game-session', sessionId),
  // Monitoring APIs
  getMonitoredGames: () => ipcRenderer.invoke('get-monitored-games'),
});
