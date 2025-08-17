export interface ElectronAPI {
  launchGame: (gamePath: string) => Promise<{ success: boolean; error?: string }>
  detectSteamGames: () => Promise<Game[]>
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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
