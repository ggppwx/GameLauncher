const fs = require('fs-extra');
const path = require('path');

class ConfigService {
  constructor() {
    this.configPath = this.getConfigPath();
    this.config = this.loadConfig();
  }

  getConfigPath() {
    const appData = process.env.APPDATA || process.env.HOME;
    const configDir = path.join(appData, 'Gamelauncher');
    return path.join(configDir, 'config.json');
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(configData);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
    
    // Return default config
    return {
      steamPath: null,
      theme: 'light',
      language: 'en'
    };
  }

  async getConfig() {
    return this.config;
  }

  async setConfig(newConfig) {
    try {
      // Ensure config directory exists
      const configDir = path.dirname(this.configPath);
      await fs.ensureDir(configDir);
      
      // Merge with existing config
      this.config = { ...this.config, ...newConfig };
      
      // Save to file
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
      
      return { success: true };
    } catch (error) {
      console.error('Error saving config:', error);
      throw error;
    }
  }

  async updateConfig(updates) {
    return this.setConfig(updates);
  }

  getSteamPath() {
    return this.config.steamPath;
  }

  setSteamPath(steamPath) {
    return this.setConfig({ steamPath });
  }
}

module.exports = ConfigService;
