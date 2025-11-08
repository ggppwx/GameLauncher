const { getOrDownloadThumbnail, getGameMetadata, getOrDownloadCoverImage } = require('../thumbnailManager');
const fs = require('fs-extra');
const path = require('path');
const { extractProcessFromManifest } = require('../utils/gameProcessFinder');

class GameService {
  constructor(db, configService, gameSessionService, gameMonitorService) {
    this.db = db;
    this.configService = configService;
    this.gameSessionService = gameSessionService;
    this.gameMonitorService = gameMonitorService;
  }

  async getAllGames() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM games', (err, rows) => {
        if (err) reject(err);
        else {
          // Parse JSON fields from database
          const games = rows.map(row => ({
            ...row,
            tags: row.tags ? JSON.parse(row.tags) : [],
            genres: row.genres ? JSON.parse(row.genres) : [],
            categories: row.categories ? JSON.parse(row.categories) : [],
            platforms: row.platforms ? JSON.parse(row.platforms) : null
          }));
          resolve(games);
        }
      });
    });
  }

  async addOrUpdateGame(game) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO games (id, appid, name, path, type, thumbnail, overrideProcess) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET appid=excluded.appid, name=excluded.name, path=excluded.path, type=excluded.type, thumbnail=excluded.thumbnail, overrideProcess=COALESCE(excluded.overrideProcess, games.overrideProcess)`,
        [game.id, game.appid, game.name, game.path, game.type, game.thumbnail, game.overrideProcess || null],
        function (err) {
          if (err) reject(err);
          else resolve({ success: true });
        }
      );
    });
  }

  async setOverrideProcess(gameId, overrideProcess) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE games SET overrideProcess = ? WHERE id = ?',
        [overrideProcess || null, gameId],
        function (err) {
          if (err) reject(err); else resolve({ success: true });
        }
      );
    });
  }

  async updateGameTags(gameId, tagNames) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE games SET tags = ? WHERE id = ?',
        [JSON.stringify(tagNames), gameId],
        function (err) {
          if (err) reject(err);
          else resolve({ success: true });
        }
      );
    });
  }

  async getGameNotes(gameId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT notes FROM games WHERE id = ?',
        [gameId],
        function (err, row) {
          if (err) reject(err);
          else resolve(row ? row.notes : null);
        }
      );
    });
  }

  async updateGameNotes(gameId, notes) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE games SET notes = ? WHERE id = ?',
        [notes || null, gameId],
        function (err) {
          if (err) reject(err);
          else resolve({ success: true });
        }
      );
    });
  }

  async removeGame(gameId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM games WHERE id = ?',
        [gameId],
        function (err) {
          if (err) reject(err);
          else resolve({ success: true });
        }
      );
    });
  }


  async refreshSteamGames() {
    try {
      console.log('Starting Steam games refresh (playtime only)...');
      const appInfos = await this.getAppInfosFromSteam();
      console.log(`Found ${appInfos.length} games to refresh`);
      
      for (const appInfo of appInfos) {
        // Only update playtime and last played - no cover images or metadata
        await new Promise((resolve, reject) => {
          this.db.run(
            'UPDATE games SET playtime = ?, timeLastPlay = ? WHERE id = ?',
            [appInfo.playtime, appInfo.timeLastPlay, appInfo.id],
            function (err) { if (err) reject(err); else resolve(); }
          );
        });
      }
      
      console.log('Steam games refresh completed');
      
      // Notify renderer that games were updated
      try {
        const { BrowserWindow } = require('electron');
        const win = BrowserWindow.getAllWindows()[0];
        if (win && !win.isDestroyed()) {
          win.webContents.send('games-updated', { reason: 'steam-refresh' });
        }
      } catch (e) {
        console.log('Failed to notify renderer of games update:', e.message);
      }
      
    } catch (error) {
      console.error('Error refreshing Steam games:', error);
      throw error;
    }
  }

  async importSteamGames(progressCallback, rescan = true) {
      // pre-process: collect process/path/cover in memory to use in a single upsert later
      const preProcessMap = new Map();
      // pre-process: update process and path for installed games using manifests
      try {
        const cfg2 = await this.configService.getConfig();
        const steamPath2 = cfg2.steamPath;
        if (steamPath2) {
          const libraryFoldersPath = path.join(steamPath2, 'steamapps', 'libraryfolders.vdf');
          const libraryCachePath = path.join(steamPath2, 'appcache', 'librarycache'); // to get cover images 
          const launchOptionsPath = path.join(steamPath2, 'appcache', 'appinfo.vdf');


          let appIdToProcessNameMap = new Map();

          if (fs.existsSync(libraryFoldersPath)) {
            const libraryFoldersContent = fs.readFileSync(libraryFoldersPath, 'utf8');
            const libraryPaths = [];
            const pathMatches = libraryFoldersContent.match(/"path"\s+"([^"]+)"/g);
            if (pathMatches) {
              pathMatches.forEach(match => {
                const m = match.match(/"path"\s+"([^"]+)"/);
                if (m) libraryPaths.push(m[1]);
              });
            }

            for (const libraryPath of libraryPaths) {
              const steamappsPath = path.join(libraryPath, 'steamapps');
              if (!fs.existsSync(steamappsPath)) continue;
              const appManifestFiles = fs.readdirSync(steamappsPath)
                .filter(file => file.startsWith('appmanifest_') && file.endsWith('.acf'));

              for (const manifestFile of appManifestFiles) {
                try {
                  const manifestPath = path.join(steamappsPath, manifestFile);
                  const content = fs.readFileSync(manifestPath, 'utf8');
                  const appIdMatch = content.match(/"appid"\s+"(\d+)"/);
                  const installDirMatch = content.match(/"installdir"\s+"([^"]+)"/);
                  if (!appIdMatch) continue;
                  const appId = appIdMatch[1];


                  // let's first find process name from launchOptionsPath
                  let processName = appIdToProcessNameMap.get(appId);
                  if (!processName) {
                    processName = extractProcessFromManifest(manifestPath);
                  }

                  let gameDir = null;
                  let coverPath = null;
                  if (installDirMatch) {
                    const installDir = installDirMatch[1];
                    const candidate = path.join(steamappsPath, 'common', installDir);
                    if (fs.existsSync(candidate)) {
                      gameDir = candidate;
                    }
                  }

                  // Try local Steam library cache for a cover image first
                  console.log(`Trying to get cover image from: ${libraryCachePath}`);
                  try {
                    coverPath = await getOrDownloadCoverImage(appId, libraryCachePath);
                  } catch (coverErr) {
                    console.log('Local cover retrieval failed:', coverErr.message);
                    coverPath = null;
                  }
                  // Store pre-processed data for later single upsert
                  const gameId = `steam-${appId}`;
                  preProcessMap.set(gameId, {
                    process: processName || null,
                    path: gameDir || null,
                    coverImage: coverPath || null
                  });
                } catch (e) {
                  console.log('Post-process manifest update error:', e.message);
                }
              }
            }
          }
        }
      } catch (e) {
        console.log('Post-process update failed:', e.message);
      }

    // now process the overall games including not installed 
    try {
      const appInfos = await this.getAppInfosFromSteam();
      let results = [];
      const total = appInfos.length;
      for (let i = 0; i < appInfos.length; i++) {
        const appInfo = appInfos[i];
        const pre = preProcessMap.get(appInfo.id);
        // If rescan is disabled, skip games that already exist in DB
        if (!rescan) {
          try {
            const existing = await this.getGameById(appInfo.id);
            if (existing) {
              if (progressCallback) {
                progressCallback({ current: i + 1, total, library: 'Steam API', gamesFound: results.length });
              }
              await new Promise(resolve => setTimeout(resolve, 100));
              continue;
            }
          } catch (_) {
          }
        }
        // Try to enrich metadata and images
        let thumbnailPath = null;
        let coverPath = pre && pre.coverImage ? pre.coverImage : null;
        let processName = pre && pre.process ? pre.process : null;
        let gameDir = pre && pre.path ? pre.path : null;
        let metadata = null;
        try {
          const metadataPromise = getGameMetadata(appInfo.appid);
          const metadataTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Metadata fetch timeout')), 15000));
          metadata = await Promise.race([metadataPromise, metadataTimeout]);

          const thumbnailPromise = getOrDownloadThumbnail(appInfo.appid);
          const thumbnailTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Thumbnail download timeout')), 10000));
          thumbnailPath = await Promise.race([thumbnailPromise, thumbnailTimeout]);

          if (!coverPath) {
            // Skip cover image download for games with very low playtime (likely not real games)
            if (appInfo.playtime && appInfo.playtime < 5) {
              console.log(`Skipping cover download for ${appInfo.name} (low playtime: ${appInfo.playtime} minutes)`);
              coverPath = null;
            } else {
              const coverPromise = getOrDownloadCoverImage(appInfo.appid);
              const coverTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Cover download timeout')), 5000));
              try {
                coverPath = await Promise.race([coverPromise, coverTimeout]);
              } catch (_) {
                coverPath = null;
              }
            }
          }

          if (metadata) {
            appInfo.description = metadata.description;
            appInfo.shortDescription = metadata.shortDescription;
            appInfo.genres = metadata.genres;
            appInfo.releaseDate = metadata.releaseDate;
            appInfo.developer = metadata.developer;
            appInfo.publisher = metadata.publisher;
            appInfo.metacritic = metadata.metacritic;
            appInfo.categories = metadata.categories;
            appInfo.platforms = metadata.platforms;
            appInfo.backgroundImage = metadata.backgroundImage;
            appInfo.headerImage = metadata.headerImage;
            appInfo.capsuleImage = metadata.capsuleImage;
            appInfo.capsuleImageV5 = metadata.capsuleImageV5;
            appInfo.backgroundRaw = metadata.backgroundRaw;
            appInfo.coverImage = metadata.coverImage;
            appInfo.isFree = metadata.isFree;
            appInfo.requiredAge = metadata.requiredAge;
            appInfo.supportedLanguages = metadata.supportedLanguages;
            appInfo.website = metadata.website;
            appInfo.recommendations = metadata.recommendations;
          }
        } catch (err) {
          console.error(`Failed to enrich Steam app ${appInfo.appid}:`, err);
        }

        // Save to DB (single upsert including process/path/cover)
        await new Promise((resolve, reject) => {
          this.db.run(
            `INSERT INTO games (id, appid, name, type, thumbnail, process, path, description, shortDescription, genres, releaseDate, developer, publisher, metacritic, categories, platforms, backgroundImage, headerImage, capsuleImage, capsuleImageV5, backgroundRaw, coverImage, isFree, requiredAge, supportedLanguages, website, recommendations, steamGridCover, steamGridHero, steamGridLogo, steamGridGameId, playtime, timeLastPlay)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                 appid=excluded.appid, name=excluded.name, type=excluded.type,
                 thumbnail=excluded.thumbnail, process = COALESCE(excluded.process, games.process), path = COALESCE(excluded.path, games.path), description=excluded.description, shortDescription=excluded.shortDescription,
                 genres=excluded.genres, releaseDate=excluded.releaseDate, developer=excluded.developer,
                 publisher=excluded.publisher, metacritic=excluded.metacritic, categories=excluded.categories,
                 platforms=excluded.platforms, backgroundImage=excluded.backgroundImage, headerImage=excluded.headerImage,
                 capsuleImage=excluded.capsuleImage, capsuleImageV5=excluded.capsuleImageV5, backgroundRaw=excluded.backgroundRaw,
                 coverImage=excluded.coverImage, isFree=excluded.isFree, requiredAge=excluded.requiredAge, supportedLanguages=excluded.supportedLanguages,
                 website=excluded.website, recommendations=excluded.recommendations, steamGridCover=excluded.steamGridCover,
                 steamGridHero=excluded.steamGridHero, steamGridLogo=excluded.steamGridLogo, steamGridGameId=excluded.steamGridGameId,
                 playtime=excluded.playtime, timeLastPlay=excluded.timeLastPlay`,
            [
              appInfo.id,
              appInfo.appid,
              appInfo.name,
              appInfo.type,
              thumbnailPath,
              processName,
              gameDir,
              appInfo.description,
              appInfo.shortDescription,
              appInfo.genres ? JSON.stringify(appInfo.genres) : null,
              appInfo.releaseDate,
              appInfo.developer,
              appInfo.publisher,
              appInfo.metacritic,
              appInfo.categories ? JSON.stringify(appInfo.categories) : null,
              appInfo.platforms ? JSON.stringify(appInfo.platforms) : null,
              appInfo.backgroundImage,
              appInfo.headerImage,
              appInfo.capsuleImage,
              appInfo.capsuleImageV5,
              appInfo.backgroundRaw,
              coverPath,
              appInfo.isFree ? 1 : 0,
              appInfo.requiredAge,
              appInfo.supportedLanguages,
              appInfo.website,
              appInfo.recommendations,
              appInfo.steamGridCover,
              appInfo.steamGridHero,
              appInfo.steamGridLogo,
              appInfo.steamGridGameId,
              appInfo.playtime,
              appInfo.timeLastPlay
            ],
            function (err) {
              if (err) reject(err);
              else resolve();
            }
            );
        });

        results.push(appInfo);

        if (progressCallback) {
          progressCallback({ current: i + 1, total, library: 'Steam API', gamesFound: results.length });
        }

        // delay 1s
        // await new Promise(resolve => setTimeout(resolve, 100));
      }

      return results;
    } catch (error) {
      console.error('Error importing Steam games:', error);
      throw error;
    }
  }

  async launchGame(gameData) {
    try {
      const { gameId, gamePath } = gameData;

      // Check if it's a Steam URL (steam://rungameid/)
      if (gamePath.startsWith('steam://')) {
        const { shell } = require('electron');
        shell.openExternal(gamePath);

        // Start monitoring for Steam games (use overrideProcess if present)
        if (this.gameMonitorService && gameId) {
          const game = await this.getGameById(gameId);
          const proc = (game && game.overrideProcess) ? game.overrideProcess : (game && game.process);
          if (proc) {
            await this.gameMonitorService.startMonitoring(gameId, proc);
          }
        }

        return { success: true };
      } else {
        // For regular games, use spawn
        const { spawn } = require('child_process');
        spawn(gamePath, [], { detached: true });

        // Start monitoring for regular games (use overrideProcess if present)
        if (this.gameMonitorService && gameId) {
          const game = await this.getGameById(gameId);
          const proc = (game && game.overrideProcess) ? game.overrideProcess : (game && game.process);
          if (proc) {
            await this.gameMonitorService.startMonitoring(gameId, proc);
          }
        }

        return { success: true };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getGameById(gameId) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM games WHERE id = ?', [gameId], (err, row) => {
        if (err) reject(err);
        else {
          if (row) {
            // Parse JSON fields from database
            row.tags = row.tags ? JSON.parse(row.tags) : [];
            row.genres = row.genres ? JSON.parse(row.genres) : [];
            row.categories = row.categories ? JSON.parse(row.categories) : [];
            row.platforms = row.platforms ? JSON.parse(row.platforms) : null;
          }
          resolve(row);
        }
      });
    });
  }

  async getThumbnailPath(appId) {
    try {
      console.log('Getting thumbnail for appId:', appId);
      const thumbnailPath = await getOrDownloadThumbnail(appId);
      console.log('Thumbnail path returned:', thumbnailPath);
      return thumbnailPath;
    } catch (error) {
      console.error('Error getting thumbnail path:', error);
      return null;
    }
  }

  async getCoverImage(appId) {
    try {
      console.log('Getting cover image for appId:', appId);
      const coverPath = await getOrDownloadCoverImage(appId);
      console.log('Cover image path returned:', coverPath);
      return coverPath;
    } catch (error) {
      console.error('Error getting cover image:', error);
      return null;
    }
  }

   async getAppInfosFromSteam() {
    try {
      const config = await this.configService.getConfig();
      const apiKey = config.steamApiKey;
      const steamId = config.steamUserId;
      let appInfos = [];

      if (!apiKey || !steamId) {
        throw new Error('Steam API key or SteamID not configured');
      }

      const params = new URLSearchParams({
        key: apiKey,
        steamid: steamId,
        include_appinfo: '1',
        include_played_free_games: '1',
        format: 'json'
      });

      const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?${params.toString()}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Steam API error: ${response.status}`);
      }
      const data = await response.json();
      // console.log('===>Steam API response (full dump):', JSON.stringify(data, null, 2));
      const gamesList = data?.response?.games || [];

      const total = gamesList.length;
      const results = [];

      for (let i = 0; i < gamesList.length; i++) {
        const g = gamesList[i];
        // console.log('===>Steam API game:', g);

        const appId = String(g.appid);
        const name = g.name || `App ${appId}`;

        const appInfo = {
          id: `steam-${appId}`,
          appid: appId,
          name: name,
          path: null,
          type: 'steam',
          playtime: typeof g.playtime_forever === 'number' ? g.playtime_forever : null,
          timeLastPlay: typeof g.rtime_last_played === 'number' ? g.rtime_last_played : null
        };
        appInfos.push(appInfo);
      }

      return appInfos;
      
    } catch (error) {
      console.error('Error getting app infos from Steam:', error);
      return [];
    }
   }

   async retrieveMissingData(gameId) {
    try {
      // Get existing game data
      const game = await this.getGameById(gameId);
      if (!game) {
        throw new Error('Game not found');
      }

      // Only works for Steam games
      if (game.type !== 'steam' || !game.appid) {
        throw new Error('Only Steam games are supported');
      }

      console.log(`Retrieving missing data for ${game.name} (AppID: ${game.appid})...`);

      // Fetch fresh metadata from Steam
      const metadata = await getGameMetadata(game.appid);
      if (!metadata) {
        throw new Error('Failed to fetch metadata from Steam');
      }

      // Debug logging for genres
      console.log(`[${game.name}] Metadata genres:`, metadata.genres);
      console.log(`[${game.name}] Metadata genres type:`, typeof metadata.genres);
      console.log(`[${game.name}] Metadata genres is array:`, Array.isArray(metadata.genres));
      console.log(`[${game.name}] Metadata genres stringified:`, JSON.stringify(metadata.genres));

      // Try to get cover image
      let coverPath = game.coverImage;
      if (!coverPath) {
        try {
          coverPath = await getOrDownloadCoverImage(game.appid);
        } catch (err) {
          console.log('Cover image download failed:', err.message);
        }
      }

      // Update database with new metadata
      await new Promise((resolve, reject) => {
        this.db.run(
          `UPDATE games SET
            description = ?,
            shortDescription = ?,
            genres = ?,
            releaseDate = ?,
            developer = ?,
            publisher = ?,
            metacritic = ?,
            categories = ?,
            platforms = ?,
            backgroundImage = ?,
            headerImage = ?,
            capsuleImage = ?,
            capsuleImageV5 = ?,
            backgroundRaw = ?,
            coverImage = ?,
            isFree = ?,
            requiredAge = ?,
            supportedLanguages = ?,
            website = ?,
            recommendations = ?
          WHERE id = ?`,
          [
            metadata.description,
            metadata.shortDescription,
            metadata.genres ? JSON.stringify(metadata.genres) : null,
            metadata.releaseDate,
            metadata.developer,
            metadata.publisher,
            metadata.metacritic,
            metadata.categories ? JSON.stringify(metadata.categories) : null,
            metadata.platforms ? JSON.stringify(metadata.platforms) : null,
            metadata.backgroundImage,
            metadata.headerImage,
            metadata.capsuleImage,
            metadata.capsuleImageV5,
            metadata.backgroundRaw,
            coverPath,
            metadata.isFree ? 1 : 0,
            metadata.requiredAge,
            metadata.supportedLanguages,
            metadata.website,
            metadata.recommendations,
            gameId
          ],
          function (err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Verify what was saved to the database (raw value)
      const rawRow = await new Promise((resolve, reject) => {
        this.db.get('SELECT genres FROM games WHERE id = ?', [gameId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      console.log(`[${game.name}] Raw genres value in DB:`, rawRow.genres);
      
      // Get parsed game data
      const savedGame = await this.getGameById(gameId);
      console.log(`[${game.name}] Parsed genres from DB:`, savedGame.genres);
      console.log(`[${game.name}] Parsed genres type:`, typeof savedGame.genres);
      console.log(`[${game.name}] Parsed genres is array:`, Array.isArray(savedGame.genres));

      console.log(`Successfully updated metadata for ${game.name}`);
      return { success: true, message: 'Metadata updated successfully' };

    } catch (error) {
      console.error('Error retrieving missing data:', error);
      throw error;
    }
  }

  async refreshAllMissingData() {
    try {
      // Get all installed Steam games
      const allGames = await this.getAllGames();
      const steamGames = allGames.filter(game => 
        game.type === 'steam' && 
        game.appid && 
        (game.process || game.path) // Only installed games
      );

      console.log(`Starting bulk metadata refresh for ${steamGames.length} installed Steam games...`);

      let successful = 0;
      let failed = 0;
      const errors = [];

      for (let i = 0; i < steamGames.length; i++) {
        const game = steamGames[i];
        
        try {
          await this.retrieveMissingData(game.id);
          successful++;
          console.log(`[${i + 1}/${steamGames.length}] Updated: ${game.name}`);

        } catch (error) {
          failed++;
          errors.push({ game: game.name, error: error.message });
          console.error(`[${i + 1}/${steamGames.length}] Failed: ${game.name} - ${error.message}`);
        }

        // Wait 3 seconds between requests to avoid rate limiting (except for the last one)
        if (i < steamGames.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      const result = {
        success: true,
        total: steamGames.length,
        successful,
        failed,
        errors: errors.length > 0 ? errors : undefined
      };

      console.log('Bulk metadata refresh completed:', result);

      return result;

    } catch (error) {
      console.error('Error in bulk metadata refresh:', error);
      throw error;
    }
  }

}

module.exports = GameService;
