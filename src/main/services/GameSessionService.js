const crypto = require('crypto');

class GameSessionService {
  constructor(db) {
    this.db = db;
    this.activeSessions = new Map(); // Track active sessions in memory
  }

  // Start a new game session
  async startGameSession(gameId) {
    const sessionId = crypto.randomUUID();
    const startTime = new Date().toISOString();
    
    // Get game name from database
    const game = await this.getGameById(gameId);
    if (!game) {
      throw new Error(`Game with ID ${gameId} not found`);
    }
    
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO game_sessions (id, game_id, game_name, session_id, start_time) 
         VALUES (?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), gameId, game.name, sessionId, startTime],
        function(err) {
          if (err) {
            reject(err);
          } else {
            // Store in memory for quick access
            this.activeSessions.set(gameId, {
              sessionId,
              startTime,
              gameName: game.name
            });
            resolve(sessionId);
          }
        }.bind(this)
      );
    });
  }

  // End a game session
  async endGameSession(sessionId) {
    const endTime = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE game_sessions 
         SET end_time = ? 
         WHERE session_id = ?`,
        [endTime, sessionId],
        (err) => {
          if (err) {
            reject(err);
          } else {
            // Get the updated session data
            this.db.get(
              `SELECT * FROM game_sessions WHERE session_id = ?`,
              [sessionId],
              (err, row) => {
                if (err) {
                  reject(err);
                } else if (row) {
                  // Calculate game time
                  const startTime = new Date(row.start_time);
                  const endTime = new Date(row.end_time);
                  const gameTime = Math.floor((endTime - startTime) / 1000); // Time in seconds
                  
                  if (gameTime < 300) {
                    // delete the session 
                    this.db.run(
                      `DELETE FROM game_sessions WHERE session_id = ?`,
                      [sessionId],
                      (err) => {
                        if (err) {
                          reject(err);
                        } else {
                          resolve({ 
                            sessionId: row.session_id,
                            startTime: row.start_time,
                            endTime: row.end_time,
                            gameTime
                          });
                        }
                      }
                    );
                    return;
                  }


                  // Update with calculated game time
                  this.db.run(
                    `UPDATE game_sessions SET game_time = ? WHERE session_id = ?`,
                    [gameTime, sessionId],
                    (err) => {
                      if (err) {
                        reject(err);
                      } else {
                        // Remove from memory if it exists
                        for (const [gameId, session] of this.activeSessions.entries()) {
                          if (session.sessionId === sessionId) {
                            this.activeSessions.delete(gameId);
                            break;
                          }
                        }
                        resolve({ 
                          sessionId: row.session_id,
                          startTime: row.start_time,
                          endTime: row.end_time,
                          gameTime
                        });
                      }
                    }
                  );
                } else {
                  reject(new Error('Session not found'));
                }
              }
            );
          }
        }
      );
    });
  }

  // Get game by ID
  async getGameById(gameId) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM games WHERE id = ?', [gameId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // Get game statistics
  async getGameStats(gameId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT 
           COUNT(*) as total_sessions,
           SUM(game_time) as total_playtime,
           AVG(game_time) as avg_session_time,
           MAX(start_time) as last_played,
           MIN(start_time) as first_played
         FROM game_sessions 
         WHERE game_id = ? AND end_time IS NOT NULL`,
        [gameId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            const stats = rows[0] || {
              total_sessions: 0,
              total_playtime: 0,
              avg_session_time: 0,
              last_played: null,
              first_played: null
            };
            resolve(stats);
          }
        }
      );
    });
  }

  // Get recent game sessions
  async getGameSessions(gameId, limit = 10) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM game_sessions 
         WHERE game_id = ? 
         ORDER BY start_time DESC 
         LIMIT ?`,
        [gameId, limit],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  // Get all active sessions
  async getActiveSessions() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM game_sessions WHERE end_time IS NULL`,
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  // Check if a game is currently running
  isGameRunning(gameId) {
    return this.activeSessions.has(gameId);
  }

  // Get session info for a running game
  getActiveSessionInfo(gameId) {
    return this.activeSessions.get(gameId);
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
}

module.exports = GameSessionService;
