const { getOrDownloadThumbnail, getGameMetadata, getOrDownloadCoverImage } = require('../thumbnailManager');
const fs = require('fs-extra');
const path = require('path');

class GameService {
  constructor(db, configService) {
    this.db = db;
    this.configService = configService;
  }

  async getAllGames() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM games', (err, rows) => {
        if (err) reject(err);
        else {
          // Parse tags from JSON string
          const games = rows.map(row => ({
            ...row,
            tags: row.tags ? JSON.parse(row.tags) : []
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
                
                // Fetch metadata and download images (with timeout)
                let thumbnailPath = null;
                let coverPath = null;
                let metadata = null;
                
                if (appInfo.type === 'steam') {
                  try {
                    // Set a timeout for metadata fetching
                    const metadataPromise = getGameMetadata(appInfo.id);
                    const timeoutPromise = new Promise((_, reject) => 
                      setTimeout(() => reject(new Error('Metadata fetch timeout')), 15000)
                    );
                    
                    metadata = await Promise.race([metadataPromise, timeoutPromise]);
                    
                    // Set a timeout for thumbnail downloading
                    const thumbnailPromise = getOrDownloadThumbnail(appInfo.id);
                    const thumbnailTimeoutPromise = new Promise((_, reject) => 
                      setTimeout(() => reject(new Error('Thumbnail download timeout')), 10000)
                    );
                    
                    thumbnailPath = await Promise.race([thumbnailPromise, thumbnailTimeoutPromise]);
                    
                    // Set a timeout for cover image downloading
                    const coverPromise = getOrDownloadCoverImage(appInfo.id);
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
                    `INSERT INTO games (id, appid, name, path, type, thumbnail, description, shortDescription, genres, releaseDate, developer, publisher, metacritic, categories, platforms, backgroundImage, headerImage, capsuleImage, capsuleImageV5, backgroundRaw, coverImage, isFree, requiredAge, supportedLanguages, website, recommendations, steamGridCover, steamGridHero, steamGridLogo, steamGridGameId)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON CONFLICT(id) DO UPDATE SET
                       appid=excluded.appid, name=excluded.name, path=excluded.path, type=excluded.type,
                       thumbnail=excluded.thumbnail, description=excluded.description, shortDescription=excluded.shortDescription,
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

  async launchGame(gamePath) {
    try {
      const { spawn } = require('child_process');
      spawn(gamePath, [], { detached: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
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
}

module.exports = GameService;
