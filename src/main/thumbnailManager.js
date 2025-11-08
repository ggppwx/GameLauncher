const path = require('path');
const fs = require('fs-extra');
const https = require('https');
const zlib = require('zlib');
const { URL } = require('url');

const localAppData = process.env.LOCALAPPDATA || process.env.HOME;
const cacheDir = path.join(localAppData, 'Gamelauncher', 'cache');

// Ensure cache directory exists
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

function getThumbnailPath(appId) {
  return path.join(cacheDir, `${appId}.jpg`);
}

function isThumbnailCached(appId) {
  const thumbnailPath = getThumbnailPath(appId);
  return fs.existsSync(thumbnailPath);
}

// Fetch game metadata from Steam Web API
function fetchSteamGameData(appId, attempt = 1) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(`https://store.steampowered.com/api/appdetails?appids=${appId}&cc=us&l=en`);
    const options = {
      headers: {
        'User-Agent': 'GameLauncher/0.1 (+https://local) ',
        'Accept': 'application/json,text/plain,*/*',
        'Accept-Encoding': 'gzip,deflate',
      },
    };

    const req = https.get(urlObj, options, (response) => {
      const status = response.statusCode || 0;
      let stream = response;
      const encoding = (response.headers['content-encoding'] || '').toString();
      if (encoding.includes('gzip') || encoding.includes('deflate')) {
        const unzip = zlib.createUnzip();
        stream = response.pipe(unzip);
      }

      let data = '';
      stream.on('data', (chunk) => {
        data += chunk.toString('utf8');
      });
      stream.on('end', () => {
        try {
          if (status !== 200) {
            throw new Error(`HTTP ${status}`);
          }
          if (!data || data.trim().startsWith('<')) {
            throw new Error('Non-JSON response');
          }
          const json = JSON.parse(data);
          const entry = json[String(appId)];


          // print out entry for Broken Arrow
          // console.log(`[thumbnailManager] AppID ${appId} - Entry:`, entry);

          if (entry && entry.success === true && entry.data) {
            resolve(entry.data);
          } else {
            console.error('Game not found or no data field', entry, urlObj.toString());
            throw new Error('Game not found or no data field');
          }
        } catch (e) {
          if (attempt < 3) {
            const delay = 300 * Math.pow(2, attempt - 1);
            setTimeout(() => {
              fetchSteamGameData(appId, attempt + 1).then(resolve).catch(reject);
            }, delay);
          } else {
            reject(new Error('Failed to parse Steam API response'));
          }
        }
      });
    });

    req.on('error', (err) => {
      if (attempt < 3) {
        const delay = 300 * Math.pow(2, attempt - 1);
        setTimeout(() => {
          fetchSteamGameData(appId, attempt + 1).then(resolve).catch(reject);
        }, delay);
      } else {
        reject(err);
      }
    });
  });
}

// Download image from URL
function downloadImage(url, filePath) {
  return new Promise((resolve, reject) => {
    console.log(`Starting download from ${url} to ${filePath}`);
    
    let timeoutId;
    let file = null;
    let hasError = false;
    
    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (file) {
        try {
          file.close();
        } catch (error) {
          console.log(`Error closing file: ${error.message}`);
        }
      }
    };
    
    const makeRequest = (requestUrl) => {
      // Set timeout for the request
      timeoutId = setTimeout(() => {
        hasError = true;
        cleanup();
        // Use safer file deletion
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, (err) => {
            if (err) console.log(`Could not delete timeout file: ${err.message}`);
          });
        }
        reject(new Error('Download timeout'));
      }, 15000); // 15 second timeout
      
      https.get(requestUrl, (response) => {
        clearTimeout(timeoutId);
        
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const location = response.headers.location;
          if (location) {
            console.log(`Following redirect from ${requestUrl} to ${location}`);
            cleanup();
            // Use safer file deletion
            if (fs.existsSync(filePath)) {
              fs.unlink(filePath, (err) => {
                if (err) console.log(`Could not delete redirect file: ${err.message}`);
              });
            }
            makeRequest(location); // Follow the redirect
            return;
          }
        }
        
        if (response.statusCode === 200) {
          console.log(`Downloading ${response.headers['content-length'] || 'unknown'} bytes...`);
          
          // Create file stream only after successful response
          file = fs.createWriteStream(filePath);
          
          response.pipe(file);
          
          file.on('finish', () => {
            if (hasError) return; // Don't resolve if there was an error
            cleanup();
            console.log(`Download completed successfully: ${filePath}`);
            
            // Verify file exists and has content
            if (fs.existsSync(filePath)) {
              const stats = fs.statSync(filePath);
              console.log(`File size: ${stats.size} bytes`);
              if (stats.size > 0) {
                resolve(filePath);
              } else {
                console.log(`File is empty, deleting and rejecting`);
                fs.unlinkSync(filePath);
                reject(new Error('Downloaded file is empty'));
              }
            } else {
              console.log(`File does not exist after download`);
              reject(new Error('File not created after download'));
            }
          });
          
          file.on('error', (err) => {
            hasError = true;
            console.log(`File write error: ${err.message}`);
            cleanup();
            // Use safer file deletion
            if (fs.existsSync(filePath)) {
              fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.log(`Could not delete error file: ${unlinkErr.message}`);
              });
            }
            reject(err);
          });
          
        } else {
          hasError = true;
          cleanup();
          // Use safer file deletion
          if (fs.existsSync(filePath)) {
            fs.unlink(filePath, (err) => {
              if (err) console.log(`Could not delete error file: ${err.message}`);
            });
          }
          reject(new Error(`Failed to download image: ${response.statusCode}`));
        }
      }).on('error', (err) => {
        hasError = true;
        console.log(`Network error: ${err.message}`);
        cleanup();
        // Use safer file deletion
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) console.log(`Could not delete error file: ${unlinkErr.message}`);
          });
        }
        reject(err);
      });
    };
    
    makeRequest(url);
  });
}

