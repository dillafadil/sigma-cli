const fs = require('fs');
const path = require('path');
const { loadConfig } = require('./config');

function readFile(filePath) {
  const config = loadConfig();
  const absPath = path.resolve(filePath);

  if (!fs.existsSync(absPath)) {
    throw new Error(`File tidak ditemukan: ${absPath}`);
  }

  const lines = fs.readFileSync(absPath, 'utf-8').split('\n');

  if (lines.length > config.max_lines_per_file) {
    throw new Error(
      `File terlalu panjang. Max ${config.max_lines_per_file} baris. File ini ${lines.length} baris.`
    );
  }

  return {
    path: absPath,
    content: lines.join('\n'),
    lines: lines.length
  };
}

function readMultipleFiles(filePaths) {
  const config = loadConfig();

  if (filePaths.length > config.context_limit) {
    throw new Error(
      `Terlalu banyak file. Max ${config.context_limit} file sekaligus.`
    );
  }

  return filePaths.map((filePath) => readFile(filePath));
}

function writeFile(filePath, content) {
  const absPath = path.resolve(filePath);
  fs.writeFileSync(absPath, content, 'utf-8');
  return absPath;
}

function backupFile(filePath) {
  const absPath = path.resolve(filePath);

  if (!fs.existsSync(absPath)) {
    return null;
  }

  const backupDir = path.join(path.dirname(absPath), '.sigma', 'backup');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const now = new Date();
  const timestamp = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    '-' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');

  const basename = path.basename(absPath);
  const backupName = `${basename}.${timestamp}.bak`;
  const backupPath = path.join(backupDir, backupName);

  const content = fs.readFileSync(absPath, 'utf-8');
  fs.writeFileSync(backupPath, content, 'utf-8');

  return backupPath;
}

function findBackup(filePath) {
  const absPath = path.resolve(filePath);
  const backupDir = path.join(path.dirname(absPath), '.sigma', 'backup');

  if (!fs.existsSync(backupDir)) {
    return null;
  }

  const basename = path.basename(absPath);
  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith(basename + '.') && f.endsWith('.bak'))
    .sort()
    .reverse();

  if (files.length === 0) {
    return null;
  }

  return path.join(backupDir, files[0]);
}

function restoreBackup(filePath) {
  const backupPath = findBackup(filePath);

  if (!backupPath) {
    throw new Error('Tidak ada backup untuk file ini.');
  }

  const absPath = path.resolve(filePath);
  const content = fs.readFileSync(backupPath, 'utf-8');
  fs.writeFileSync(absPath, content, 'utf-8');

  return backupPath;
}

function parsePatches(response) {
  const patches = [];

  if (!response || response.trim() === '') {
    return patches;
  }

  let cleaned = response
    .replace(/```[\w]*\n?/g, '')
    .replace(/```/g, '')
    .trim();

  const firstFind = cleaned.search(/^FIND:/im);
  if (firstFind > 0) {
    cleaned = cleaned.substring(firstFind);
  }

  const lines = cleaned.split('\n');

  let mode    = null;
  let findBuf = [];
  let repBuf  = [];

  function flush() {
    const find    = findBuf.join('\n').trim();
    const replace = repBuf.join('\n').trim();

    if (find === replace) {
      findBuf = [];
      repBuf  = [];
      mode    = null;
      return;
    }

    if (replace.toUpperCase().startsWith('NO_CHANGES') ||
        replace.toUpperCase().startsWith('NO CHANGES')) {
      findBuf = [];
      repBuf  = [];
      mode    = null;
      return;
    }

    if (find === '') {
      findBuf = [];
      repBuf  = [];
      mode    = null;
      return;
    }

    patches.push({ find, replace });

    findBuf = [];
    repBuf  = [];
    mode    = null;
  }

  for (const line of lines) {
    const upper = line.trimStart().toUpperCase();

    if (upper.startsWith('FIND:')) {
      if (mode === 'replace') {
        flush();
      }
      mode = 'find';
      const rest = line.substring(line.toUpperCase().indexOf('FIND:') + 5);
      if (rest.trim() !== '') findBuf.push(rest);

    } else if (upper.startsWith('REPLACE:')) {
      mode = 'replace';
      const rest = line.substring(line.toUpperCase().indexOf('REPLACE:') + 8);
      if (rest.trim() !== '') repBuf.push(rest);

    } else if (upper.startsWith('NO_CHANGES') || upper.startsWith('NO CHANGES')) {
      break;

    } else {
      if (mode === 'find')    findBuf.push(line);
      if (mode === 'replace') repBuf.push(line);
    }
  }

  if (mode === 'replace') {
    flush();
  }

  return patches;
}

function replaceExact(content, find, replace, replaceAll) {
  const isSimpleWord = /^[a-zA-Z0-9_]+$/.test(find);

  if (isSimpleWord) {
    const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, replaceAll ? 'g' : '');
    return content.replace(regex, replace);
  }

  if (replaceAll) {
    return content.split(find).join(replace);
  }
  return content.replace(find, replace);
}

function countExact(content, find) {
  const isSimpleWord = /^[a-zA-Z0-9_]+$/.test(find);

  if (isSimpleWord) {
    const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'g');
    const matches = content.match(regex);
    return matches ? matches.length : 0;
  }

  return content.split(find).length - 1;
}

function applyPatch(content, patches, options = {}) {
  const replaceAll = options.all || false;
  const results = [];
  let updatedContent = content;

  // Tanpa --all, hanya apply patch pertama
  const patchesToApply = replaceAll ? patches : patches.slice(0, 1);

  patchesToApply.forEach((patch, index) => {
    const count = countExact(updatedContent, patch.find);

    if (count === 0) {
      results.push({
        index: index + 1,
        status: 'failed',
        message: 'Teks tidak ditemukan di file'
      });
      return;
    }

    if (replaceAll && count > 1) {
      results.push({
        index: index + 1,
        status: 'ok',
        message: `Mengganti ${count} kemunculan (--all mode)`
      });
    } else if (!replaceAll && count > 1) {
      results.push({
        index: index + 1,
        status: 'warning',
        message: `Ditemukan ${count} kemunculan, hanya patch pertama yang diapply. Gunakan --all untuk mengganti semua`
      });
    } else {
      results.push({
        index: index + 1,
        status: 'ok',
        message: 'Berhasil'
      });
    }

    updatedContent = replaceExact(updatedContent, patch.find, patch.replace, replaceAll);
  });

  return { updatedContent, results };
}

module.exports = {
  readFile,
  readMultipleFiles,
  writeFile,
  backupFile,
  findBackup,
  restoreBackup,
  parsePatches,
  applyPatch
};