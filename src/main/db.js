const path = require('path');
const fs = require('fs-extra');
const sqlite3 = require('sqlite3').verbose();

const localAppData = process.env.LOCALAPPDATA || process.env.HOME;
const dbDir = path.join(localAppData, 'Gamelauncher');
const dbPath = path.join(dbDir, 'launcher.db');

let db = null;

function setupDB() {
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  db = new sqlite3.Database(dbPath);
  db.serialize(() => {
    // Create games table only if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      appid TEXT,
      name TEXT,
      path TEXT,
      type TEXT,
      thumbnail TEXT,
      description TEXT,
      shortDescription TEXT,
      genres TEXT,
      releaseDate TEXT,
      developer TEXT,
      publisher TEXT,
      metacritic INTEGER,
      categories TEXT,
      platforms TEXT,
      backgroundImage TEXT,
      headerImage TEXT,
      capsuleImage TEXT,
      capsuleImageV5 TEXT,
      backgroundRaw TEXT,
      coverImage TEXT,
      isFree BOOLEAN,
      requiredAge INTEGER,
      supportedLanguages TEXT,
      website TEXT,
      recommendations INTEGER,
      steamGridCover TEXT,
      steamGridHero TEXT,
      steamGridLogo TEXT,
      steamGridGameId TEXT,
      tags TEXT
    )`);

    // Create tags table
    db.run(`CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      color TEXT,
      isDefault BOOLEAN DEFAULT 0
    )`);

    // Insert default tags if they don't exist
    const defaultTags = [
      { id: 'backlog', name: 'Backlog', color: '#3B82F6', isDefault: 1 },
      { id: 'playing', name: 'Playing', color: '#10B981', isDefault: 1 },
      { id: 'complete', name: 'Complete', color: '#F59E0B', isDefault: 1 },
      { id: 'abandon', name: 'Abandon', color: '#EF4444', isDefault: 1 }
    ];

    defaultTags.forEach(tag => {
      db.run(`INSERT OR IGNORE INTO tags (id, name, color, isDefault) VALUES (?, ?, ?, ?)`,
        [tag.id, tag.name, tag.color, tag.isDefault]);
    });
  });
  module.exports.db = db;
}

function getDB() {
  return db;
}

module.exports = { setupDB, getDB };
