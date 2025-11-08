const LinUCB = require('./linucb');

/**
 * Smart recommendation service using LinUCB bandit algorithm
 */
class RecommendationService {
  constructor(db) {
    this.db = db;
    // Context dimension: [isWeekend, isMorning, isAfternoon, isNight, hoursSinceLastSession, 
    //                     ...genre features, ...tag features, 
    //                     ...playtime buckets (5), ...recency buckets (5)]
    // We'll have base context (5 features) + dynamic genre features + dynamic tag features + bucketed game features
    // Playtime buckets: [0-5h, 5-20h, 20-50h, 50-100h, 100+h]
    // Recency buckets: [0-3d, 4-14d, 15-60d, 61-180d, 181+d]
    this.baseContextDim = 5;
    this.playtimeBuckets = 5;
    this.recencyBuckets = 5;
    this.gameFeatureDim = this.playtimeBuckets + this.recencyBuckets; // 10 binary features
    this.linucb = null;
    this.genreList = [];
    this.tagList = [];
    this.alpha = 0.5; // Exploration parameter
    this.recentlyShownGames = new Set(); // Track recently shown games
  }

  /**
   * Initialize the LinUCB model
   */
  async initialize() {
    // Get all unique genres and tags from database
    await this.updateGenreList();
    await this.updateTagList();
    const contextDim = this.baseContextDim + this.genreList.length + this.tagList.length + this.gameFeatureDim;
    this.linucb = new LinUCB(contextDim, this.alpha);
    
    // Load existing model data from database
    await this.loadModelFromDB();
    
    // Train from historical data if no model exists
    const hasExistingModel = await this.hasExistingModelData();
    if (!hasExistingModel) {
      console.log('No existing model found, training from historical data...');
      await this.trainFromHistoricalData();
    } else {
      console.log('Found existing model data, skipping historical training');
    }
  }

  /**
   * Check if we have existing model data
   */
  async hasExistingModelData() {
    return new Promise((resolve) => {
      this.db.get(
        'SELECT COUNT(*) as count FROM bandit_models',
        (err, row) => {
          if (err || !row) {
            resolve(false);
            return;
          }
          resolve(row.count > 0);
        }
      );
    });
  }

  /**
   * Train the model from historical game sessions
   */
  async trainFromHistoricalData() {
    return new Promise((resolve) => {
      // Get all completed sessions with game data
      this.db.all(
        `SELECT gs.*, g.genres, g.tags, g.playtime, g.timeLastPlay 
         FROM game_sessions gs
         JOIN games g ON gs.game_id = g.id
         WHERE gs.end_time IS NOT NULL 
           AND gs.game_time IS NOT NULL
           AND gs.game_time > 0
         ORDER BY gs.start_time ASC`,
        async (err, sessions) => {
          if (err || !sessions || sessions.length === 0) {
            console.log('No historical sessions found for training');
            resolve();
            return;
          }

          console.log(`Training from ${sessions.length} historical sessions...`);
          
          let trainedCount = 0;
          for (const session of sessions) {
            try {
              // Calculate reward based on play time
              // < 10 min = 0 (not interested), 10-120 min = linear growth, >= 120 min = 1.0 (very engaged)
              const playMinutes = session.game_time / 60;
              let reward = 0;
              if (playMinutes < 10) {
                reward = 0.0;
              } else if (playMinutes < 120) {
                reward = (playMinutes - 10) / 110.0; // Linear from 0 to 1 over 110 minutes
              } else {
                reward = 1.0;
              }

              // Get game features (use current game state from database)
              // sessionTime is only used for temporal user context (time of day, weekend, etc.)
              const sessionTime = new Date(session.start_time);
              const gameFeatures = {
                genres: session.genres,
                tags: session.tags,
                playtime: session.playtime,      // Current game playtime from database
                timeLastPlay: session.timeLastPlay // Current game timeLastPlay from database
              };
              
              // Extract context as it would have been at that time
              const context = await this.extractContextAtTime(sessionTime, gameFeatures);
              
              // Update model
              this.linucb.update(session.game_id, context, reward);
              trainedCount++;
            } catch (error) {
              console.error('Error training from session:', error);
            }
          }

          console.log(`Successfully trained from ${trainedCount} sessions`);
          
          // Save all trained models to database
          const gameIds = new Set(sessions.map(s => s.game_id));
          for (const gameId of gameIds) {
            await this.saveArmToDB(gameId);
          }
          
          resolve();
        }
      );
    });
  }


