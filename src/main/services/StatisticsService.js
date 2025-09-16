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

  // Get this week's summary: total playtime and number of games played (>= 15 min sessions)
  async getThisWeekSummary() {
    return new Promise((resolve, reject) => {
      try {
        const now = new Date();
        // Compute start of ISO week (Monday) at 00:00:00 UTC
        const day = now.getUTCDay(); // 0=Sun,1=Mon,...
        const diffToMonday = (day === 0 ? 6 : day - 1); // days since Monday
        const startOfWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMonday, 0, 0, 0, 0));
        const startISO = startOfWeek.toISOString();

        // Total playtime since start of week
        this.db.get(
          `SELECT COALESCE(SUM(game_time), 0) as total_playtime
           FROM game_sessions
           WHERE start_time >= ? AND end_time IS NOT NULL AND game_time IS NOT NULL`,
          [startISO],
          (err, row) => {
            if (err) {
              reject(err);
              return;
            }

            const totalPlaytime = row ? (row.total_playtime || 0) : 0;

            // Number of distinct games with at least one session >= 15 minutes this week
            this.db.get(
              `SELECT COALESCE(COUNT(DISTINCT game_id), 0) as games_played
               FROM game_sessions
               WHERE start_time >= ? AND end_time IS NOT NULL AND game_time >= ?`,
              [startISO, 15 * 60],
              (err2, row2) => {
                if (err2) {
                  reject(err2);
                  return;
                }
                resolve({ totalPlaytime, gamesPlayed: row2 ? (row2.games_played || 0) : 0 });
              }
            );
          }
        );
      } catch (e) {
        reject(e);
      }
    });
  }

  // Get weekly playtime totals for the last 8 weeks (including current week)
  async getWeeklyPlaytimeLast8Weeks() {
    return new Promise((resolve, reject) => {
      try {
        const now = new Date();
        // Start of current ISO week (Monday) UTC
        const day = now.getUTCDay();
        const diffToMonday = (day === 0 ? 6 : day - 1);
        const startOfThisWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMonday, 0, 0, 0, 0));
        // Start boundary 7 weeks before this week's start (total 8 weeks)
        const startBoundary = new Date(startOfThisWeek);
        startBoundary.setUTCDate(startBoundary.getUTCDate() - 7 * 7);
        const startISO = startBoundary.toISOString();

        // Pull sessions since boundary, aggregate in JS by week start (Monday UTC)
        this.db.all(
          `SELECT start_time AS startTime, game_time AS gameTime
           FROM game_sessions
           WHERE start_time >= ? AND end_time IS NOT NULL AND game_time IS NOT NULL
           ORDER BY start_time ASC`,
          [startISO],
          (err, rows) => {
            if (err) {
              reject(err);
              return;
            }

            // Build an ordered list of week starts for 8 weeks
            const weeks = [];
            for (let i = 7; i >= 0; i--) {
              const d = new Date(startOfThisWeek);
              d.setUTCDate(d.getUTCDate() - i * 7);
              weeks.push(new Date(d));
            }
            const keyFor = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
            const totalsByWeekKey = new Map();
            weeks.forEach((w) => totalsByWeekKey.set(keyFor(w), 0));

            for (const row of (rows || [])) {
              const start = new Date(row.startTime);
              // Compute Monday UTC for this session's week
              const wd = start.getUTCDay();
              const delta = (wd === 0 ? 6 : wd - 1);
              const monday = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() - delta, 0, 0, 0, 0));
              const k = keyFor(monday);
              if (totalsByWeekKey.has(k)) {
                const prev = totalsByWeekKey.get(k) || 0;
                totalsByWeekKey.set(k, prev + (row.gameTime || 0));
              }
            }

            const result = weeks.map((w) => ({ weekStart: keyFor(w), totalPlaytime: totalsByWeekKey.get(keyFor(w)) || 0 }));
            resolve(result);
          }
        );
      } catch (e) {
        reject(e);
      }
    });
  }

  // Get per-day, per-game playtime breakdown for a given month
  async getMonthPlaytimeBreakdown(year, month /* 1-12 */) {
    return new Promise((resolve, reject) => {
      try {
        const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
        const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

        const startISO = start.toISOString();
        const endISO = end.toISOString();

        // Aggregate by start date (UTC) within the month
        this.db.all(
          `SELECT 
             DATE(start_time) as day,
             game_id AS gameId,
             game_name AS gameName,
             SUM(game_time) AS seconds
           FROM game_sessions
           WHERE start_time >= ? AND start_time < ? AND end_time IS NOT NULL AND game_time IS NOT NULL
           GROUP BY day, game_id, game_name
           ORDER BY day ASC, seconds DESC`,
          [startISO, endISO],
          (err, rows) => {
            if (err) {
              reject(err);
              return;
            }

            // Build map day -> games[] and compute totals
            const dayMap = new Map();
            for (const row of rows || []) {
              const dayKey = row.day; // YYYY-MM-DD
              if (!dayMap.has(dayKey)) dayMap.set(dayKey, []);
              dayMap.get(dayKey).push({ gameId: row.gameId, gameName: row.gameName, seconds: row.seconds || 0 });
            }

            const days = [];
            // Iterate all days in the month to include empty days
            for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
              const yyyy = d.getUTCFullYear();
              const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
              const dd = String(d.getUTCDate()).padStart(2, '0');
              const dateStr = `${yyyy}-${mm}-${dd}`;
              const games = dayMap.get(dateStr) || [];
              const total = games.reduce((sum, g) => sum + (g.seconds || 0), 0);
              days.push({ date: dateStr, total, games });
            }

            resolve({ year, month, days });
          }
        );
      } catch (e) {
        reject(e);
      }
    });
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
