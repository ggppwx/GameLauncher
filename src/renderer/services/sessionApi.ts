import { apiClient } from './api';
import { GameStats, GameSession } from '../types/game';

export class SessionApi {
  // Get game statistics
  async getGameStats(gameId: string): Promise<GameStats> {
    return apiClient.invoke<GameStats>('getGameStats', gameId);
  }

  // Get game sessions
  async getGameSessions(gameId: string, limit: number = 10): Promise<GameSession[]> {
    return apiClient.invoke<GameSession[]>('getGameSessions', gameId, limit);
  }

  // Get active sessions
  async getActiveSessions(): Promise<GameSession[]> {
    return apiClient.invoke<GameSession[]>('getActiveSessions');
  }

  // End game session
  async endGameSession(gameId: string): Promise<{ success: boolean; sessionInfo?: any }> {
    return apiClient.invoke<{ success: boolean; sessionInfo?: any }>('endGameSession', gameId);
  }

  // Format playtime for display
  formatPlaytime(seconds: number): string {
    if (!seconds) return '0h 0m';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Format date for display
  formatDate(dateString: string): string {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 168) { // 7 days
      const days = Math.floor(diffInHours / 24);
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
}

// Singleton instance
export const sessionApi = new SessionApi();
