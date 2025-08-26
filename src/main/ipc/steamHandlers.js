const { ipcMain, shell, BrowserWindow, session } = require('electron');
const path = require('path');

function setupSteamHandlers(configService) {
  // Open external URL (for Steam URLs)
  ipcMain.handle('open-external', async (event, url) => {
    try {
      console.log('Opening external URL:', url);
      
      // Special handling for Steam URLs
      if (url.startsWith('steam://')) {
        console.log('Detected Steam URL, attempting to launch...');
        
        // Extract appid from URL (supports both steam://rungameid/ and steam://run/)
        const appIdMatch = url.match(/steam:\/\/(?:rungameid|run)\/(\d+)/);
        if (appIdMatch) {
          const appId = appIdMatch[1];
          console.log('Extracted appid:', appId);
          
          // Try to launch Steam directly with appid
          try {
            const { spawn } = require('child_process');
            const config = await configService.getConfig();
            const steamPath = config.steamPath;
            
            if (steamPath) {
              const steamExe = path.join(steamPath, 'Steam.exe');
              console.log('Trying to launch Steam directly:', steamExe, 'with appid:', appId);
              
              spawn(steamExe, [`-applaunch`, appId], { 
                detached: true,
                stdio: 'ignore'
              });
              
              console.log('Successfully launched Steam with appid:', appId);
              return { success: true };
            }
          } catch (steamError) {
            console.log('Failed to launch Steam directly:', steamError.message);
          }
        }
        
        // Try different Steam URI formats as fallback
        const steamUrls = [
          url,
          url.replace('steam://run/', 'steam://rungameid/'),
          url.replace('steam://rungameid/', 'steam://run/')
        ];
        
        for (const steamUrl of steamUrls) {
          try {
            console.log('Trying Steam URL:', steamUrl);
            await shell.openExternal(steamUrl);
            console.log('Successfully opened Steam URL:', steamUrl);
            return { success: true };
          } catch (steamError) {
            console.log('Failed to open Steam URL:', steamUrl, steamError.message);
            continue;
          }
        }
        
        // If all Steam URLs failed, throw error
        throw new Error('All Steam URL formats failed');
      }
      
      // Regular external URL handling
      await shell.openExternal(url);
      console.log('Successfully opened external URL:', url);
      return { success: true };
    } catch (error) {
      console.error('Error opening external URL:', url, error);
      return { success: false, error: error.message };
    }
  });

  // Select game folder
  ipcMain.handle('select-game-folder', async (event) => {
    const dialog = require('electron').dialog;
    const mainWindow = require('electron').BrowserWindow.getAllWindows()[0];
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Game Folder'
    });
    if (!result.canceled) {
      return result.filePaths[0];
    }
    return null;
  });

  // Web login to obtain Steam Web API key
  ipcMain.handle('steam-web-login', async () => {
    return new Promise(async (resolve, reject) => {
      try {
        const loginWin = new BrowserWindow({
          width: 900,
          height: 700,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            partition: 'persist:steam-login'
          }
        });

        let completed = false;
        let pollInterval = null;
        let stopTimeout = null;

        const cleanup = () => {
          if (pollInterval) { try { clearInterval(pollInterval); } catch (_) {} pollInterval = null; }
          if (stopTimeout) { try { clearTimeout(stopTimeout); } catch (_) {} stopTimeout = null; }
          try {
            loginWin.webContents.removeListener('did-finish-load', onNav);
            loginWin.webContents.removeListener('did-navigate', onNav);
            loginWin.webContents.removeListener('did-navigate-in-page', onNav);
          } catch (_) {}
        };

        const finish = async (result) => {
          if (completed) return;
          completed = true;
          try {
            if (result && result.key) {
              const updates = { steamApiKey: result.key };
              if (result.steamId) updates.steamUserId = result.steamId;
              if (result.persona) updates.steamPersonaName = result.persona;
              await configService.updateConfig(updates);
            }
          } catch (_) {}
          cleanup();
          try { loginWin.close(); } catch (_) {}
          resolve({ success: !!(result && result.key), ...result });
        };

        loginWin.on('closed', () => {
          if (!completed) {
            cleanup();
            resolve({ success: false, error: 'Window closed' });
          }
        });

        const tryExtract = async () => {
          try {
            const result = await loginWin.webContents.executeJavaScript(`(function(){
              function getText() {
                try { return document.documentElement.innerText || document.body.innerText || ''; } catch(e) { return ''; }
              }
              const text = getText();
              // Match 32 hex chars after 'Key:' or standalone 32-hex on the page
              let key = null;
              let m = text.match(/Key\s*:\s*([0-9A-Fa-f]{32})/);
              if (m && m[1]) key = m[1];
              if (!key) {
                const anyHex = text.match(/\b[0-9A-Fa-f]{32}\b/);
                if (anyHex) key = anyHex[0];
              }
              // Try DOM specific nodes
              if (!key) {
                const candidates = Array.from(document.querySelectorAll('p, code, pre, #bodyContents_ex, #mainContents'));
                for (const el of candidates) {
                  const t = (el.innerText||'').trim();
                  const mm = t.match(/Key\s*:\s*([0-9A-Fa-f]{32})/);
                  if (mm && mm[1]) { key = mm[1]; break; }
                }
              }
              // SteamID64 from globals or profile link
              let steamId = null; let persona = null;
              try{steamId = (window.g_steamID || null);}catch(e){}
              try{persona = (window.g_steamNickname || null);}catch(e){}
              if (!steamId) {
                const a = document.querySelector("a[href*='steamcommunity.com/profiles/']");
                if (a && a.href) {
                  const mm = a.href.match(/profiles\/(\d{17})/);
                  if (mm) steamId = mm[1];
                }
              }
              if (!persona) {
                const og = document.querySelector('meta[property="og:title"]');
                if (og && og.content) persona = og.content;
              }
              return { key, steamId, persona, url: location.href };
            })()`);
            if (result && result.key) {
              await finish(result);
              return true;
            }
          } catch (_) {}
          return false;
        };

        const onNav = async () => { await tryExtract(); };

        loginWin.webContents.on('did-finish-load', onNav);
        loginWin.webContents.on('did-navigate', onNav);
        loginWin.webContents.on('did-navigate-in-page', onNav);

        // Start at login page that redirects to API key page after login
        await loginWin.loadURL('https://steamcommunity.com/login/home/?goto=dev%2Fapikey');
        loginWin.show();

        // Start polling to capture when Steam renders the key, just in case events are missed
        pollInterval = setInterval(tryExtract, 600);
        // Safety timeout to avoid hanging window forever
        stopTimeout = setTimeout(() => {
          if (!completed) {
            cleanup();
            resolve({ success: false, error: 'Timed out waiting for API key' });
            try { loginWin.close(); } catch (_) {}
          }
        }, 60000);
      } catch (err) {
        reject(err);
      }
    });
  });

  // Clear saved login (remove key from config and clear cookies)
  ipcMain.handle('steam-web-logout', async () => {
    try {
      await configService.updateConfig({ steamApiKey: null, steamPersonaName: null });
      const sess = session.fromPartition('persist:steam-login');
      await sess.clearStorageData({ storages: ['cookies', 'localstorage', 'indexdb', 'serviceworkers'] });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { setupSteamHandlers };
