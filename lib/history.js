const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(process.cwd(), '.sigma');
const HISTORY_PATH = path.join(CONFIG_DIR, 'history.json');

function ensureHistoryFile() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  if (!fs.existsSync(HISTORY_PATH)) {
    fs.writeFileSync(HISTORY_PATH, JSON.stringify([], null, 2));
  }
}

function getHistory() {
  ensureHistoryFile();
  try {
    return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function addToHistory(role, content) {
  const history = getHistory();
  history.push({
    role,
    content,
    timestamp: new Date().toISOString()
  });
  ensureHistoryFile();
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

function clearHistory() {
  ensureHistoryFile();
  fs.writeFileSync(HISTORY_PATH, JSON.stringify([], null, 2));
}

module.exports = { getHistory, addToHistory, clearHistory };