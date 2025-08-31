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
        `INSERT INTO games (id, appid, name, path, type, thumbnail) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET appid=excluded.appid, name=excluded.name, path=excluded.path, type=excluded.type, thumbnail=excluded.thumbnail`,
        [game.id, game.appid, game.name, game.path, game.type, game.thumbnail],
        function (err) {
          if (err) reject(err);
          else resolve({ success: true });
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

  async detectSteamGames(progressCallback) {
    try {
      console.log('Starting Steam game detection...');

      const config = await this.configService.getConfig();
      const steamPath = config.steamPath;

      if (!steamPath) {
        throw new Error('Steam path not configured');
      }

      console.log('Steam path:', steamPath);

      const libraryFoldersPath = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');
      console.log('Library folders path:', libraryFoldersPath);

      if (!fs.existsSync(libraryFoldersPath)) {
        throw new Error('libraryfolders.vdf not found');
      }

      const libraryFoldersContent = fs.readFileSync(libraryFoldersPath, 'utf8');
      const libraryPaths = [];

      // Parse libraryfolders.vdf to get library paths
      const pathMatches = libraryFoldersContent.match(/"path"\s+"([^"]+)"/g);
      if (pathMatches) {
        pathMatches.forEach(match => {
          const pathMatch = match.match(/"path"\s+"([^"]+)"/);
          if (pathMatch) {
            const libraryPath = pathMatch[1];
            libraryPaths.push(libraryPath);
            console.log('Found library path:', libraryPath);
          }
        });
      }

      const games = [];

      // Process each library path
      for (const libraryPath of libraryPaths) {
        const steamappsPath = path.join(libraryPath, 'steamapps');
        if (!fs.existsSync(steamappsPath)) continue;

        const appManifestFiles = fs.readdirSync(steamappsPath)
          .filter(file => file.startsWith('appmanifest_') && file.endsWith('.acf'));

        console.log(`Found ${appManifestFiles.length} games in ${libraryPath}`);

        // Process games in batches to avoid blocking
        const batchSize = 3;
        for (let i = 0; i < appManifestFiles.length; i += batchSize) {
          const batch = appManifestFiles.slice(i, i + batchSize);

          // Process batch concurrently
          const batchPromises = batch.map(async (manifestFile) => {
            try {
              const manifestPath = path.join(steamappsPath, manifestFile);
              const manifestContent = fs.readFileSync(manifestPath, 'utf8');

              const appIdMatch = manifestContent.match(/"appid"\s+"(\d+)"/);
              const nameMatch = manifestContent.match(/"name"\s+"([^"]+)"/);

              if (appIdMatch && nameMatch) {
                const appId = appIdMatch[1];
                const name = nameMatch[1];

                console.log(`Processing game: ${name} (${appId})`);

                const appInfo = {
                  id: `steam-${appId}`,
                  appid: appId,
                  name: name,
                  path: libraryPath,
                  type: 'steam'
                };

                // Extract process information from manifest
                const processName = extractProcessFromManifest(manifestPath);
                if (processName) {
                  appInfo.process = processName;
                  console.log(`Found process for ${appInfo.name}: ${processName}`);
                } else {
                  console.log(`No process found for ${appInfo.name} in manifest: ${manifestPath}`);
                }

                // Fetch metadata and download images (with timeout)
                let thumbnailPath = null;
                let coverPath = null;
                let metadata = null;

                if (appInfo.type === 'steam') {
                  try {
                    // Set a timeout for metadata fetching
                    const metadataPromise = getGameMetadata(appInfo.appid);
                    const timeoutPromise = new Promise((_, reject) =>
                      setTimeout(() => reject(new Error('Metadata fetch timeout')), 15000)
                    );

                    metadata = await Promise.race([metadataPromise, timeoutPromise]);

                    // Set a timeout for thumbnail downloading
                    const thumbnailPromise = getOrDownloadThumbnail(appInfo.appid);
                    const thumbnailTimeoutPromise = new Promise((_, reject) =>
                      setTimeout(() => reject(new Error('Thumbnail download timeout')), 10000)
                    );

                    thumbnailPath = await Promise.race([thumbnailPromise, thumbnailTimeoutPromise]);

                    // Set a timeout for cover image downloading
                    const coverPromise = getOrDownloadCoverImage(appInfo.appid);
                    const coverTimeoutPromise = new Promise((_, reject) =>
                      setTimeout(() => reject(new Error('Cover download timeout')), 10000)
                    );

                    try {
                      coverPath = await Promise.race([coverPromise, coverTimeoutPromise]);
                      console.log(`Cover image result for ${appInfo.name}:`, coverPath);
                    } catch (coverError) {
                      console.log(`Cover image download failed for ${appInfo.name}:`, coverError.message);
                      coverPath = null;
                    }

                    // Update appInfo with metadata
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
                  } catch (error) {
                    console.error(`Failed to fetch metadata/assets for ${appInfo.name}:`, error);
                  }
                }

                // Save to DB
                await new Promise((resolve, reject) => {
                  this.db.run(
                    `INSERT INTO games (id, appid, name, path, type, thumbnail, process, description, shortDescription, genres, releaseDate, developer, publisher, metacritic, categories, platforms, backgroundImage, headerImage, capsuleImage, capsuleImageV5, backgroundRaw, coverImage, isFree, requiredAge, supportedLanguages, website, recommendations, steamGridCover, steamGridHero, steamGridLogo, steamGridGameId)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                      ON CONFLICT(id) DO UPDATE SET
                        appid=excluded.appid, name=excluded.name, path=excluded.path, type=excluded.type,
                        thumbnail=excluded.thumbnail, process=excluded.process, description=excluded.description, shortDescription=excluded.shortDescription,
                        genres=excluded.genres, releaseDate=excluded.releaseDate, developer=excluded.developer,
                        publisher=excluded.publisher, metacritic=excluded.metacritic, categories=excluded.categories,
                        platforms=excluded.platforms, backgroundImage=excluded.backgroundImage, headerImage=excluded.headerImage,
                        capsuleImage=excluded.capsuleImage, capsuleImageV5=excluded.capsuleImageV5, backgroundRaw=excluded.backgroundRaw,
                        coverImage=excluded.coverImage, isFree=excluded.isFree, requiredAge=excluded.requiredAge, supportedLanguages=excluded.supportedLanguages,
                        website=excluded.website, recommendations=excluded.recommendations, steamGridCover=excluded.steamGridCover,
                        steamGridHero=excluded.steamGridHero, steamGridLogo=excluded.steamGridLogo, steamGridGameId=excluded.steamGridGameId`,
                    [
                      appInfo.id,
                      appInfo.appid,
                      appInfo.name,
                      appInfo.path,
                      appInfo.type,
                      thumbnailPath,
                      appInfo.process,
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
                      appInfo.steamGridGameId
                    ],
                    function (err) {
                      if (err) reject(err);
                      else resolve();
                    }
                  );
                });

                return appInfo;
              }
            } catch (error) {
              console.error(`Error processing manifest file ${manifestFile}:`, error);
              return null;
            }
          });

          // Wait for batch to complete
          const batchResults = await Promise.allSettled(batchPromises);
          const validGames = batchResults
            .filter(result => result.status === 'fulfilled' && result.value)
            .map(result => result.value);

          games.push(...validGames);

          // Send progress update
          if (progressCallback) {
            progressCallback({
              current: i + batch.length,
              total: appManifestFiles.length,
              library: path.basename(libraryPath),
              gamesFound: games.length
            });
          }

          // Small delay to prevent UI blocking
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`Scan complete. Found ${games.length} games.`);
      return games;

    } catch (error) {
      console.error('Error detecting Steam games:', error);
      throw error;
    }
  }


  async refreshSteamGames() {
    try {
      const appInfos = await this.getAppInfosFromSteam();
      for (const appInfo of appInfos) {
        // upsert the partial infor to db
        await new Promise((resolve, reject) => {
          this.db.run(
            'INSERT INTO games (id, appid, name, type, playtime, timeLastPlay) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET appid=excluded.appid, name=excluded.name, type=excluded.type, playtime=excluded.playtime, timeLastPlay=excluded.timeLastPlay',
            [appInfo.id, appInfo.appid, appInfo.name, appInfo.type, appInfo.playtime, appInfo.timeLastPlay],
            function (err) { if (err) reject(err); else resolve(); }
          );
        });
        
      }
    } catch (error) {
      console.error('Error refreshing Steam games:', error);
      throw error;
    }
  }

  async importSteamGames(progressCallback) {
    try {
      const appInfos = await this.getAppInfosFromSteam();
      let results = [];
      for (let appInfo of appInfos) {
        // Try to enrich metadata and images
        let thumbnailPath = null;
        let coverPath = null;
        let metadata = null;
        try {
          const metadataPromise = getGameMetadata(appId);
          const metadataTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Metadata fetch timeout')), 15000));
          metadata = await Promise.race([metadataPromise, metadataTimeout]);

          const thumbnailPromise = getOrDownloadThumbnail(appId);
          const thumbnailTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Thumbnail download timeout')), 10000));
          thumbnailPath = await Promise.race([thumbnailPromise, thumbnailTimeout]);

          const coverPromise = getOrDownloadCoverImage(appId);
          const coverTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Cover download timeout')), 10000));
          try {
            coverPath = await Promise.race([coverPromise, coverTimeout]);
          } catch (_) {
            coverPath = null;
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
          console.error(`Failed to enrich Steam app ${appId}:`, err);
        }

        // Save to DB
        await new Promise((resolve, reject) => {
          this.db.run(
            `INSERT INTO games (id, appid, name, type, thumbnail, description, shortDescription, genres, releaseDate, developer, publisher, metacritic, categories, platforms, backgroundImage, headerImage, capsuleImage, capsuleImageV5, backgroundRaw, coverImage, isFree, requiredAge, supportedLanguages, website, recommendations, steamGridCover, steamGridHero, steamGridLogo, steamGridGameId, playtime, timeLastPlay)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                 appid=excluded.appid, name=excluded.name, type=excluded.type,
                 thumbnail=excluded.thumbnail, description=excluded.description, shortDescription=excluded.shortDescription,
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
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Post-process: update process and path for installed games using manifests
      try {
        const cfg2 = await this.configService.getConfig();
        const steamPath2 = cfg2.steamPath;
        if (steamPath2) {
          const libraryFoldersPath = path.join(steamPath2, 'steamapps', 'libraryfolders.vdf');
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
                  let processName = extractProcessFromManifest(manifestPath);
                  let gameDir = null;
                  if (installDirMatch) {
                    const installDir = installDirMatch[1];
                    const candidate = path.join(steamappsPath, 'common', installDir);
                    if (fs.existsSync(candidate)) {
                      gameDir = candidate;
                    }
                  }

                  // Update both fields together without overwriting existing with nulls
                  if (processName || gameDir) {
                    await new Promise((resolve, reject) => {
                      this.db.run(
                        'UPDATE games SET process = COALESCE(?, process), path = COALESCE(?, path) WHERE appid = ?',
                        [processName || null, gameDir || null, appId],
                        function (err) { if (err) reject(err); else resolve(); }
                      );
                    });
                  }
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

        // Start monitoring for Steam games
        if (this.gameMonitorService && gameId) {
          // Get the game from database to get process info
          const game = await this.getGameById(gameId);
          if (game && game.process) {
            await this.gameMonitorService.startMonitoring(gameId, game.process);
          }
        }

        return { success: true };
      } else {
        // For regular games, use spawn
        const { spawn } = require('child_process');
        spawn(gamePath, [], { detached: true });

        // Start monitoring for regular games
        if (this.gameMonitorService && gameId) {
          const game = await this.getGameById(gameId);
          if (game && game.process) {
            await this.gameMonitorService.startMonitoring(gameId, game.process);
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
        else resolve(row);
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
        console.log('===>Steam API game:', g);

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

}

module.exports = GameService;
