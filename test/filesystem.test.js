const fs = require('fs');
const path = require('path');
const os = require('os');

// Mock config agar tidak baca .sigma/config.json asli
jest.mock('../lib/config', () => ({
  loadConfig: () => ({
    max_lines_per_file: 10000,
    context_limit: 10
  })
}));

const {
  readFile, readMultipleFiles, writeFile,
  backupFile, findBackup, restoreBackup,
  parsePatches, applyPatch
} = require('../lib/filesystem');

// ─── parsePatches ─────────────────────────────────────

describe('parsePatches', () => {
  test('returns empty array for null/empty response', () => {
    expect(parsePatches(null)).toEqual([]);
    expect(parsePatches('')).toEqual([]);
    expect(parsePatches('   ')).toEqual([]);
  });

  test('parses single FIND/REPLACE block', () => {
    const response = 'FIND:foo\nREPLACE:bar';
    const patches = parsePatches(response);
    expect(patches).toEqual([{ find: 'foo', replace: 'bar' }]);
  });

  test('parses multiple FIND/REPLACE blocks', () => {
    const response = 'FIND:foo\nREPLACE:bar\n\nFIND:baz\nREPLACE:qux';
    const patches = parsePatches(response);
    expect(patches).toEqual([
      { find: 'foo', replace: 'bar' },
      { find: 'baz', replace: 'qux' }
    ]);
  });

  test('returns empty for NO_CHANGES', () => {
    expect(parsePatches('NO_CHANGES')).toEqual([]);
  });

  test('returns empty for "NO CHANGES" (with space)', () => {
    expect(parsePatches('NO CHANGES')).toEqual([]);
  });

  test('strips markdown fences without language', () => {
    const response = '```\nFIND:foo\nREPLACE:bar\n```';
    expect(parsePatches(response)).toEqual([{ find: 'foo', replace: 'bar' }]);
  });

  test('strips markdown fences with language tag', () => {
    const response = '```javascript\nFIND:foo\nREPLACE:bar\n```';
    expect(parsePatches(response)).toEqual([{ find: 'foo', replace: 'bar' }]);
  });

  test('skips when find === replace', () => {
    const response = 'FIND:foo\nREPLACE:foo';
    expect(parsePatches(response)).toEqual([]);
  });

  test('skips when find is empty', () => {
    const response = 'FIND:\nREPLACE:bar';
    expect(parsePatches(response)).toEqual([]);
  });

  test('handles multi-line find/replace', () => {
    const response = 'FIND:function hello() {\n  return 1;\n}\nREPLACE:function greet() {\n  return 1;\n}';
    const patches = parsePatches(response);
    expect(patches.length).toBe(1);
    expect(patches[0].find).toBe('function hello() {\n  return 1;\n}');
    expect(patches[0].replace).toBe('function greet() {\n  return 1;\n}');
  });

  test('trims text before first FIND', () => {
    const response = 'Here are the changes:\n\nFIND:foo\nREPLACE:bar';
    expect(parsePatches(response)).toEqual([{ find: 'foo', replace: 'bar' }]);
  });

  test('handles FIND/REPLACE with special characters', () => {
    const response = 'FIND:save()\nREPLACE:persist()';
    expect(parsePatches(response)).toEqual([{ find: 'save()', replace: 'persist()' }]);
  });

  test('handles FIND/REPLACE with inline values after colon', () => {
    const response = 'FIND:const count = 5\nREPLACE:const total = 5';
    const patches = parsePatches(response);
    expect(patches).toEqual([{ find: 'const count = 5', replace: 'const total = 5' }]);
  });
});

// ─── applyPatch ───────────────────────────────────────

describe('applyPatch', () => {
  test('applies single patch successfully', () => {
    const content = 'const foo = 1;';
    const patches = [{ find: 'foo', replace: 'bar' }];
    const { updatedContent, results } = applyPatch(content, patches);
    expect(updatedContent).toBe('const bar = 1;');
    expect(results[0].status).toBe('ok');
  });

  test('returns failed when text not found', () => {
    const content = 'const foo = 1;';
    const patches = [{ find: 'baz', replace: 'qux' }];
    const { results } = applyPatch(content, patches);
    expect(results[0].status).toBe('failed');
  });

  test('applies only first occurrence without --all', () => {
    const content = 'foo and foo and foo';
    const patches = [{ find: 'foo', replace: 'bar' }];
    const { updatedContent } = applyPatch(content, patches, { all: false });
    expect(updatedContent).toBe('bar and foo and foo');
  });

  test('applies all occurrences with --all', () => {
    const content = 'foo and foo and foo';
    const patches = [{ find: 'foo', replace: 'bar' }];
    const { updatedContent, results } = applyPatch(content, patches, { all: true });
    expect(updatedContent).toBe('bar and bar and bar');
    expect(results[0].status).toBe('ok');
    expect(results[0].message).toContain('3 kemunculan');
  });

  test('returns warning when multiple matches without --all', () => {
    const content = 'foo and foo and foo';
    const patches = [{ find: 'foo', replace: 'bar' }];
    const { results } = applyPatch(content, patches, { all: false });
    expect(results[0].status).toBe('warning');
    expect(results[0].message).toContain('3 kemunculan');
  });

  test('without --all, only first patch applied even with multiple patches', () => {
    const content = 'const a = 1;\nconst b = 2;';
    const patches = [
      { find: 'a = 1', replace: 'a = 10' },
      { find: 'b = 2', replace: 'b = 20' }
    ];
    const { updatedContent, results } = applyPatch(content, patches, { all: false });
    expect(updatedContent).toBe('const a = 10;\nconst b = 2;');
    expect(results.length).toBe(1);
  });

  test('with --all, all patches applied', () => {
    const content = 'const a = 1;\nconst b = 2;';
    const patches = [
      { find: 'a = 1', replace: 'a = 10' },
      { find: 'b = 2', replace: 'b = 20' }
    ];
    const { updatedContent, results } = applyPatch(content, patches, { all: true });
    expect(updatedContent).toBe('const a = 10;\nconst b = 20;');
    expect(results.length).toBe(2);
    expect(results[0].status).toBe('ok');
    expect(results[1].status).toBe('ok');
  });

  test('simple word replacement uses word boundary', () => {
    const content = 'const foo = 1; // foobar';
    const patches = [{ find: 'foo', replace: 'bar' }];
    const { updatedContent } = applyPatch(content, patches);
    expect(updatedContent).toBe('const bar = 1; // foobar');
  });

  test('mixed results: some patches ok, some failed', () => {
    const content = 'const foo = 1;';
    const patches = [
      { find: 'foo', replace: 'bar' },
      { find: 'nonexistent', replace: 'nothing' }
    ];
    const { updatedContent, results } = applyPatch(content, patches, { all: true });
    expect(results[0].status).toBe('ok');
    expect(results[1].status).toBe('failed');
    expect(updatedContent).toBe('const bar = 1;');
  });
});

