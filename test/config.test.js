const fs = require('fs');
const path = require('path');

const { loadConfig, getConfig, setConfig, initConfig } = require('../lib/config');

const CONFIG_DIR = path.join(process.cwd(), '.sigma');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

let originalConfig = null;

beforeAll(() => {
  if (fs.existsSync(CONFIG_PATH)) {
    originalConfig = fs.readFileSync(CONFIG_PATH, 'utf-8');
  }
});

afterAll(() => {
  if (originalConfig !== null) {
    fs.writeFileSync(CONFIG_PATH, originalConfig, 'utf-8');
  } else if (fs.existsSync(CONFIG_PATH)) {
    fs.unlinkSync(CONFIG_PATH);
  }
});

describe('loadConfig', () => {
  test('returns config object with expected keys', () => {
    const config = loadConfig();
    expect(config).toHaveProperty('mode');
    expect(config).toHaveProperty('model');
    expect(config).toHaveProperty('base_url');
    expect(config).toHaveProperty('context_limit');
    expect(config).toHaveProperty('max_lines_per_file');
  });

  test('returns default config when file is corrupted', () => {
    fs.writeFileSync(CONFIG_PATH, 'invalid json{{{', 'utf-8');
    const config = loadConfig();
    expect(config).toHaveProperty('mode');
    expect(config).toHaveProperty('model');
  });
});

describe('getConfig', () => {
  test('returns full config when no key provided', () => {
    const config = getConfig();
    expect(config).toHaveProperty('model');
    expect(config).toHaveProperty('base_url');
  });

  test('returns specific value for key', () => {
    setConfig('model', 'test-model');
    expect(getConfig('model')).toBe('test-model');
  });
});

describe('setConfig', () => {
  test('saves value to config file', () => {
    setConfig('model', 'my-model');
    const config = loadConfig();
    expect(config.model).toBe('my-model');
  });

  test('persists across multiple loads', () => {
    setConfig('context_limit', 5);
    const config1 = loadConfig();
    const config2 = loadConfig();
    expect(config1.context_limit).toBe(5);
    expect(config2.context_limit).toBe(5);
  });
});

describe('initConfig', () => {
  test('creates .sigma directory and config.json if missing', () => {
    initConfig();
    expect(fs.existsSync(CONFIG_DIR)).toBe(true);
    expect(fs.existsSync(CONFIG_PATH)).toBe(true);
  });
});