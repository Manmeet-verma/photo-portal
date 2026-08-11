const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_FILE = path.join(DATA_DIR, 'db.json');

const EMPTY_DB = { users: [], events: [], counters: { user: 1, event: 1, photo: 1 } };

function load() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      return { ...EMPTY_DB, ...raw, counters: { ...EMPTY_DB.counters, ...(raw.counters || {}) } };
    }
  } catch (e) {
    console.error('DB load error, starting fresh:', e.message);
  }
  return JSON.parse(JSON.stringify(EMPTY_DB));
}

function save(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

const db = load();

function nextId(collection) {
  const id = db.counters[collection] || 1;
  db.counters[collection] = id + 1;
  save(db);
  return id;
}

function now() {
  return new Date().toISOString();
}

module.exports = { db, save, nextId, now };