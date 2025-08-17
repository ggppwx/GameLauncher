const path = require('path');
const fs = require('fs-extra');
const { getConfig } = require('./config');

function getSteamPaths() {
  const paths = [];
  // Try to read config file for steamPath
  let configSteamPath = null;
  try {
    const config = getConfig();
    if (config.steamPath) {
      configSteamPath = config.steamPath;
    }
  } catch (e) {}
  if (configSteamPath) {
    paths.push(configSteamPath);
  }
  if (process.platform === 'win32') {
    const programFiles = process.env['ProgramFiles(x86)'] || process.env['ProgramFiles'];
    if (programFiles) {
      paths.push(path.join(programFiles, 'Steam'));
    }
  } else if (process.platform === 'darwin') {
    paths.push(path.join(process.env.HOME, 'Library', 'Application Support', 'Steam'));
  } else {
    paths.push(path.join(process.env.HOME, '.steam', 'steam'));
  }
  return paths;
}

async function parseLibraryFolders(libraryFoldersPath) {
  try {
    const content = await fs.readFile(libraryFoldersPath, 'utf8');
    const paths = [];
    const pathMatches = content.match(/"path"\s+"([^"]+)"/g);
    if (pathMatches) {
      for (const match of pathMatches) {
        const pathMatch = match.match(/"path"\s+"([^"]+)"/);
        if (pathMatch) {
          paths.push(pathMatch[1]);
        }
      }
    }
    return paths;
  } catch (error) {
    return [];
  }
}

async function parseAppManifest(acfPath) {
  try {
    const content = await fs.readFile(acfPath, 'utf8');
    const appIdMatch = content.match(/"appid"\s+"(\d+)"/);
    const nameMatch = content.match(/"name"\s+"([^"]+)"/);
    const installDirMatch = content.match(/"installdir"\s+"([^"]+)"/);
    if (appIdMatch && nameMatch && installDirMatch) {
      const appId = appIdMatch[1];
      const name = nameMatch[1];
      const installDir = installDirMatch[1];
      const gamePath = path.dirname(acfPath);
      const gameDir = path.join(gamePath, 'common', installDir);
      if (await fs.pathExists(gameDir)) {
        const exeFiles = await findExecutables(gameDir);
        return {
          id: appId,
          name: name,
          path: gameDir,
          executable: exeFiles[0] || null,
          type: 'steam',
        };
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function findExecutables(dir) {
  try {
    const files = await fs.readdir(dir);
    const exeFiles = [];
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        const ext = path.extname(file).toLowerCase();
        if (ext === '.exe' || ext === '.app' || ext === '') {
          exeFiles.push(filePath);
        }
      } else if (stat.isDirectory()) {
        const subExeFiles = await findExecutables(filePath);
        exeFiles.push(...subExeFiles);
      }
    }
    return exeFiles;
  } catch (error) {
    return [];
  }
}

module.exports = { getSteamPaths, parseLibraryFolders, parseAppManifest, findExecutables };
