const fs = require('fs');
const path = require('path');
const { loadConfig } = require('./config');

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const LOG_DIR = path.join(process.cwd(), '.sigma');
const LOG_FILE = path.join(LOG_DIR, 'sigma.log');

function getLevel() {
  try {
    const config = loadConfig();
    return config.log_level || 'info';
  } catch {
    return 'info';
  }
}

function shouldLog(level) {
  const current = getLevel();
  return (LEVELS[level] ?? 0) >= (LEVELS[current] ?? 1);
}

function write(level, message) {
  if (!shouldLog(level)) return;

  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, line);
}

function debug(msg) { write('debug', msg); }
function info(msg)  { write('info', msg); }
function warn(msg)  { write('warn', msg); }
function error(msg) { write('error', msg); }

module.exports = { debug, info, warn, error, write, getLevel, LOG_FILE };