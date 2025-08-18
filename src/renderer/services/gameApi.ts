import { apiClient } from './api';
import { Game } from '../types/game';

export interface ScanProgress {
  current: number;
  total: number;
  library: string;
  gamesFound: number;
}

export interface LaunchResult {
  success: boolean;
  error?: string;
}

export class GameApi {
  // Get all games
  async getGames(): Promise<Game[]> {
    return apiClient.invoke<Game[]>('getGames');
  }

  // Add or update a game
  async addOrUpdateGame(game: Game): Promise<{ success: boolean }> {
    return apiClient.invoke<{ success: boolean }>('addOrUpdateGame', game);
  }

  // Detect Steam games
  async detectSteamGames(): Promise<Game[]> {
    return apiClient.invoke<Game[]>('detectSteamGames');
  }

  // Launch a game
  async launchGame(gameData: { gameId: string; gamePath: string }): Promise<LaunchResult> {
    return apiClient.invoke<LaunchResult>('launchGame', gameData);
  }

  // Get thumbnail path
  async getThumbnailPath(appId: string): Promise<string | null> {
    return apiClient.invoke<string | null>('getThumbnailPath', appId);
  }

  // Get cover image
  async getCoverImage(appId: string): Promise<string | null> {
    return apiClient.invoke<string | null>('getCoverImage', appId);
  }

  // Add tags to a game
  async addTagsToGame(gameId: string, tagNames: string[]): Promise<{ success: boolean }> {
    return apiClient.invoke<{ success: boolean }>('addTagsToGame', gameId, tagNames);
  }

  // Listen to scan progress
  onScanProgress(callback: (progress: ScanProgress) => void): void {
    apiClient.onScanProgress((event, data) => callback(data));
  }

  // Remove scan progress listener
  removeScanProgressListener(): void {
    apiClient.removeScanProgressListener();
  }
}

// Singleton instance
export const gameApi = new GameApi();
