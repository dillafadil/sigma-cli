#!/usr/bin/env node

const fs = require('fs');
const glob = require('glob');
const pathModule = require('path');
const { Command } = require('commander');
const chalk = require('chalk');
const readlineSync = require('readline-sync');
const { chat } = require('../lib/ollama');
const { fix, explain } = require('../lib/commands');
const { startChat } = require('../lib/chat');
const { getConfig, setConfig } = require('../lib/config');
const { getHistory, clearHistory } = require('../lib/history');
const logger = require('../lib/logger');
const {
  readFile, readMultipleFiles, writeFile,
  backupFile, findBackup, restoreBackup,
  parsePatches, applyPatch
} = require('../lib/filesystem');

function isGlobPattern(str) {
  return /[*?\[]/.test(str);
}

function buildEditPrompt(fileContent, instruction, isAll) {
  return `You are a code editor. Your job is to find text in the FILE and replace it.

      HOW TO FIND:
      - Read the INSTRUCTION carefully
      - Look at the FILE content
      - Find the EXACT text in the FILE that matches what the INSTRUCTION wants to change
      - If instruction says "save" but file has "save()", use "save()" as FIND
      - If instruction says "count" but file has "count = 5", use "count = 5" as FIND
      - Always copy FIND EXACTLY as it appears in the FILE

      EXAMPLE 1:
      File: save()
      Instruction: ganti save jadi persist
      Output:
      FIND:save()
      REPLACE:persist()

      EXAMPLE 2:
      File: const count = 5
      Instruction: rename count to total
      Output:
      FIND:count
      REPLACE:total

      EXAMPLE 3:
      File: function hello()
      Instruction: rename hello to greet
      Output:
      FIND:hello()
      REPLACE:greet()

      EXAMPLE 4:
      File: const VERSION = '1.0'
             return VERSION
      Instruction: ganti VERSION jadi APP_VERSION
      Output:
      FIND:VERSION
      REPLACE:APP_VERSION

      RULES:
      - Output ONLY patches, nothing else
      - No explanation, no markdown, no code blocks
      - Format:

      FIND:<exact text from file>
      REPLACE:<new text>

      - Multiple changes: repeat FIND/REPLACE blocks
      - ONLY output NO_CHANGES if the instruction asks for something that is NOT in the file at all

      FILE:
      ${fileContent}

      INSTRUCTION:
      ${instruction}${isAll ? '\n\nIMPORTANT: Output only ONE FIND/REPLACE block with the minimal text to change. The system will automatically replace ALL occurrences.' : ''}

      PATCH:`;
}

const program = new Command();

program
  .name('sigma')
  .description('Sigma CLI — AI-powered terminal assistant menggunakan Ollama')
  .version('0.4.1')
  .addHelpText('after', `
Contoh:
  sigma chat "apa itu closure?"        # satu kali tanya
  sigma chat                           # mode interaktif
  sigma edit app.js "ganti foo jadi bar"
  sigma review app.js                  # code review AI
  sigma --help                         # lihat semua command

Docs: https://github.com/sigma-cli/sigma-cli
`);

// ── chat ──────────────────────────────────────────────
program
  .command('chat')
  .description('Chat dengan AI — satu kali atau mode interaktif')
  .argument('[prompt]', 'Prompt untuk AI (tanpa arg = mode interaktif)')
  .addHelpText('after', `
Mode:
  Dengan argumen  → satu kali tanya, dapat jawaban, keluar
  Tanpa argumen   → mode interaktif (loop), ketik "exit" untuk keluar

Contoh:
  sigma chat "jelaskan promise di JS"
  sigma chat                           # masuk mode interaktif
`)
  .action(async (prompt) => {
    try {
      if (prompt) {
        logger.info(`chat: "${prompt.substring(0, 80)}"`);
        const response = await chat(prompt);
        console.log(response);
        logger.info('chat: completed');
      } else {
        logger.info('chat: interactive mode started');
        await startChat();
        logger.info('chat: interactive mode ended');
      }
    } catch (err) {
      logger.error(`chat: ${err.message}`);
      console.error(chalk.red(`❌ Error: ${err.message}`));
    }
  });

// ── read ──────────────────────────────────────────────
program
  .command('read')
  .description('Baca isi file dan opsional tanya AI tentangnya')
  .argument('<files...>', 'Path file (satu atau lebih)')
  .option('-p, --prompt <text>', 'Tanya AI tentang file yang dibaca')
  .addHelpText('after', `
Contoh:
  sigma read app.js                              # baca 1 file
  sigma read app.js utils.js                     # baca beberapa file
  sigma read app.js -p "apa fungsi utamanya?"   # baca + tanya AI
`)
  .action(async (files, options) => {
    try {
      logger.info(`read: ${files.join(', ')}`);

      const results = files.length === 1
        ? [readFile(files[0])]
        : readMultipleFiles(files);

      results.forEach((result, index) => {
        if (index > 0) {
          console.log();
        }
        console.log(chalk.cyan(`File: ${result.path}`));
        console.log(chalk.gray(`${result.lines} baris`));
        console.log(result.content);
      });

      if (options.prompt) {
        logger.debug(`read: AI prompt="${options.prompt}"`);
        const combined = results.map(r => r.content).join('\n\n');
        const fullPrompt = `${options.prompt}\n\n${combined}`;
        console.log(chalk.yellow('\n⏳ Mengirim ke AI...'));
        const response = await chat(fullPrompt);
        console.log(chalk.green('\n🤖 AI:'));
        console.log(response);
        logger.info('read: AI response completed');
      }
    } catch (err) {
      logger.error(`read: ${err.message}`);
      console.error(chalk.red(`❌ Error: ${err.message}`));
    }
  });

// ── edit ──────────────────────────────────────────────
program
  .command('edit')
  .description('Edit file dengan bantuan AI (patch-based)')
  .argument('<file>', 'Path ke file (support glob pattern)')
  .argument('<prompt>', 'Instruksi edit untuk AI')
  .option('-a, --all', 'Ganti semua kemunculan (default: hanya yang pertama)')
  .option('-p, --preview', 'Tampilkan diff tanpa menyimpan perubahan')
  .addHelpText('after', `
Mode:
  Single file  → edit 1 file dengan konfirmasi
  Glob pattern → edit banyak file sekaligus (batch)

Opsi:
  --all      Ganti semua kemunculan teks, bukan hanya yang pertama
  --preview  Lihat diff tanpa menyimpan perubahan

Contoh:
  sigma edit app.js "ganti foo jadi bar"
  sigma edit app.js "rename count ke total" --all
  sigma edit app.js "hapus console.log" --preview
  sigma edit "src/**/*.js" "ganti foo jadi baz" --all

Backup:
  File di-backup otomatis ke .sigma/backup/ sebelum disimpan.
  Gunakan "sigma undo <file>" untuk mengembalikan.
`)
  .action(async (file, prompt, options) => {
    try {
      // === BATCH MODE ===
      if (isGlobPattern(file)) {
        const files = glob.sync(file, {
          ignore: ['node_modules/**', '.sigma/**'],
          nodir: true
        });

        if (files.length === 0) {
          logger.warn(`edit batch: no files matched "${file}"`);
          console.log(chalk.yellow('⚠️  Tidak ada file yang cocok dengan pattern.'));
          return;
        }

        logger.info(`edit batch: pattern="${file}" matched=${files.length}`);

        console.log(chalk.cyan(`\n📂 ${files.length} file ditemukan:\n`));
        files.forEach(f => console.log(chalk.gray(`   - ${f}`)));
        console.log();

        const batchConfirm = readlineSync.keyInYNStrict(
          chalk.yellow(`💾 Edit ${files.length} file dengan instruksi "${prompt}"?`)
        );

        if (!batchConfirm) {
          logger.info('edit batch: cancelled by user');
          console.log(chalk.gray('\n✗ Batch edit dibatalkan.'));
          return;
        }

        const batchResults = [];

        for (const f of files) {
          try {
            const result = readFile(f);
            logger.debug(`edit batch: processing ${f}`);
            console.log(chalk.cyan(`\n📄 Processing: ${f}`));

            const editPrompt = buildEditPrompt(result.content, prompt, options.all);
            const response = await chat(editPrompt);

            if (response.trim().toUpperCase().startsWith('NO_CHANGES')) {
              batchResults.push({ file: f, status: 'skipped' });
              console.log(chalk.gray('   ⊘ No changes'));
              continue;
            }

            const patches = parsePatches(response);

            if (patches.length === 0) {
              batchResults.push({ file: f, status: 'skipped' });
              console.log(chalk.gray('   ⊘ No patches'));
              continue;
            }

            const { updatedContent, results } = applyPatch(result.content, patches, { all: options.all });
            const hasSuccess = results.some(r => r.status === 'ok' || r.status === 'warning');

            if (!hasSuccess) {
              batchResults.push({ file: f, status: 'failed' });
              logger.warn(`edit batch: all patches failed for ${f}`);
              console.log(chalk.red('   ✗ All patches failed'));
              continue;
            }

            if (!options.preview) {
              backupFile(f);
              writeFile(f, updatedContent);
              batchResults.push({ file: f, status: 'success' });
              console.log(chalk.green('   ✓ Updated'));
            } else {
              batchResults.push({ file: f, status: 'success' });
              console.log(chalk.green('   ✓ Preview only'));
            }

          } catch (err) {
            batchResults.push({ file: f, status: 'failed' });
            logger.error(`edit batch: ${f} — ${err.message}`);
            console.log(chalk.red(`   ✗ Error: ${err.message}`));
          }
        }

        const success = batchResults.filter(r => r.status === 'success').length;
        const failed = batchResults.filter(r => r.status === 'failed').length;
        const skipped = batchResults.filter(r => r.status === 'skipped').length;

        logger.info(`edit batch done: ${success} success, ${failed} failed, ${skipped} skipped`);

        console.log(chalk.cyan('\n=== BATCH EDIT SUMMARY ===\n'));
        console.log(`Matched Files : ${files.length}`);
        console.log(chalk.green(`Success       : ${success}`));
        if (failed > 0) console.log(chalk.red(`Failed        : ${failed}`));
        else console.log(`Failed        : ${failed}`);
        console.log(chalk.gray(`Skipped       : ${skipped}`));

        if (failed > 0) {
          console.log(chalk.red('\nFailed Files:'));
          batchResults.filter(r => r.status === 'failed').forEach(r => {
            console.log(chalk.red(`  - ${r.file}`));
          });
        }

        return;
      }

      // === SINGLE FILE MODE ===
      const result = readFile(file);

      logger.info(`edit: ${file} "${prompt.substring(0, 60)}"`);

      console.log(chalk.cyan(`📄 File: ${result.path}`));
      console.log(chalk.gray(`   ${result.lines} baris\n`));

      const fullPrompt = buildEditPrompt(result.content, prompt, options.all);

      console.log(chalk.yellow('⏳ Mengirim ke AI...'));

      const response = await chat(fullPrompt);

      console.log(chalk.gray('\n── Raw AI Response ──────────────────────'));
      console.log(response);
      console.log(chalk.gray('─────────────────────────────────────────\n'));

      if (response.trim().toUpperCase().startsWith('NO_CHANGES')) {
        logger.info('edit: AI returned NO_CHANGES');
        console.log(chalk.green('✓ AI tidak mendeteksi perubahan yang diperlukan.'));
        return;
      }

      const patches = parsePatches(response);

      if (patches.length === 0) {
        logger.warn('edit: no patches parsed from AI response');
        console.log(chalk.yellow('\n⚠️  Tidak ada perubahan nyata yang terdeteksi.'));
        console.log(chalk.gray('   File tidak diubah.'));
        return;
      }

      logger.debug(`edit: ${patches.length} patches parsed`);

      const { updatedContent, results } = applyPatch(result.content, patches, { all: options.all });

      console.log(chalk.cyan(`\n📊 Hasil Patch (${patches.length} perubahan):\n`));

      results.forEach((r) => {
        if (r.status === 'ok') {
          console.log(chalk.green(`  ✓ Patch #${r.index}: ${r.message}`));
        } else if (r.status === 'warning') {
          console.log(chalk.yellow(`  ⚠️  Patch #${r.index}: ${r.message}`));
        } else {
          console.log(chalk.red(`  ✗ Patch #${r.index}: ${r.message}`));
        }
      });

      const hasSuccess = results.some(r => r.status === 'ok' || r.status === 'warning');
      if (!hasSuccess) {
        logger.warn('edit: all patches failed');
        console.log(chalk.red('\n❌ Semua patch gagal. File tidak diubah.'));
        return;
      }

      console.log(chalk.cyan('\n🔍 Preview perubahan:\n'));
      patches.forEach((patch, i) => {
        console.log(chalk.gray(`[Patch ${i + 1}]`));
        patch.find.split('\n').forEach(line => {
          console.log(chalk.red(`- ${line}`));
        });
        patch.replace.split('\n').forEach(line => {
          console.log(chalk.green(`+ ${line}`));
        });
        console.log();
      });

      if (options.preview) {
        logger.info('edit: preview only, file not saved');
        console.log(chalk.yellow('\n👁️  Preview mode — file tidak diubah.\n'));
        console.log(chalk.cyan('── Diff ──────────────────────────────'));

        const oldLines = result.content.split('\n');
        const newLines = updatedContent.split('\n');
        const maxLen = Math.max(oldLines.length, newLines.length);

        for (let i = 0; i < maxLen; i++) {
          const oldLine = oldLines[i] !== undefined ? oldLines[i] : '';
          const newLine = newLines[i] !== undefined ? newLines[i] : '';

          if (oldLine !== newLine) {
            if (oldLine && !newLine) {
              console.log(chalk.red(`  - ${oldLine}`));
            } else if (!oldLine && newLine) {
              console.log(chalk.green(`  + ${newLine}`));
            } else {
              console.log(chalk.red(`  - ${oldLine}`));
              console.log(chalk.green(`  + ${newLine}`));
            }
          }
        }

        console.log(chalk.cyan('──────────────────────────────────────'));
        console.log(chalk.gray('\n   Gunakan tanpa --preview untuk menyimpan.'));
      } else {
        const confirm = readlineSync.keyInYNStrict(
          chalk.yellow('💾 Apply semua perubahan ke file?')
        );

        if (confirm) {
          const backupPath = backupFile(file);
          if (backupPath) {
            logger.debug(`edit: backup created at ${backupPath}`);
            console.log(chalk.gray(`   Backup: ${backupPath}`));
          }
          writeFile(file, updatedContent);
          logger.info(`edit: file saved — ${result.path}`);
          console.log(chalk.green(`\n✓ File disimpan: ${result.path}`));
        } else {
          logger.info('edit: cancelled by user');
          console.log(chalk.gray('\n✗ Perubahan dibatalkan. File tidak diubah.'));
        }
      }

    } catch (err) {
      logger.error(`edit: ${err.message}`);
      console.error(chalk.red(`❌ Error: ${err.message}`));
    }
  });

// ── undo ──────────────────────────────────────────────
program
  .command('undo')
  .description('Kembalikan file ke versi sebelum edit')
  .argument('<file>', 'Path ke file')
  .addHelpText('after', `
Cara kerja:
  Mencari backup terbaru di .sigma/backup/ dan mengembalikan isunya.

Contoh:
  sigma undo app.js
  sigma undo src/utils/helper.js
`)
  .action((file) => {
    try {
      logger.info(`undo: ${file}`);

      const absPath = pathModule.resolve(file);

      if (!fs.existsSync(absPath)) {
        console.error(chalk.red(`❌ File tidak ditemukan: ${absPath}`));
        return;
      }

      const backupPath = findBackup(absPath);

      if (!backupPath) {
        logger.warn(`undo: no backup for ${file}`);
        console.log(chalk.yellow('⚠️  Tidak ada backup untuk file ini.'));
        return;
      }

      console.log(chalk.cyan(`📦 Backup ditemukan: ${backupPath}`));

      const confirm = readlineSync.keyInYNStrict(
        chalk.yellow('🔙 Restore file ke versi backup?')
      );

      if (confirm) {
        const restored = restoreBackup(file);
        logger.info(`undo: restored from ${restored}`);
        console.log(chalk.green(`\n✓ File di-restore dari: ${restored}`));
      } else {
        logger.info('undo: cancelled by user');
        console.log(chalk.gray('\n✗ Restore dibatalkan.'));
      }
    } catch (err) {
      logger.error(`undo: ${err.message}`);
      console.error(chalk.red(`❌ Error: ${err.message}`));
    }
  });

// ── review ────────────────────────────────────────────
program
  .command('review')
  .description('AI review kode tanpa mengubah file (read-only)')
  .argument('<file>', 'Path ke file')
  .argument('[focus]', 'Fokus review opsional (contoh: "performance", "security")')
  .addHelpText('after', `
Section output:
  [Potential Bugs]   → bug dan runtime error yang terdeteksi
  [Code Quality]     → code smell, anti-pattern, readability
  [Suggestions]      → rekomendasi perbaikan

Contoh:
  sigma review app.js
  sigma review app.js "performance"
  sigma review app.js "security and error handling"
`)
  .action(async (file, focus) => {
    try {
      logger.info(`review: ${file}${focus ? ` focus="${focus}"` : ''}`);

      const result = readFile(file);

      console.log(chalk.cyan(`\n=== SIGMA CODE REVIEW ===\n`));
      console.log(`File: ${result.path}\n`);

      const fullPrompt = `You are a senior software engineer conducting a code review.

Review this code for:

- Potential bugs or runtime errors
- Code smells or anti-patterns
- Poor naming or readability issues
- Performance bottlenecks
- Maintainability concerns
- Security vulnerabilities (if any)
- Duplicated logic

${focus ? `Focus area: ${focus}\n\n` : ''}

FILE:
${result.content}

OUTPUT FORMAT:
[Potential Bugs]
- ...

[Code Quality]
- ...

[Suggestions]
- ...

Do not output anything else.`;

      console.log(chalk.yellow('⏳ Analyzing code...'));

      const response = await chat(fullPrompt);

      let currentSection = '';
      const lines = response.split('\n');
      for (const line of lines) {
        if (line.startsWith('[Potential Bugs]')) {
          currentSection = 'bugs';
          console.log(chalk.red(line));
        } else if (line.startsWith('[Code Quality]')) {
          currentSection = 'quality';
          console.log(chalk.yellow(line));
        } else if (line.startsWith('[Suggestions]')) {
          currentSection = 'suggestions';
          console.log(chalk.green(line));
        } else if (line.trim() === '') {
          console.log();
        } else if (line.startsWith('- ') && currentSection) {
          switch (currentSection) {
            case 'bugs': console.log(chalk.red(line)); break;
            case 'quality': console.log(chalk.yellow(line)); break;
            case 'suggestions': console.log(chalk.green(line)); break;
            default: console.log(line); break;
          }
        } else {
          console.log(line);
        }
      }

      logger.info('review: completed');

    } catch (err) {
      logger.error(`review: ${err.message}`);
      console.error(chalk.red(`❌ Error: ${err.message}`));
    }
  });

// ── fix ───────────────────────────────────────────────
program
  .command('fix')
  .description('Deteksi bug dan perbaiki kode dengan AI')
  .argument('<file>', 'Path ke file')
  .addHelpText('after', `
Cara kerja:
  AI menganalisis kode, mendeteksi bug, dan menghasilkan versi perbaikan.
  Anda akan diminta konfirmasi sebelum file ditimpa.

Contoh:
  sigma fix app.js
  sigma fix src/utils/helper.js
`)
  .action(async (file) => {
    try {
      logger.info(`fix: ${file}`);

      const result = readFile(file);

      console.log(chalk.cyan(`📄 File: ${result.path}`));
      console.log(chalk.gray(`   ${result.lines} baris\n`));
      console.log(chalk.yellow('⏳ Menganalisis dan memperbaiki...'));

      const response = await fix(file);

      console.log(chalk.green('\n🤖 Kode perbaikan:\n'));
      console.log(response);

      const confirmApply = readlineSync.keyInYNStrict(
        chalk.yellow('\n💾 Terapkan perbaikan ke file?')
      );

      if (confirmApply) {
        backupFile(file);
        writeFile(file, response);
        logger.info(`fix: applied to ${file}`);
        console.log(chalk.green(`\n✓ File diperbaiki: ${result.path}`));
      } else {
        logger.info('fix: cancelled by user');
        console.log(chalk.gray('\n✗ Perbaikan dibatalkan.'));
      }
    } catch (err) {
      logger.error(`fix: ${err.message}`);
      console.error(chalk.red(`❌ Error: ${err.message}`));
    }
  });

// ── explain ───────────────────────────────────────────
program
  .command('explain')
  .description('Penjelasan kode oleh AI')
  .argument('<file>', 'Path ke file')
  .addHelpText('after', `
Output:
  1. Fungsi utama kode
  2. Cara kerja
  3. Hal yang perlu diperhatikan

Contoh:
  sigma explain app.js
  sigma explain src/utils/parser.js
`)
  .action(async (file) => {
    try {
      logger.info(`explain: ${file}`);

      const result = readFile(file);

      console.log(chalk.cyan(`📄 File: ${result.path}`));
      console.log(chalk.gray(`   ${result.lines} baris\n`));
      console.log(chalk.yellow('⏳ Menganalisis kode...'));

      const response = await explain(file);

      console.log(chalk.green('\n🤖 Penjelasan:\n'));
      console.log(response);
      console.log();

      logger.info('explain: completed');
    } catch (err) {
      logger.error(`explain: ${err.message}`);
      console.error(chalk.red(`❌ Error: ${err.message}`));
    }
  });

// ── context ───────────────────────────────────────────
program
  .command('context')
  .description('Analisis multi-file dengan konteks gabungan')
  .argument('<files...>', 'Path file (pisahkan dengan spasi)')
  .requiredOption('-p, --prompt <text>', 'Prompt untuk AI')
  .addHelpText('after', `
Cara kerja:
  Semua file digabung dan dikirim ke AI sebagai satu konteks.
  Batas: sesuai config context_limit (default: 3 file).

Contoh:
  sigma context app.js utils.js -p "bagaimana hubungan kedua file ini?"
  sigma context router.js controller.js model.js -p "apa yang salah dengan flow ini?"
`)
  .action(async (files, options) => {
    try {
      logger.info(`context: ${files.join(', ')} prompt="${options.prompt.substring(0, 60)}"`);

      const results = readMultipleFiles(files);

      console.log(chalk.cyan(`\n📂 ${results.length} file dimuat:\n`));
      results.forEach(r => {
        console.log(chalk.gray(`   - ${r.path} (${r.lines} baris)`));
      });

      const combined = results.map(r =>
        `--- ${r.path} (${r.lines} baris) ---\n${r.content}`
      ).join('\n\n');

      const fullPrompt = `${options.prompt}\n\n${combined}`;

      console.log(chalk.yellow('\n⏳ Mengirim ke AI...'));

      const response = await chat(fullPrompt);

      console.log(chalk.green('\n🤖 AI:\n'));
      console.log(response);
      console.log();

      logger.info('context: completed');
    } catch (err) {
      logger.error(`context: ${err.message}`);
      console.error(chalk.red(`❌ Error: ${err.message}`));
    }
  });

// ── history ───────────────────────────────────────────
program
  .command('history')
  .description('Lihat atau hapus riwayat percakapan')
  .option('-c, --clear', 'Hapus semua history')
  .addHelpText('after', `
Contoh:
  sigma history              # lihat semua entri
  sigma history --clear      # hapus semua history

Lokasi file: .sigma/history.json
`)
  .action((options) => {
    try {
      if (options.clear) {
        clearHistory();
        logger.info('history: cleared');
        console.log(chalk.green('✓ History dihapus.'));
        return;
      }

      const history = getHistory();

      if (history.length === 0) {
        console.log(chalk.gray('📭 Belum ada history.'));
        return;
      }

      console.log(chalk.cyan(`\n=== HISTORY (${history.length} entri) ===\n`));

      history.forEach((entry, index) => {
        const time = entry.timestamp
          ? new Date(entry.timestamp).toLocaleString('id-ID')
          : '-';
        const label = entry.role === 'user'
          ? chalk.yellow('You')
          : chalk.green('AI');

        console.log(chalk.gray(`${index + 1}. [${time}]`));
        console.log(`   ${label}: ${entry.content.substring(0, 120)}${entry.content.length > 120 ? '...' : ''}`);
        console.log();
      });

    } catch (err) {
      logger.error(`history: ${err.message}`);
      console.error(chalk.red(`❌ Error: ${err.message}`));
    }
  });

// ── config ────────────────────────────────────────────
program
  .command('config')
  .description('Kelola konfigurasi Sigma CLI')
  .argument('<action>', 'get atau set')
  .argument('[key]', 'Key konfigurasi')
  .argument('[value]', 'Value (hanya untuk set)')
  .addHelpText('after', `
Key yang tersedia:
  model              Model Ollama (default: qwen2.5:3b)
  base_url           URL Ollama server (default: http://localhost:11434)
  mode               Mode operasi (default: local)
  context_limit      Maks file untuk context (default: 3)
  max_lines_per_file Maks baris per file (default: 100)
  log_level          Level logging: debug/info/warn/error (default: info)

Contoh:
  sigma config get                        # lihat semua config
  sigma config get model                  # lihat 1 key
  sigma config set model llama3           # ganti model
  sigma config set log_level debug        # aktifkan debug logging
  sigma config set max_lines_per_file 200 # naikkan batas baris

Lokasi file: .sigma/config.json
`)
  .action((action, key, value) => {
    try {
      if (action === 'get') {
        if (key) {
          const val = getConfig(key);
          console.log(chalk.cyan(`${key}: ${JSON.stringify(val)}`));
        } else {
          const config = getConfig();
          console.log(chalk.cyan('\n=== SIGMA CONFIG ===\n'));
          Object.entries(config).forEach(([k, v]) => {
            console.log(`  ${chalk.yellow(k)}: ${JSON.stringify(v)}`);
          });
          console.log();
        }
      } else if (action === 'set') {
        if (!key || value === undefined) {
          console.error(chalk.red('❌ Usage: sigma config set <key> <value>'));
          return;
        }
        setConfig(key, value);
        logger.info(`config: ${key} = ${value}`);
        console.log(chalk.green(`✓ ${key} = ${value}`));
      } else {
        console.error(chalk.red(`❌ Action tidak dikenal: "${action}". Gunakan "get" atau "set".`));
      }
    } catch (err) {
      logger.error(`config: ${err.message}`);
      console.error(chalk.red(`❌ Error: ${err.message}`));
    }
  });

program.parse(process.argv);