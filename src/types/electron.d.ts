export interface ElectronAPI {
  detectSteamGames: () => Promise<any[]>;
  launchGame: (gamePath: string) => Promise<{ success: boolean; error?: string }>;
  selectGameFolder: () => Promise<string | null>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
