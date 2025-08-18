const fs = require('fs-extra');
const path = require('path');

/**
 * Find the game executable from a Steam manifest file
 * @param {string} manifestPath - Path to the appmanifest file
 * @returns {string|null} - The executable name or null if not found
 */
function findGameExecutable(manifestPath) {
  try {
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    
    // Extract AppID and installdir from manifest
    const appIdMatch = manifestContent.match(/"appid"\s+"(\d+)"/);
    const installdirMatch = manifestContent.match(/"installdir"\s+"([^"]+)"/);
    
    if (!appIdMatch) {
      console.log('No AppID found in manifest');
      return null;
    }
    
         const appId = appIdMatch[1];
     const installdir = installdirMatch ? installdirMatch[1] : null;
     const manifestDir = path.dirname(manifestPath);
     
     console.log(`Manifest path: ${manifestPath}`);
     console.log(`Manifest directory: ${manifestDir}`);
     console.log(`AppID: ${appId}`);
     console.log(`Install directory: ${installdir}`);
    
    // Use the installdir from manifest to find the game directory
    let gameDir = null;
    
              if (installdir) {
       // Try to find the game directory using installdir
       // For Steam library structure: G:\SteamLibrary\steamapps\common\<installdir>\
       const possibleGameDirs = [
         path.join(manifestDir,  'common', installdir),  // steamapps/common/<installdir>
         path.join(manifestDir, '..', 'common', installdir),  // fallback
         path.join(manifestDir, '..', installdir)  // another fallback
       ];
       
       console.log(`Manifest directory: ${manifestDir}`);
       console.log(`Looking for game directory with installdir: ${installdir}`);
       
       for (let i = 0; i < possibleGameDirs.length; i++) {
         const dir = possibleGameDirs[i];
         console.log(`Checking directory ${i + 1}: ${dir}`);
         console.log(`  - Resolved path: ${path.resolve(dir)}`);
         if (fs.existsSync(dir)) {
           gameDir = dir;
           console.log(`Found game directory: ${gameDir}`);
           break;
         } else {
           console.log(`  - Directory does not exist`);
         }
       }
     }
    
    if (!gameDir) {
      console.log(`Game directory not found using installdir`);
      return null;
    }
    
    console.log(`Looking for executables in: ${gameDir}`);
    
    // Get all .exe files in the game directory
    const exeFiles = fs.readdirSync(gameDir, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.exe'))
      .map(dirent => dirent.name)
      .filter(file => 
        !file.toLowerCase().includes('unins') &&
        !file.toLowerCase().includes('install') &&
        !file.toLowerCase().includes('launcher') &&
        !file.toLowerCase().includes('setup') &&
        !file.toLowerCase().includes('crash') &&
        !file.toLowerCase().includes('debug')
      );
    
    if (exeFiles.length === 0) {
      console.log(`No executables found in ${gameDir}`);
      return null;
    }
    
    console.log(`Found executables: ${exeFiles.join(', ')}`);
    
    // Try to find the main game executable
    // Priority: 1. Same name as directory, 2. Most common game names, 3. First executable
    const gameName = path.basename(gameDir).replace('app_', '');
    
    // Look for executable with same name as game
    const mainExe = exeFiles.find(exe => 
      exe.toLowerCase().replace('.exe', '') === gameName.toLowerCase()
    );
    
    if (mainExe) {
      console.log(`Found main executable: ${mainExe}`);
      return mainExe;
    }
    
    // Look for common game executable names
    const commonNames = ['game', 'main', 'start', 'play'];
    for (const name of commonNames) {
      const commonExe = exeFiles.find(exe => 
        exe.toLowerCase().includes(name)
      );
      if (commonExe) {
        console.log(`Found common executable: ${commonExe}`);
        return commonExe;
      }
    }
    
    // Return the first executable as fallback
    console.log(`Using fallback executable: ${exeFiles[0]}`);
    return exeFiles[0];
    
  } catch (error) {
    console.error('Error finding game executable:', error);
    return null;
  }
}

/**
 * Extract process information from a Steam manifest
 * @param {string} manifestPath - Path to the appmanifest file
 * @returns {string|null} - The executable name or null if not found
 */
function extractProcessFromManifest(manifestPath) {
  const executable = findGameExecutable(manifestPath);
  console.log(`Extracting process from manifest: ${manifestPath}`);
  console.log(`Found executable: ${executable}`);
  
  if (executable) {
    // Return the full executable name (with .exe) for process monitoring
    console.log(`Returning executable: ${executable}`);
    return executable;
  }
  
  console.log(`No executable found in manifest: ${manifestPath}`);
  return null;
}

module.exports = {
  findGameExecutable,
  extractProcessFromManifest
};
