const fs = require('fs');
const path = require('path');

const { getHistory, addToHistory, clearHistory } = require('../lib/history');

const HISTORY_PATH = path.join(process.cwd(), '.sigma', 'history.json');

let originalHistory = null;

beforeAll(() => {
  if (fs.existsSync(HISTORY_PATH)) {
    originalHistory = fs.readFileSync(HISTORY_PATH, 'utf-8');
  }
});

afterAll(() => {
  if (originalHistory !== null) {
    fs.writeFileSync(HISTORY_PATH, originalHistory, 'utf-8');
  } else if (fs.existsSync(HISTORY_PATH)) {
    fs.unlinkSync(HISTORY_PATH);
  }
});

describe('getHistory', () => {
  test('returns an array', () => {
    clearHistory();
    const history = getHistory();
    expect(Array.isArray(history)).toBe(true);
  });

  test('returns empty array after clear', () => {
    clearHistory();
    expect(getHistory()).toEqual([]);
  });
});

describe('addToHistory', () => {
  beforeEach(() => {
    clearHistory();
  });

  test('adds entry with role, content, and timestamp', () => {
    addToHistory('user', 'hello');
    const history = getHistory();
    expect(history.length).toBe(1);
    expect(history[0].role).toBe('user');
    expect(history[0].content).toBe('hello');
    expect(history[0].timestamp).toBeTruthy();
  });

  test('adds multiple entries in order', () => {
    addToHistory('user', 'first');
    addToHistory('assistant', 'second');
    addToHistory('user', 'third');
    const history = getHistory();
    expect(history.length).toBe(3);
    expect(history[0].content).toBe('first');
    expect(history[1].content).toBe('second');
    expect(history[2].content).toBe('third');
  });

  test('preserves roles correctly', () => {
    addToHistory('user', 'q');
    addToHistory('assistant', 'a');
    const history = getHistory();
    expect(history[0].role).toBe('user');
    expect(history[1].role).toBe('assistant');
  });
});

describe('clearHistory', () => {
  test('empties all history entries', () => {
    addToHistory('user', 'something');
    addToHistory('assistant', 'response');
    clearHistory();
    expect(getHistory()).toEqual([]);
  });
});