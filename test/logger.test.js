const fs = require('fs');
const path = require('path');
const os = require('os');

// Mock config dengan log_level yang bisa diubah
const mockConfig = { log_level: 'debug' };
jest.mock('../lib/config', () => ({
  loadConfig: () => mockConfig
}));

const { debug, info, warn, error, write, getLevel, LOG_FILE } = require('../lib/logger');

const tmpLogPath = path.join(os.tmpdir(), `sigma-test-log-${Date.now()}.log`);

// Override LOG_FILE untuk test — kita pakai write() langsung dengan path custom
// Tapi karena LOG_FILE di-hardcode, kita buat test yang baca file di .sigma/sigma.log

// Sebagai gantinya, kita test dengan memonitor fs.appendFileSync
let appendedLines = [];

jest.spyOn(fs, 'appendFileSync').mockImplementation((filePath, data) => {
  appendedLines.push({ filePath, data });
});

jest.spyOn(fs, 'existsSync').mockReturnValue(true);

beforeEach(() => {
  appendedLines = [];
  mockConfig.log_level = 'debug';
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('logger', () => {
  describe('getLevel', () => {
    test('returns level from config', () => {
      mockConfig.log_level = 'warn';
      expect(getLevel()).toBe('warn');
    });

    test('defaults to info when not set', () => {
      delete mockConfig.log_level;
      expect(getLevel()).toBe('info');
    });
  });

  describe('log levels', () => {
    test('debug writes when level is debug', () => {
      mockConfig.log_level = 'debug';
      debug('test debug msg');
      expect(appendedLines.length).toBe(1);
      expect(appendedLines[0].data).toContain('[DEBUG]');
      expect(appendedLines[0].data).toContain('test debug msg');
    });

    test('debug skipped when level is info', () => {
      mockConfig.log_level = 'info';
      debug('should not appear');
      expect(appendedLines.length).toBe(0);
    });

    test('info writes when level is info', () => {
      mockConfig.log_level = 'info';
      info('test info msg');
      expect(appendedLines.length).toBe(1);
      expect(appendedLines[0].data).toContain('[INFO]');
    });

    test('info skipped when level is warn', () => {
      mockConfig.log_level = 'warn';
      info('should not appear');
      expect(appendedLines.length).toBe(0);
    });

    test('warn writes when level is warn', () => {
      mockConfig.log_level = 'warn';
      warn('test warn msg');
      expect(appendedLines.length).toBe(1);
      expect(appendedLines[0].data).toContain('[WARN]');
    });

    test('warn skipped when level is error', () => {
      mockConfig.log_level = 'error';
      warn('should not appear');
      expect(appendedLines.length).toBe(0);
    });

    test('error always writes', () => {
      mockConfig.log_level = 'error';
      error('test error msg');
      expect(appendedLines.length).toBe(1);
      expect(appendedLines[0].data).toContain('[ERROR]');
    });

    test('error writes even at lowest config', () => {
      mockConfig.log_level = 'debug';
      error('error at debug level');
      expect(appendedLines.length).toBe(1);
    });
  });

  describe('log format', () => {
    test('includes ISO timestamp', () => {
      info('format test');
      const line = appendedLines[0].data;
      // Format: [2026-04-15T12:00:00.000Z] [INFO] format test\n
      const match = line.match(/^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\]/);
      expect(match).toBeTruthy();
    });

    test('ends with newline', () => {
      info('newline test');
      expect(appendedLines[0].data.endsWith('\n')).toBe(true);
    });
  });

  describe('level hierarchy', () => {
    test('debug level logs all levels', () => {
      mockConfig.log_level = 'debug';
      debug('d');
      info('i');
      warn('w');
      error('e');
      expect(appendedLines.length).toBe(4);
    });

    test('info level logs info, warn, error', () => {
      mockConfig.log_level = 'info';
      debug('d');
      info('i');
      warn('w');
      error('e');
      expect(appendedLines.length).toBe(3);
    });

    test('warn level logs warn and error', () => {
      mockConfig.log_level = 'warn';
      debug('d');
      info('i');
      warn('w');
      error('e');
      expect(appendedLines.length).toBe(2);
    });

    test('error level logs only error', () => {
      mockConfig.log_level = 'error';
      debug('d');
      info('i');
      warn('w');
      error('e');
      expect(appendedLines.length).toBe(1);
    });
  });
});