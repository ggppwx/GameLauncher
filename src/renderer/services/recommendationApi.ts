import { Game } from '../types/game';

export interface RecommendationWithScore {
  game: Game;
  hybridScore: number;
  expectedReward: number;
}

export class RecommendationApi {
  /**
   * Get smart recommendations using LinUCB bandit algorithm
   */
  async getSmartRecommendations(count: number = 3, diversityFactor: number = 0.05): Promise<RecommendationWithScore[]> {
    try {
      console.log('RecommendationApi: calling getSmartRecommendations with count=', count, 'diversityFactor=', diversityFactor);
      const recommendations = await window.electronAPI.getSmartRecommendations(count, diversityFactor);
      console.log('RecommendationApi: received recommendations:', recommendations);
      return recommendations;
    } catch (error) {
      console.error('Error getting smart recommendations:', error);
      return [];
    }
  }

  /**
   * Record when a game is launched from recommendations
   */
  async recordLaunch(gameId: string): Promise<void> {
    try {
      await window.electronAPI.recordRecommendationLaunch(gameId);
    } catch (error) {
      console.error('Error recording recommendation launch:', error);
    }
  }
}

export const recommendationApi = new RecommendationApi();
