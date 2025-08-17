const path = require('path');
const fs = require('fs-extra');

const configDir = path.join(process.env.APPDATA, 'Gamelauncher');
const configPath = path.join(configDir, 'config.json');

function getConfigPath() {
  return configPath;
}

function getConfig() {
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
  if (!fs.existsSync(configPath)) fs.writeJsonSync(configPath, {});
  return fs.readJsonSync(configPath);
}

function setConfig(newConfig) {
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
  fs.writeJsonSync(configPath, newConfig, { spaces: 2 });
}

module.exports = { getConfig, setConfig, getConfigPath };
