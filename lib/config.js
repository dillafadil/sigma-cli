const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(process.cwd(), '.sigma');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG = {
  mode: 'local',
  model: 'qwen2.5:3b',
  base_url: 'http://localhost:11434',
  context_limit: 3,
  max_lines_per_file: 100,
  log_level: 'info'
};

function initConfig() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
  }
}

function loadConfig() {
  initConfig();
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(config) {
  initConfig();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function getConfig(key) {
  const config = loadConfig();
  return key ? config[key] : config;
}

function setConfig(key, value) {
  const config = loadConfig();
  config[key] = value;
  saveConfig(config);
}

module.exports = { loadConfig, getConfig, setConfig, initConfig };