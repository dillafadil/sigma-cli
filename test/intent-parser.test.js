const { parseIntent } = require('../lib/intent-parser');

// Mock Ollama untuk test
jest.mock('../lib/ollama', () => ({
  chat: jest.fn().mockResolvedValue('CHAT')
}));

jest.mock('../lib/logger', () => ({
  debug: jest.fn(),
  warn: jest.fn()
}));

describe('parseIntent', () => {
  describe('REVIEW intent', () => {
    test('matches "review app.js"', async () => {
      const result = await parseIntent('review app.js');
      expect(result.intent).toBe('REVIEW');
      expect(result.file).toBe('app.js');
    });

    test('matches "review file.js performance"', async () => {
      const result = await parseIntent('review file.js performance');
      expect(result.intent).toBe('REVIEW');
      expect(result.file).toBe('file.js');
      expect(result.focus).toBe('performance');
    });
  });

  describe('EDIT intent', () => {
    test('matches "ganti foo jadi bar"', async () => {
      const result = await parseIntent('ganti foo jadi bar');
      expect(result.intent).toBe('EDIT');
      expect(result.find).toBe('foo');
      expect(result.replace).toBe('bar');
    });

    test('matches "ubah x to y"', async () => {
      const result = await parseIntent('ubah x to y');
      expect(result.intent).toBe('EDIT');
      expect(result.find).toBe('x');
      expect(result.replace).toBe('y');
    });
  });

  describe('EXPLAIN intent', () => {
    test('matches "jelaskan app.js"', async () => {
      const result = await parseIntent('jelaskan app.js');
      expect(result.intent).toBe('EXPLAIN');
      expect(result.file).toBe('app.js');
    });

    test('matches "explain utils.js"', async () => {
      const result = await parseIntent('explain utils.js');
      expect(result.intent).toBe('EXPLAIN');
      expect(result.file).toBe('utils.js');
    });
  });

  describe('FIX intent', () => {
    test('matches "fix app.js"', async () => {
      const result = await parseIntent('fix app.js');
      expect(result.intent).toBe('FIX');
      expect(result.file).toBe('app.js');
    });

    test('matches "perbaiki helper.js"', async () => {
      const result = await parseIntent('perbaiki helper.js');
      expect(result.intent).toBe('FIX');
      expect(result.file).toBe('helper.js');
    });
  });

  describe('UNDO intent', () => {
    test('matches "undo app.js"', async () => {
      const result = await parseIntent('undo app.js');
      expect(result.intent).toBe('UNDO');
      expect(result.file).toBe('app.js');
    });

    test('matches "kembalikan file.js"', async () => {
      const result = await parseIntent('kembalikan file.js');
      expect(result.intent).toBe('UNDO');
      expect(result.file).toBe('file.js');
    });
  });

  describe('READ intent', () => {
    test('matches "read app.js"', async () => {
      const result = await parseIntent('read app.js');
      expect(result.intent).toBe('READ');
      expect(result.file).toBe('app.js');
    });

    test('matches "baca utils.js"', async () => {
      const result = await parseIntent('baca utils.js');
      expect(result.intent).toBe('READ');
      expect(result.file).toBe('utils.js');
    });
  });

  describe('HISTORY intent', () => {
    test('matches "history"', async () => {
      const result = await parseIntent('history');
      expect(result.intent).toBe('HISTORY');
      expect(result.action).toBe('list');
    });

    test('matches "history clear"', async () => {
      const result = await parseIntent('history clear');
      expect(result.intent).toBe('HISTORY');
      expect(result.action).toBe('clear');
    });
  });

  describe('CONFIG intent', () => {
    test('matches "config get model"', async () => {
      const result = await parseIntent('config get model');
      expect(result.intent).toBe('CONFIG');
      expect(result.action).toBe('get');
      expect(result.key).toBe('model');
    });

    test('matches "config set model qwen"', async () => {
      const result = await parseIntent('config set model qwen');
      expect(result.intent).toBe('CONFIG');
      expect(result.action).toBe('set');
      expect(result.key).toBe('model');
      expect(result.value).toBe('qwen');
    });
  });

  describe('EXIT intent', () => {
    test('matches "exit"', async () => {
      const result = await parseIntent('exit');
      expect(result.intent).toBe('EXIT');
    });

    test('matches "quit"', async () => {
      const result = await parseIntent('quit');
      expect(result.intent).toBe('EXIT');
    });

    test('matches "keluar"', async () => {
      const result = await parseIntent('keluar');
      expect(result.intent).toBe('EXIT');
    });
  });

  describe('CHAT fallback', () => {
    test('treats unmatched input as CHAT', async () => {
      const result = await parseIntent('selamat malam');
      expect(result.intent).toBe('CHAT');
      expect(result.text).toBe('selamat malam');
    });

    test('handles empty input', async () => {
      const result = await parseIntent('');
      expect(result).toBeNull();
    });

    test('handles null input', async () => {
      const result = await parseIntent(null);
      expect(result).toBeNull();
    });
  });
});