// ─── readFile / writeFile ─────────────────────────────

describe('readFile / writeFile', () => {
  const tmpDir = path.join(os.tmpdir(), 'sigma-test-' + Date.now());

  beforeAll(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('readFile reads existing file and returns content + lines', () => {
    const filePath = path.join(tmpDir, 'test.txt');
    fs.writeFileSync(filePath, 'hello\nworld', 'utf-8');
    const result = readFile(filePath);
    expect(result.content).toBe('hello\nworld');
    expect(result.lines).toBe(2);
    expect(result.path).toBe(path.resolve(filePath));
  });

  test('readFile throws for non-existent file', () => {
    expect(() => readFile(path.join(tmpDir, 'nope.txt'))).toThrow('File tidak ditemukan');
  });

  test('writeFile writes content and returns absolute path', () => {
    const filePath = path.join(tmpDir, 'write-test.txt');
    const result = writeFile(filePath, 'new content');
    expect(result).toBe(path.resolve(filePath));
    expect(fs.readFileSync(filePath, 'utf-8')).toBe('new content');
  });
});

// ─── readMultipleFiles ────────────────────────────────

describe('readMultipleFiles', () => {
  const tmpDir = path.join(os.tmpdir(), 'sigma-multi-test-' + Date.now());

  beforeAll(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'a.txt'), 'aaa', 'utf-8');
    fs.writeFileSync(path.join(tmpDir, 'b.txt'), 'bbb', 'utf-8');
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('reads multiple files and returns array', () => {
    const results = readMultipleFiles([
      path.join(tmpDir, 'a.txt'),
      path.join(tmpDir, 'b.txt')
    ]);
    expect(results.length).toBe(2);
    expect(results[0].content).toBe('aaa');
    expect(results[1].content).toBe('bbb');
  });

  test('throws when exceeding context_limit', () => {
    const files = Array(15).fill(path.join(tmpDir, 'a.txt'));
    expect(() => readMultipleFiles(files)).toThrow('Terlalu banyak file');
  });
});

// ─── backup system ────────────────────────────────────

describe('backup system', () => {
  const tmpDir = path.join(os.tmpdir(), 'sigma-backup-test-' + Date.now());

  beforeAll(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('backupFile creates .sigma/backup/ and returns path', () => {
    const filePath = path.join(tmpDir, 'backup-me.txt');
    fs.writeFileSync(filePath, 'original', 'utf-8');

    const backupPath = backupFile(filePath);
    expect(backupPath).toBeTruthy();
    expect(backupPath).toContain('.sigma');
    expect(backupPath).toContain('.bak');
    expect(fs.readFileSync(backupPath, 'utf-8')).toBe('original');
  });

  test('backupFile returns null for non-existent file', () => {
    const result = backupFile(path.join(tmpDir, 'nope.txt'));
    expect(result).toBeNull();
  });

  test('findBackup returns latest backup', () => {
    const filePath = path.join(tmpDir, 'find-me.txt');
    fs.writeFileSync(filePath, 'content', 'utf-8');
    backupFile(filePath);
    const found = findBackup(filePath);
    expect(found).toBeTruthy();
    expect(found).toContain('.bak');
  });

  test('findBackup returns null when no backup exists', () => {
    const filePath = path.join(tmpDir, 'no-backup.txt');
    fs.writeFileSync(filePath, 'content', 'utf-8');
    const found = findBackup(filePath);
    expect(found).toBeNull();
  });

  test('restoreBackup restores content from backup', () => {
    const filePath = path.join(tmpDir, 'restore-me.txt');
    fs.writeFileSync(filePath, 'original', 'utf-8');
    backupFile(filePath);
    fs.writeFileSync(filePath, 'modified', 'utf-8');

    const restored = restoreBackup(filePath);
    expect(restored).toBeTruthy();
    expect(fs.readFileSync(filePath, 'utf-8')).toBe('original');
  });

  test('restoreBackup throws when no backup exists', () => {
    const filePath = path.join(tmpDir, 'no-restore.txt');
    fs.writeFileSync(filePath, 'content', 'utf-8');
    expect(() => restoreBackup(filePath)).toThrow('Tidak ada backup');
  });
});