  /**
   * Extract context features as they would have been at a specific time
   * Now properly separates user context from game-specific features
   */
  async extractContextAtTime(timestamp, gameFeatures = null) {
    const hour = timestamp.getHours();
    const dayOfWeek = timestamp.getDay();
    
    // Base USER context features (same for all games)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0;
    const isMorning = hour >= 6 && hour < 12 ? 1 : 0;
    const isAfternoon = hour >= 12 && hour < 18 ? 1 : 0;
    const isNight = hour >= 18 || hour < 6 ? 1 : 0;
    
    // Hours since last session before this time
    const hoursSinceLastSession = await this.getHoursSinceLastSessionBeforeTime(timestamp);
    
    // Normalize hours (cap at 168 hours = 1 week)
    const normalizedHours = Math.min(hoursSinceLastSession / 168.0, 1.0);
    
    // GAME-SPECIFIC features (different for each game being evaluated)
    let gameFeatureVector = new Array(this.genreList.length + this.tagList.length + this.gameFeatureDim).fill(0);
    
    if (gameFeatures) {
      // Game's genre features (binary: 1 if game has this genre, 0 otherwise)
      if (gameFeatures.genres) {
        try {
          const gameGenres = typeof gameFeatures.genres === 'string' ? 
            JSON.parse(gameFeatures.genres) : gameFeatures.genres;
          gameGenres.forEach(genre => {
            const genreIndex = this.genreList.indexOf(genre);
            if (genreIndex !== -1) {
              gameFeatureVector[genreIndex] = 1;
            }
          });
        } catch (e) {
          // Skip invalid JSON
        }
      }
      
      // Game's tag features (binary: 1 if game has this tag, 0 otherwise)
      if (gameFeatures.tags) {
        try {
          const gameTags = typeof gameFeatures.tags === 'string' ? 
            JSON.parse(gameFeatures.tags) : gameFeatures.tags;
          gameTags.forEach(tag => {
            const tagIndex = this.tagList.indexOf(tag);
            if (tagIndex !== -1) {
              gameFeatureVector[this.genreList.length + tagIndex] = 1;
            }
          });
        } catch (e) {
          // Skip invalid JSON
        }
      }
      
      // Game's bucketed playtime and recency features
      const genreTagEnd = this.genreList.length + this.tagList.length;
      
      // Bucket playtime (5 binary features)
      const playtimeMinutes = gameFeatures.playtime || 0;
      const playtimeBuckets = this.bucketPlaytime(playtimeMinutes);
      playtimeBuckets.forEach((value, idx) => {
        gameFeatureVector[genreTagEnd + idx] = value;
      });
      
      // Bucket recency (5 binary features)
      const timeLastPlayDays = gameFeatures.timeLastPlay ? 
        (timestamp - new Date(gameFeatures.timeLastPlay * 1000)) / (1000 * 60 * 60 * 24) : 365;
      const recencyBuckets = this.bucketRecency(timeLastPlayDays);
      recencyBuckets.forEach((value, idx) => {
        gameFeatureVector[genreTagEnd + this.playtimeBuckets + idx] = value;
      });
    }
    
    return [
      isWeekend,
      isMorning,
      isAfternoon,
      isNight,
      normalizedHours,
      ...gameFeatureVector
    ];
  }

  /**
   * Get hours since last session before a specific timestamp
   */
  async getHoursSinceLastSessionBeforeTime(timestamp) {
    return new Promise((resolve) => {
      this.db.get(
        'SELECT MAX(start_time) as lastSession FROM game_sessions WHERE start_time < ?',
        [timestamp.toISOString()],
        (err, row) => {
          if (err || !row || !row.lastSession) {
            resolve(168); // Default to 1 week if no sessions
            return;
          }

          const lastTime = new Date(row.lastSession);
          const hoursDiff = (timestamp - lastTime) / (1000 * 60 * 60);
          resolve(hoursDiff);
        }
      );
    });
  }

