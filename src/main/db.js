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
      process TEXT,
      overrideProcess TEXT,
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
      tags TEXT,
      playtime INTEGER,
      timeLastPlay INTEGER
    )`);

    // Schema migrations: add columns if they don't exist
    db.all(`PRAGMA table_info(games)`, (err, rows) => {
      if (err) return;
      const cols = new Set(rows.map(r => r.name));
      if (!cols.has('playtime')) {
        db.run(`ALTER TABLE games ADD COLUMN playtime INTEGER`);
      }
      if (!cols.has('timeLastPlay')) {
        db.run(`ALTER TABLE games ADD COLUMN timeLastPlay INTEGER`);
      }
      if (!cols.has('overrideProcess')) {
        db.run(`ALTER TABLE games ADD COLUMN overrideProcess TEXT`);
      }
    });

    // Create game_sessions table
    db.run(`CREATE TABLE IF NOT EXISTS game_sessions (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      game_name TEXT NOT NULL,
      session_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      game_time INTEGER,
      FOREIGN KEY (game_id) REFERENCES games (id)
    )`);

  });
  module.exports.db = db;
}

function getDB() {
  return db;
}

module.exports = { setupDB, getDB };
