const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function emptyState() {
  return {
    users: [],
    departments: [],
    transactions: [],
    nextIds: { users: 1, departments: 1, transactions: 1 },
  };
}

function load() {
  if (!fs.existsSync(DB_FILE)) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const state = emptyState();
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
    return state;
  }
  const raw = fs.readFileSync(DB_FILE, 'utf8');
  return JSON.parse(raw);
}

let state = load();

// Atomic-ish write: write to temp file then rename, so a crash mid-write
// never leaves db.json truncated/corrupted (this file is the church's books).
function save() {
  const tmpFile = DB_FILE + '.tmp';
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2));
  fs.renameSync(tmpFile, DB_FILE);
}

function nextId(collection) {
  const id = state.nextIds[collection];
  state.nextIds[collection] = id + 1;
  return id;
}

module.exports = {
  get state() {
    return state;
  },
  save,
  nextId,
  reload() {
    state = load();
  },
};