async function downloadThumbnail(appId) {
  try {
    console.log(`Fetching Steam data for app ${appId}...`);
    const gameData = await fetchSteamGameData(appId);
    
    if (gameData.header_image) {
      console.log(`Downloading thumbnail from: ${gameData.header_image}`);
      const thumbnailPath = getThumbnailPath(appId);
      await downloadImage(gameData.header_image, thumbnailPath);
      return thumbnailPath;
    } else {
      throw new Error('No header image available');
    }
  } catch (error) {
    console.error(`Error downloading thumbnail for app ${appId}:`, error);
    throw error;
  }
}

async function getOrDownloadThumbnail(appId) {
  try {
    if (!isThumbnailCached(appId)) {
      await downloadThumbnail(appId);
    }
    return getThumbnailPath(appId);
  } catch (error) {
    console.error(`Error getting thumbnail for app ${appId}:`, error);
    return null;
  }
}

// Download cover image from Steam CDN or copy from local Steam library cache if available
async function downloadCoverImage(appId, localLibraryCacheDir) {
  try {
    const fileName = `${appId}_cover.jpg`;
    const imagePath = path.join(cacheDir, fileName);
    
    console.log(`Downloading cover image for app ${appId}`);
    console.log(`Cache directory: ${cacheDir}`);
    console.log(`Target file path: ${imagePath}`);
    console.log(`Local library cache directory: ${localLibraryCacheDir}`);
    
    // Check if already cached
    if (fs.existsSync(imagePath)) {
      console.log(`Cover image already cached for ${appId}`);
      return imagePath;
    }
    
    // Prefer local Steam library cache if provided
    try {
      if (localLibraryCacheDir && fs.existsSync(localLibraryCacheDir)) {
        // Common candidate filenames and nested lookup
        const localDir = path.join(localLibraryCacheDir, String(appId));
        console.log(`trying to download image from: ${localLibraryCacheDir}`);

        const candidateFileNames = [
          'library_600x900_2x.jpg',
          'library_600x900.jpg',
          'library_capsule.jpg'
        ];

        for (const fileName of candidateFileNames) {
          // Check directly under appid directory
          const directPath = path.join(localDir, fileName);
          if (fs.existsSync(directPath)) {
            try {
              fs.copyFileSync(directPath, imagePath);
              console.log(`Copied cover image from Steam cache: ${directPath} -> ${imagePath}`);
              return imagePath;
            } catch (copyErr) {
              console.log(`Failed to copy local cover image: ${copyErr.message}`);
            }
          }

          // Check immediate subdirectories for the same filename
          try {
            const entries = fs.readdirSync(localDir, { withFileTypes: true });
            for (const entry of entries) {
              if (entry.isDirectory()) {
                const nestedPath = path.join(localDir, entry.name, fileName);
                if (fs.existsSync(nestedPath)) {
                  try {
                    fs.copyFileSync(nestedPath, imagePath);
                    console.log(`Copied nested cover from Steam cache: ${nestedPath} -> ${imagePath}`);
                    return imagePath;
                  } catch (nestedErr) {
                    console.log(`Failed to copy nested cover image: ${nestedErr.message}`);
                  }
                }
              }
            }
          } catch (scanErr) {
            console.log(`Failed scanning subfolders for cover: ${scanErr.message}`);
          }
        }
      }
    } catch (localErr) {
      console.log(`Local library cache check failed: ${localErr.message}`);
      // continue to network downloads
    }



    
    // Try URLs in order of preference (2x first, then regular)
    const coverUrls = [
      `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900_2x.jpg`,
      `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900_2x.jpg`,
      `https://cdn.steamstatic.com/steam/apps/${appId}/library_600x900_2x.jpg`,
      `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
      `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
      `https://cdn.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`
    ];
    
    let lastError = null;
    
    for (const coverUrl of coverUrls) {
      let tempImagePath = null;
      
      try {
        console.log(`Trying cover image URL: ${coverUrl}`);
        
        // Use a temporary file name to avoid conflicts
        const tempFileName = `${appId}_cover_temp_${Date.now()}.jpg`;
        tempImagePath = path.join(cacheDir, tempFileName);
        console.log(`Temp file path: ${tempImagePath}`);
        
        await downloadImage(coverUrl, tempImagePath);
        
        // If download successful, rename to final name (always without 2x suffix)
        try {
          console.log(`Download successful, renaming temp file to final name`);
          // Remove existing file if it exists (with error handling)
          if (fs.existsSync(imagePath)) {
            try {
              fs.unlinkSync(imagePath);
              console.log(`Removed existing file: ${imagePath}`);
            } catch (unlinkError) {
              console.log(`Could not remove existing file ${imagePath}:`, unlinkError.message);
              // Continue anyway, the rename might still work
            }
          }
          
          // Rename temp file to final name (always without 2x suffix)
          fs.renameSync(tempImagePath, imagePath);
          console.log(`Cover image downloaded successfully: ${imagePath}`);
          
          // Verify final file exists
          if (fs.existsSync(imagePath)) {
            const stats = fs.statSync(imagePath);
            console.log(`Final file size: ${stats.size} bytes`);
            return imagePath;
          } else {
            console.log(`Final file does not exist after rename`);
            throw new Error('File not found after rename');
          }
        } catch (renameError) {
          console.log(`Could not rename temp file:`, renameError.message);
          // If rename fails, try to use the temp file
          if (fs.existsSync(tempImagePath)) {
            console.log(`Using temp file as cover image: ${tempImagePath}`);
            return tempImagePath;
          }
          throw renameError;
        }
        
      } catch (error) {
        console.log(`Failed to download from ${coverUrl}: ${error.message}`);
        lastError = error;
        
        // Clean up temp file if it exists (use the actual temp path)
        if (tempImagePath && fs.existsSync(tempImagePath)) {
          try {
            fs.unlinkSync(tempImagePath);
            console.log(`Cleaned up temp file: ${tempImagePath}`);
          } catch (cleanupError) {
            console.log(`Could not clean up temp file:`, cleanupError.message);
          }
        }
        
        continue; // Try next URL
      }
    }
    
    // If all URLs failed, return null instead of throwing
    console.log(`All cover image URLs failed for app ${appId}`);
    return null;
    
  } catch (error) {
    console.error(`Error downloading cover image for app ${appId}:`, error);
    return null;
  }
}

