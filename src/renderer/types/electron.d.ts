import { Game, Tag, GameSession, GameStats, MonitoredGame } from './game';
import { ComprehensiveStats, MostPlayedGame, OverallStats } from '../services/statisticsApi';

export interface ElectronAPI {
  launchGame: (gamePath: string) => Promise<{ success: boolean; error?: string }>
  detectSteamGames: () => Promise<Game[]>
  importSteamGames: () => Promise<Game[]>
  selectGameFolder: () => Promise<string | null>
  openExternal: (url: string) => Promise<{ success: boolean; error?: string }>
  getConfig: () => Promise<any>
  setConfig: (config: any) => Promise<void>
  getSteamPath: () => Promise<string | null>
  setSteamPath: (steamPath: string) => Promise<{ success: boolean }>
  getGames: () => Promise<Game[]>
  addOrUpdateGame: (game: Game) => Promise<{ success: boolean }>
  getThumbnailPath: (appId: string) => Promise<string | null>
  getCoverImage: (appId: string) => Promise<string | null>
  onScanProgress: (callback: (event: any, data: { current: number; total: number; library: string; gamesFound: number }) => void) => void
  removeScanProgressListener: () => void
  // Tag-related APIs
  getTags: () => Promise<Tag[]>
  addTag: (tag: { name: string; color?: string; isDefault?: boolean }) => Promise<Tag>
  addTagsToGame: (gameId: string, tagNames: string[]) => Promise<{ success: boolean }>
  // Session-related APIs
  getGameStats: () => Promise<GameStats>
  getGameSessions: () => Promise<GameSession[]>
  getActiveSessions: () => Promise<GameSession[]>
  endGameSession: (sessionId: string) => Promise<{ success: boolean }>
  // Monitoring APIs
  getMonitoredGames: () => Promise<MonitoredGame[]>
  // Statistics APIs
  getComprehensiveStats: () => Promise<ComprehensiveStats>
  getMostPlayedGames7Days: () => Promise<MostPlayedGame[]>
  getOverallStats: () => Promise<OverallStats>
  getCurrentMonthPlaytime: () => Promise<number>
  getMostPlayedGame: () => Promise<MostPlayedGame | null>
  getRecentSessions: (limit?: number) => Promise<GameSession[]>
  getCompletedGamesCount: () => Promise<number>
  deleteSession: (id: string | number) => Promise<{ success: boolean }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
