class StatisticsService {
  constructor(db) {
    this.db = db;
  }

  // Get overall statistics
  async getOverallStats() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          COUNT(DISTINCT g.id) as total_games,
          COUNT(DISTINCT gs.game_id) as games_played,
          COUNT(gs.id) as total_sessions,
          SUM(gs.game_time) as total_playtime,
          AVG(gs.game_time) as avg_session_time
        FROM games g
        LEFT JOIN game_sessions gs ON g.id = gs.game_id AND gs.end_time IS NOT NULL
      `, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const stats = rows[0] || {
            total_games: 0,
            games_played: 0,
            total_sessions: 0,
            total_playtime: 0,
            avg_session_time: 0
          };
          resolve(stats);
        }
      });
    });
  }

  // Get most played games in the last 7 days
  async getMostPlayedGamesLast7Days() {
    return new Promise((resolve, reject) => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoISO = sevenDaysAgo.toISOString();

      this.db.all(`
        SELECT 
          gs.game_id AS gameId,
          gs.game_name AS gameName,
          SUM(gs.game_time) AS totalPlaytime,
          COUNT(gs.id) AS sessionCount
        FROM game_sessions gs
        WHERE gs.start_time >= ? AND gs.end_time IS NOT NULL
        GROUP BY gs.game_id, gs.game_name
        ORDER BY totalPlaytime DESC
        LIMIT 10
      `, [sevenDaysAgoISO], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  // Get playtime for current month
  async getCurrentMonthPlaytime() {
    return new Promise((resolve, reject) => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startOfMonthISO = startOfMonth.toISOString();

      this.db.get(`
        SELECT SUM(game_time) as total_playtime
        FROM game_sessions
        WHERE start_time >= ? AND end_time IS NOT NULL
      `, [startOfMonthISO], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? row.total_playtime : 0);
        }
      });
    });
  }

  // Get most played game overall
  async getMostPlayedGame() {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT 
          gs.game_id AS gameId,
          gs.game_name AS gameName,
          SUM(gs.game_time) AS totalPlaytime
        FROM game_sessions gs
        WHERE gs.end_time IS NOT NULL
        GROUP BY gs.game_id, gs.game_name
        ORDER BY totalPlaytime DESC
        LIMIT 1
      `, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  // Get recent sessions (last 10)
  async getRecentSessions(limit = 10) {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          gs.id,
          gs.game_id AS gameId,
          gs.game_name AS gameName,
          gs.start_time AS startTime,
          gs.end_time AS endTime,
          gs.game_time AS gameTime
        FROM game_sessions gs
        WHERE gs.end_time IS NOT NULL
        ORDER BY gs.start_time DESC
        LIMIT ?
      `, [limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  // Get games with tags (for completed games count)
  async getGamesWithTag(tagName) {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT COUNT(*) as count
        FROM games
        WHERE tags LIKE ?
      `, [`%${tagName}%`], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows[0] ? rows[0].count : 0);
        }
      });
    });
  }

  // Format playtime for display
  formatPlaytime(seconds) {
    if (!seconds) return '0h 0m';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Get comprehensive statistics
  async getComprehensiveStats() {
    try {
      const [
        overallStats,
        mostPlayedGames,
        currentMonthPlaytime,
        mostPlayedGame,
        recentSessions,
        completedGames
      ] = await Promise.all([
        this.getOverallStats(),
        this.getMostPlayedGamesLast7Days(),
        this.getCurrentMonthPlaytime(),
        this.getMostPlayedGame(),
        this.getRecentSessions(),
        this.getGamesWithTag('complete')
      ]);

      return {
        overall: overallStats,
        mostPlayedGames,
        currentMonthPlaytime,
        mostPlayedGame,
        recentSessions,
        completedGames
      };
    } catch (error) {
      console.error('Error getting comprehensive stats:', error);
      throw error;
    }
  }

  // Delete a session by its database id
  async deleteSessionById(id) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `DELETE FROM game_sessions WHERE id = ?`,
        [id],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve({ success: true });
          }
        }
      );
    });
  }
}

module.exports = StatisticsService;