// Get or download cover image
async function getOrDownloadCoverImage(appId, localLibraryCacheDir) {
  try {
    const fileName = `${appId}_cover.jpg`;
    const imagePath = path.join(cacheDir, fileName);
    
    if (fs.existsSync(imagePath)) {
      console.log(`Cover image found in cache for ${appId}: ${imagePath}`);
      return imagePath;
    }
    
    console.log(`Cover image not cached for ${appId}, attempting download...`);
    const downloadedPath = await downloadCoverImage(appId, localLibraryCacheDir);
    
    if (downloadedPath) {
      console.log(`Successfully downloaded cover image for ${appId}: ${downloadedPath}`);
      return downloadedPath;
    } else {
      console.log(`Failed to download cover image for ${appId}, returning null`);
      return null;
    }
  } catch (error) {
    console.error(`Error getting cover image for app ${appId}:`, error);
    return null;
  }
}

// Enhanced metadata extraction with cover image
async function getGameMetadata(appId) {
  try {
    const gameData = await fetchSteamGameData(appId);    
    // Log genres extraction for debugging
    console.log(`[thumbnailManager] AppID ${appId} - Raw genres from API:`, gameData.genres);
    const extractedGenres = gameData.genres?.map(g => g.description) || [];
    console.log(`[thumbnailManager] AppID ${appId} - Extracted genres:`, extractedGenres);
    
    const metadata = {
      name: gameData.name,
      description: gameData.detailed_description,
      shortDescription: gameData.short_description,
      genres: extractedGenres,
      releaseDate: gameData.release_date?.date,
      developer: gameData.developers?.join(', '),
      publisher: gameData.publishers?.join(', '),
      headerImage: gameData.header_image,
      backgroundImage: gameData.background,
      coverImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900_2x.jpg`,
      metacritic: gameData.metacritic?.score,
      categories: gameData.categories?.map(c => c.description) || [],
      platforms: gameData.platforms || {},
      isFree: gameData.is_free,
      requiredAge: gameData.required_age,
      supportedLanguages: gameData.supported_languages,
      website: gameData.website,
      recommendations: gameData.recommendations?.total
    };
    
    // console.log(`Extracted metadata for ${appId}:`, metadata);
    return metadata;
  } catch (error) {
    console.error(`Error fetching metadata for app ${appId}:`, error);
    return null;
  }
}

module.exports = {
  getThumbnailPath,
  isThumbnailCached,
  downloadThumbnail,
  getOrDownloadThumbnail,
  downloadCoverImage,
  getOrDownloadCoverImage,
  getGameMetadata,
  fetchSteamGameData
};
