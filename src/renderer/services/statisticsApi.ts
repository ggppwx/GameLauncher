import { apiClient } from './api';

export interface GameStats {
  totalGames: number;
  totalPlaytime: number;
  totalSessions: number;
  averageSessionLength: number;
  mostPlayedGame?: string;
  recentSessions: GameSession[];
}

export interface GameSession {
  id: string;
  gameId: string;
  gameName: string;
  startTime: string;
  endTime?: string | null;
  gameTime?: number | null;
}

export interface MostPlayedGame {
  gameId: string;
  gameName: string;
  totalPlaytime: number;
  sessionCount: number;
}

export interface OverallStats {
  total_games: number;
  games_played: number;
  total_sessions: number;
  total_playtime: number;
  avg_session_time: number;
}

export interface ComprehensiveStats {
  overall: OverallStats;
  mostPlayedGames: MostPlayedGame[];
  currentMonthPlaytime: number;
  mostPlayedGame: MostPlayedGame | null;
  recentSessions: GameSession[];
  completedGames: number;
}

export class StatisticsApi {
  // Get comprehensive statistics
  async getComprehensiveStats(): Promise<ComprehensiveStats> {
    return apiClient.invoke<ComprehensiveStats>('getComprehensiveStats');
  }

  // Delete a session by database id
  async deleteSession(id: string | number): Promise<{ success: boolean }> {
    return apiClient.invoke<{ success: boolean }>('deleteSession', id);
  }

  // Get most played games in last 7 days
  async getMostPlayedGames7Days(): Promise<MostPlayedGame[]> {
    return apiClient.invoke<MostPlayedGame[]>('getMostPlayedGames7Days');
  }

  // Get overall statistics
  async getOverallStats(): Promise<OverallStats> {
    return apiClient.invoke<OverallStats>('getOverallStats');
  }

  // Get current month playtime
  async getCurrentMonthPlaytime(): Promise<number> {
    return apiClient.invoke<number>('getCurrentMonthPlaytime');
  }

  // Get most played game
  async getMostPlayedGame(): Promise<MostPlayedGame | null> {
    return apiClient.invoke<MostPlayedGame | null>('getMostPlayedGame');
  }

  // Get recent sessions
  async getRecentSessions(limit: number = 10): Promise<GameSession[]> {
    return apiClient.invoke<GameSession[]>('getRecentSessions', limit);
  }

  // Get completed games count
  async getCompletedGamesCount(): Promise<number> {
    return apiClient.invoke<number>('getCompletedGamesCount');
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
export const statisticsApi = new StatisticsApi();