  /**
   * Update genre list from all games
   */
  async updateGenreList() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT DISTINCT genres FROM games WHERE genres IS NOT NULL',
        (err, rows) => {
          if (err) {
            console.error('Error fetching genres:', err);
            this.genreList = [];
            resolve();
            return;
          }

          const genreSet = new Set();
          rows.forEach(row => {
            try {
              const genres = JSON.parse(row.genres);
              genres.forEach(g => genreSet.add(g));
            } catch (e) {
              // Skip invalid JSON
            }
          });

          this.genreList = Array.from(genreSet).sort();
          resolve();
        }
      );
    });
  }

  /**
   * Update tag list from all games
   */
  async updateTagList() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT DISTINCT tags FROM games WHERE tags IS NOT NULL',
        (err, rows) => {
          if (err) {
            console.error('Error fetching tags:', err);
            this.tagList = [];
            resolve();
            return;
          }

          const tagSet = new Set();
          rows.forEach(row => {
            try {
              const tags = JSON.parse(row.tags);
              tags.forEach(t => tagSet.add(t));
            } catch (e) {
              // Skip invalid JSON
            }
          });

          this.tagList = Array.from(tagSet).sort();
          resolve();
        }
      );
    });
  }

  /**
   * Bucket playtime into categories (one-hot encoding)
   * Returns array of 5 binary features: [0-5h, 5-20h, 20-50h, 50-100h, 100+h]
   */
  bucketPlaytime(playtimeMinutes) {
    const hours = playtimeMinutes / 60.0;
    const buckets = [0, 0, 0, 0, 0];
    
    if (hours < 5) {
      buckets[0] = 1; // 0-5 hours (new)
    } else if (hours < 20) {
      buckets[1] = 1; // 5-20 hours (light)
    } else if (hours < 50) {
      buckets[2] = 1; // 20-50 hours (medium)
    } else if (hours < 100) {
      buckets[3] = 1; // 50-100 hours (heavy)
    } else {
      buckets[4] = 1; // 100+ hours (very heavy)
    }
    
    return buckets;
  }

  /**
   * Bucket recency into categories (one-hot encoding)
   * Returns array of 5 binary features: [0-3d, 4-14d, 15-60d, 61-180d, 181+d]
   */
  bucketRecency(daysSinceLastPlay) {
    const buckets = [0, 0, 0, 0, 0];
    
    if (daysSinceLastPlay <= 3) {
      buckets[0] = 1; // 0-3 days (very recent)
    } else if (daysSinceLastPlay <= 14) {
      buckets[1] = 1; // 4-14 days (recent)
    } else if (daysSinceLastPlay <= 60) {
      buckets[2] = 1; // 15-60 days (medium)
    } else if (daysSinceLastPlay <= 180) {
      buckets[3] = 1; // 61-180 days (old)
    } else {
      buckets[4] = 1; // 181+ days (very old/never)
    }
    
    return buckets;
  }

  /**
   * Get playtime bucket name for debugging
   */
  getPlaytimeBucketName(hours) {
    if (hours < 5) return '0-5h (new)';
    if (hours < 20) return '5-20h (light)';
    if (hours < 50) return '20-50h (medium)';
    if (hours < 100) return '50-100h (heavy)';
    return '100+h (very heavy)';
  }

  /**
   * Get recency bucket name for debugging
   */
  getRecencyBucketName(days) {
    if (days <= 3) return '0-3d (very recent)';
    if (days <= 14) return '4-14d (recent)';
    if (days <= 60) return '15-60d (medium)';
    if (days <= 180) return '61-180d (old)';
    return '181+d (very old/never)';
  }

  /**
   * Extract context features for current situation
   * Now properly separates user context from game-specific features
   */
  async extractContext(gameFeatures = null) {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    // Base USER context features (same for all games)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0;
    const isMorning = hour >= 6 && hour < 12 ? 1 : 0;
    const isAfternoon = hour >= 12 && hour < 18 ? 1 : 0;
    const isNight = hour >= 18 || hour < 6 ? 1 : 0;
    
    // Hours since last session
    const hoursSinceLastSession = await this.getHoursSinceLastSession();
    
    // Normalize hours (cap at 168 hours = 1 week)
    const normalizedHours = Math.min(hoursSinceLastSession / 168.0, 1.0);
    
    // GAME-SPECIFIC features (different for each game being evaluated)
    let gameFeatureVector = new Array(this.genreList.length + this.tagList.length + this.gameFeatureDim).fill(0);
    
    if (gameFeatures) {
      // Game's genre features (binary: 1 if game has this genre, 0 otherwise)
      if (gameFeatures.genres) {
        try {
          const gameGenres = typeof gameFeatures.genres === 'string' ? 
            JSON.parse(gameFeatures.genres) : gameFeatures.genres;
          gameGenres.forEach(genre => {
            const genreIndex = this.genreList.indexOf(genre);
            if (genreIndex !== -1) {
              gameFeatureVector[genreIndex] = 1;
            }
          });
        } catch (e) {
          // Skip invalid JSON
        }
      }
      
      // Game's tag features (binary: 1 if game has this tag, 0 otherwise)
      if (gameFeatures.tags) {
        try {
          const gameTags = typeof gameFeatures.tags === 'string' ? 
            JSON.parse(gameFeatures.tags) : gameFeatures.tags;
          gameTags.forEach(tag => {
            const tagIndex = this.tagList.indexOf(tag);
            if (tagIndex !== -1) {
              gameFeatureVector[this.genreList.length + tagIndex] = 1;
            }
          });
        } catch (e) {
          // Skip invalid JSON
        }
      }
      
      // Game's bucketed playtime and recency features
      const genreTagEnd = this.genreList.length + this.tagList.length;
      
      // Bucket playtime (5 binary features)
      const playtimeMinutes = gameFeatures.playtime || 0;
      const playtimeBuckets = this.bucketPlaytime(playtimeMinutes);
      playtimeBuckets.forEach((value, idx) => {
        gameFeatureVector[genreTagEnd + idx] = value;
      });
      
      // Bucket recency (5 binary features)
      const timeLastPlayDays = gameFeatures.timeLastPlay ? 
        (now - new Date(gameFeatures.timeLastPlay * 1000)) / (1000 * 60 * 60 * 24) : 365;
      const recencyBuckets = this.bucketRecency(timeLastPlayDays);
      recencyBuckets.forEach((value, idx) => {
        gameFeatureVector[genreTagEnd + this.playtimeBuckets + idx] = value;
      });
    }
    
    return [
      isWeekend,
      isMorning,
      isAfternoon,
      isNight,
      normalizedHours,
      ...gameFeatureVector
    ];
  }

  /**
   * Get hours since last game session
   */
  async getHoursSinceLastSession() {
    return new Promise((resolve) => {
      this.db.get(
        'SELECT MAX(start_time) as lastSession FROM game_sessions',
        (err, row) => {
          if (err || !row || !row.lastSession) {
            resolve(168); // Default to 1 week if no sessions
            return;
          }

          const lastTime = new Date(row.lastSession);
          const now = new Date();
          const hoursDiff = (now - lastTime) / (1000 * 60 * 60);
          resolve(hoursDiff);
        }
      );
    });
  }


  /**
   * Get recommended games using LinUCB + MMR diversification
   */
  async getRecommendations(count = 3, diversityFactor = 0.05) {
    if (!this.linucb) {
      await this.initialize();
    }

    // Get all installed games
    const installedGames = await this.getInstalledGames();
    
    if (installedGames.length === 0) {
      return [];
    }

    // Debug context information
    console.log('--- Context Debug ---');
    console.log('Total genres in database:', this.genreList.length);
    console.log('Total tags in database:', this.tagList.length);
    console.log('Context dimension (base + game features):', 5 + this.genreList.length + this.tagList.length + 2);
    console.log('---');

    // Filter out recently shown games to ensure variety
    let availableGames = installedGames.filter(game => 
      !this.recentlyShownGames.has(game.id)
    );
    
    // If all games have been exhausted, reset and start over
    if (availableGames.length === 0) {
      console.log('All games exhausted - resetting recently shown games to start over');
      this.recentlyShownGames.clear();
      availableGames = installedGames;
    } else if (availableGames.length < count) {
      // If we don't have enough games to fulfill the request, also reset
      console.log(`Not enough games available (${availableGames.length} < ${count}) - resetting recently shown games`);
      this.recentlyShownGames.clear();
      availableGames = installedGames;
    }

    // Calculate UCB scores for available games
    const scores = [];
    for (const game of availableGames) {
      // Extract game features for this specific game
      const gameFeatures = {
        genres: game.genres,
        tags: game.tags,
        playtime: game.playtime || 0,
        timeLastPlay: game.timeLastPlay || 0
      };
      
      // Use appropriate context with game-specific features
      const gameContext = await this.extractContext(gameFeatures);
      
      // Check if game has model data (been played before)
      this.linucb.initArm(game.id);
      const arm = this.linucb.arms.get(game.id);
      const hasModelData = arm.b.some(val => val !== 0);
      
      // Calculate UCB score with alpha
      let ucbScore = this.calculateUCBScore(game.id, gameContext, this.alpha);
      
      // Apply penalty for games with no training data
      // This prevents untested games from dominating recommendations
      if (!hasModelData) {
        ucbScore = ucbScore * 0.3; // 70% penalty for unplayed games
      }
      
      const explorationAlpha = this.alpha;
      
      // Get detailed breakdown for this game
      const breakdown = await this.getScoreBreakdown(game.id, gameContext);
      breakdown.hasModelData = hasModelData;
      breakdown.explorationAlpha = explorationAlpha;
      breakdown.penaltyApplied = !hasModelData;
      
      // Store bucket info for debugging
      const playtimeMinutes = gameFeatures.playtime || 0;
      const playtimeHours = playtimeMinutes / 60.0;
      const timeLastPlayDays = gameFeatures.timeLastPlay ? 
        (Date.now() - new Date(gameFeatures.timeLastPlay * 1000).getTime()) / (1000 * 60 * 60 * 24) : 365;
      
      breakdown.playtimeBucket = this.getPlaytimeBucketName(playtimeHours);
      breakdown.recencyBucket = this.getRecencyBucketName(timeLastPlayDays);
      breakdown.playtimeHours = playtimeHours;
      breakdown.daysSinceLastPlay = timeLastPlayDays;
      
      // Add random diversity factor to introduce variation
      // TEMPORARILY DISABLED: const randomFactor = diversityFactor * (Math.random() - 0.5) * 2; // -diversityFactor to +diversityFactor
      const randomFactor = 0; // Random factor temporarily disabled
      
      scores.push({
        game,
        score: ucbScore + randomFactor,
        breakdown  // Store breakdown for debugging
      });
    }


    // Sort by score
    scores.sort((a, b) => b.score - a.score);

    // Debug top recommendations with detailed LinUCB breakdown
    console.log('--- Top 10 Recommendations (Detailed) ---');
    scores.slice(0, 20).forEach((item, idx) => {
      let gameGenres = [];
      try {
        if (item.game.genres) {
          gameGenres = typeof item.game.genres === 'string' ? 
            JSON.parse(item.game.genres) : item.game.genres;
        }
      } catch (e) {
        // Invalid genres
      }
      
      const breakdown = item.breakdown;
      
      console.log(`\n${idx + 1}. ${item.game.name} (${item.game.id})`);
      console.log(`   Final Score: ${item.score.toFixed(3)}`);
      console.log(`   Expected Reward: ${breakdown.expectedReward.toFixed(4)}`);
      console.log(`   Uncertainty: ${breakdown.uncertainty.toFixed(4)}`);
      console.log(`   Exploration Alpha: ${breakdown.explorationAlpha.toFixed(2)}`);
      console.log(`   Exploration Bonus: ${(breakdown.explorationAlpha * breakdown.uncertainty).toFixed(4)}`);
      console.log(`   UCB Score (before penalty): ${breakdown.ucbScore.toFixed(4)}`);
      console.log(`   Has Model Data: ${breakdown.hasModelData ? 'YES (played before)' : 'NO (never played)'}`);
      if (breakdown.penaltyApplied) {
        console.log(`   ⚠️  New Game Penalty: 70% reduction applied (×0.3)`);
      }
      console.log(`   Playtime: ${breakdown.playtimeHours.toFixed(1)} hours → Bucket: ${breakdown.playtimeBucket}`);
      console.log(`   Last Played: ${breakdown.daysSinceLastPlay.toFixed(1)} days ago → Bucket: ${breakdown.recencyBucket}`);
      console.log(`   Genres: ${gameGenres.length > 0 ? gameGenres.join(', ') : 'NO GENRES'}`);
    });
    console.log('---');

    // top 10 games by expected reward
    const top10GamesByExpectedReward = [...scores].sort((a, b) => b.breakdown.expectedReward - a.breakdown.expectedReward).slice(0, 10);
    console.log('--- Top 10 Games by Expected Reward ---');
    top10GamesByExpectedReward.forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.game.name} (${item.game.id})`);
      console.log(`   Expected Reward: ${item.breakdown.expectedReward.toFixed(4)}`);
    });
    console.log('---');



    // Apply MMR diversification
    // const recommendations = this.applyMMR(scores, count).slice(0, count);
    const recommendations = scores.slice(0, count);//

    // Track the games we're showing to avoid repetition
    recommendations.forEach(item => {
      this.recentlyShownGames.add(item.game.id);
    });

    // Return both games and scores for debugging
    const result = recommendations.map(item => ({
      game: item.game,
      hybridScore: item.score,
      expectedReward: item.breakdown.expectedReward
    }));
    
    console.log('RecommendationService returning:', result.map(r => ({ 
      gameName: r.game.name, 
      gameId: r.game.id, 
      hybridScore: r.hybridScore,
      expectedReward: r.expectedReward
    })));
    
    return result;
  }

  /**
   * Apply Maximal Marginal Relevance (MMR) for diversity
   */
  applyMMR(scoredGames, count, lambda = 0.7) {
    if (scoredGames.length <= count) {
      return scoredGames;
    }

    const selected = [];
    const remaining = [...scoredGames];

    // Select first game (highest score)
    selected.push(remaining.shift());

    // Select remaining games balancing relevance and diversity
    while (selected.length < count && remaining.length > 0) {
      let bestIdx = 0;
      let bestMMR = -Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        
        // Relevance score (normalized)
        const relevance = candidate.score;
        
        // Max similarity to already selected games
        let maxSim = 0;
        for (const selectedItem of selected) {
          const sim = this.calculateSimilarity(candidate.game, selectedItem.game);
          maxSim = Math.max(maxSim, sim);
        }

        // MMR score: balance relevance and diversity
        const mmr = lambda * relevance - (1 - lambda) * maxSim;
        
        if (mmr > bestMMR) {
          bestMMR = mmr;
          bestIdx = i;
        }
      }

      selected.push(remaining.splice(bestIdx, 1)[0]);
    }

    return selected;
  }

  /**
   * Calculate similarity between two games based on genres/tags
   */
  calculateSimilarity(game1, game2) {
    const features1 = this.getGameGenres(game1);
    const features2 = this.getGameGenres(game2);

    if (features1.length === 0 || features2.length === 0) {
      return 0;
    }

    // Jaccard similarity
    const intersection = features1.filter(f => features2.includes(f)).length;
    const union = new Set([...features1, ...features2]).size;

    return union > 0 ? intersection / union : 0;
  }

  /**
   * Get game genres as array
   */
  getGameGenres(game) {
    const genres = [];
    
    // Add genres
    if (game.genres) {
      try {
        const parsed = typeof game.genres === 'string' 
          ? JSON.parse(game.genres) 
          : game.genres;
        genres.push(...parsed);
      } catch (e) {
        // Skip invalid JSON
      }
    }

    // Add tags
    if (game.tags) {
      try {
        const parsed = typeof game.tags === 'string' 
          ? JSON.parse(game.tags) 
          : game.tags;
        genres.push(...parsed);
      } catch (e) {
        // Skip invalid JSON
      }
    }

    return genres;
  }

  /**
   * Get all installed games
   */
  async getInstalledGames() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM games 
         WHERE (process IS NOT NULL OR path IS NOT NULL)`,
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Parse JSON fields for UI compatibility
          const parsedRows = (rows || []).map(row => {
            const parsed = { ...row };
            
            // Parse genres from JSON string to array
            if (parsed.genres) {
              try {
                parsed.genres = JSON.parse(parsed.genres);
              } catch (e) {
                parsed.genres = null;
              }
            }
            
            // Parse tags from JSON string to array
            if (parsed.tags) {
              try {
                parsed.tags = JSON.parse(parsed.tags);
              } catch (e) {
                parsed.tags = null;
              }
            }
            
            // Parse categories from JSON string to array
            if (parsed.categories) {
              try {
                parsed.categories = JSON.parse(parsed.categories);
              } catch (e) {
                parsed.categories = null;
              }
            }
            
            // Parse platforms from JSON string to object
            if (parsed.platforms) {
              try {
                parsed.platforms = JSON.parse(parsed.platforms);
              } catch (e) {
                parsed.platforms = null;
              }
            }
            
            return parsed;
          });
          
          resolve(parsedRows);
        }
      );
    });
  }

  /**
   * Calculate UCB score with custom alpha parameter
   */
  calculateUCBScore(gameId, context, alpha) {
    this.linucb.initArm(gameId);
    const arm = this.linucb.arms.get(gameId);
    
    try {
      const A_inv = this.linucb.invertMatrix(arm.A);
      const theta = this.linucb.matrixVectorMult(A_inv, arm.b);
      
      // Expected reward
      const expectedReward = this.linucb.dotProduct(theta, context);
      
      // Uncertainty bonus with custom alpha
      const A_inv_x = this.linucb.matrixVectorMult(A_inv, context);
      const uncertainty = Math.sqrt(this.linucb.dotProduct(context, A_inv_x));
      
      // UCB score = expected reward + alpha * uncertainty
      return expectedReward + alpha * uncertainty;
    } catch (error) {
      console.error('Error computing custom UCB score:', error);
      return 0;
    }
  }

  /**
   * Get detailed score breakdown for debugging
   */
  async getScoreBreakdown(gameId, context) {
    this.linucb.initArm(gameId);
    const arm = this.linucb.arms.get(gameId);
    
    try {
      const A_inv = this.linucb.invertMatrix(arm.A);
      const theta = this.linucb.matrixVectorMult(A_inv, arm.b);
      
      // Expected reward
      const expectedReward = this.linucb.dotProduct(theta, context);
      
      // Uncertainty bonus
      const A_inv_x = this.linucb.matrixVectorMult(A_inv, context);
      const uncertainty = Math.sqrt(this.linucb.dotProduct(context, A_inv_x));
      
      // UCB score = expected reward + alpha * uncertainty
      const ucbScore = expectedReward + this.linucb.alpha * uncertainty;
      
      // Check if has model data (non-zero b vector)
      const hasModelData = arm.b.some(val => val !== 0);
      
      return {
        expectedReward,
        uncertainty,
        ucbScore,
        hasModelData
      };
    } catch (error) {
      return {
        expectedReward: 0,
        uncertainty: 0,
        ucbScore: 0,
        hasModelData: false,
        error: error.message
      };
    }
  }

  /**
   * Filter games that have actual game sessions (have been played)
   */
  async filterGamesWithSessions(games) {
    return new Promise((resolve) => {
      if (games.length === 0) {
        resolve([]);
        return;
      }

      const gameIds = games.map(g => g.id);
      const placeholders = gameIds.map(() => '?').join(',');

      this.db.all(
        `SELECT DISTINCT game_id FROM game_sessions 
         WHERE game_id IN (${placeholders}) 
           AND end_time IS NOT NULL 
           AND game_time IS NOT NULL 
           AND game_time > 0`,
        gameIds,
        (err, rows) => {
          if (err || !rows) {
            resolve(games); // If query fails, return all games
            return;
          }

          const gamesWithSessions = games.filter(game => 
            rows.some(row => row.game_id === game.id)
          );

          resolve(gamesWithSessions);
        }
      );
    });
  }

  /**
   * Record feedback when a game is launched from recommendations
   */
  async recordLaunch(gameId) {
    // Store impression with timestamp
    const now = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO recommendation_feedback (game_id, action, timestamp) 
         VALUES (?, 'launch', ?)`,
        [gameId, now],
        (err) => {
          if (err) {
            console.error('Error recording launch:', err);
          }
          resolve();
        }
      );
    });
  }

  /**
   * Calculate reward and update model based on game session
   */
  async updateFromSession(sessionId) {
    return new Promise(async (resolve, reject) => {
      // Get session details with game info
      this.db.get(
        `SELECT gs.game_id, gs.game_time, gs.start_time, g.genres, g.tags, g.playtime, g.timeLastPlay 
         FROM game_sessions gs 
         JOIN games g ON gs.game_id = g.id 
         WHERE gs.session_id = ?`,
        [sessionId],
        async (err, session) => {
          if (err || !session) {
            resolve();
            return;
          }

          const gameId = session.game_id;
          const playMinutes = (session.game_time || 0) / 60;

          // Calculate reward based on play time
          let reward = 0;
          if (playMinutes < 10) {
            reward = 0.0;
          } else if (playMinutes < 30) {
            reward = 0.4;
          } else if (playMinutes < 60) {
            reward = 0.6;
          } else if (playMinutes < 120) {
            reward = 0.9;
          } else {
            reward = 1.0;
          }

          console.log(`\n=== Updating Bandit Model ===`);
          console.log(`Session ID: ${sessionId}`);
          console.log(`Game ID: ${gameId}`);
          console.log(`Session Time: ${session.game_time} seconds (${playMinutes.toFixed(1)} minutes)`);
          console.log(`Reward: ${reward}`);

          // Get context with game features AS THEY WERE DURING THIS SESSION
          // playtime: game's previous playtime + this session time (in minutes)
          // timeLastPlay: when this session started (epoch seconds)
          
          const gameFeatures = {
            genres: session.genres,
            tags: session.tags,
            playtime: session.playtime || 0,   // Total playtime including this session (in minutes)
            timeLastPlay: session.timeLastPlay || 0,   // When this session started (epoch seconds)
          };
          
          console.log(`Game Features for Context:`);
          console.log(`  - Previous playtime: ${session.playtime || 0} min`);
          console.log(`  - Session time: ${(session.game_time / 60).toFixed(1)} min`);
          console.log(`  - Time last play: ${session.timeLastPlay || 0} seconds`);
          console.log(`  - Session time: ${(session.playtime || 60).toFixed(1)} seonds`);
          
          const context = await this.extractContext(gameFeatures);

          // Update LinUCB model
          if (!this.linucb) {
            await this.initialize();
          }
          this.linucb.update(gameId, context, reward);

          // Save updated model to database
          await this.saveArmToDB(gameId);

          resolve();
        }
      );
    });
  }

  /**
   * Load model data from database
   */
  async loadModelFromDB() {
    return new Promise((resolve) => {
      this.db.all(
        'SELECT * FROM bandit_models',
        (err, rows) => {
          if (err || !rows) {
            resolve();
            return;
          }

          rows.forEach(row => {
            try {
              const data = JSON.parse(row.model_data);
              this.linucb.loadArm(row.game_id, data);
            } catch (e) {
              console.error('Error loading arm data:', e);
            }
          });

          resolve();
        }
      );
    });
  }

  /**
   * Save arm model to database
   */
  async saveArmToDB(gameId) {
    const data = this.linucb.serializeArm(gameId);
    if (!data) return;

    const modelData = JSON.stringify(data);

    return new Promise((resolve) => {
      this.db.run(
        `INSERT OR REPLACE INTO bandit_models (game_id, model_data, updated_at) 
         VALUES (?, ?, ?)`,
        [gameId, modelData, new Date().toISOString()],
        (err) => {
          if (err) {
            console.error('Error saving arm model:', err);
          }
          resolve();
        }
      );
    });
  }
}

module.exports = RecommendationService;
