const readlineSync = require('readline-sync');
const chalk = require('chalk');
const { parseIntent } = require('./intent-parser');
const { chat } = require('./ollama');
const logger = require('./logger');

// Tool imports
const { readFile, backupFile, restoreBackup, findBackup, parsePatches, applyPatch } = require('./filesystem');
const { fix, explain } = require('./commands');
const { getHistory, addToHistory, clearHistory } = require('./history');
const { getConfig, setConfig } = require('./config');

/**
 * Conversational Shell
 */
class ConversationalShell {
  constructor() {
    this.context = { lastFile: null };
    this.running = false;
  }

  async start() {
    this.running = true;
    console.log(chalk.cyan('🤖 Sigma CLI v0.6.0 — Conversational Mode'));
    console.log(chalk.gray('Ketik "exit" untuk keluar.\n'));
    logger.info('shell: started');

    while (this.running) {
      const input = readlineSync.question(chalk.yellow('> '));
      if (!input.trim()) continue;

      addToHistory('user', input);
      const intent = await parseIntent(input);

      if (!intent) continue;

      try {
        await this.execute(intent, input);
      } catch (err) {
        console.error(chalk.red(`❌ ${err.message}`));
      }
      console.log();
    }

    console.log(chalk.gray('👋 Sampai jumpa!'));
  }

  async execute(intent, rawInput) {
    switch (intent.intent) {
      case 'EXIT':
        this.running = false;
        break;
      case 'CHAT':
        await this.doChat(intent.text);
        break;
      case 'REVIEW':
        await this.doReview(intent);
        break;
      case 'EXPLAIN':
        await this.doExplain(intent);
        break;
      case 'FIX':
        await this.doFix(intent);
        break;
      case 'READ':
        await this.doRead(intent);
        break;
      case 'UNDO':
        await this.doUndo(intent);
        break;
      case 'HISTORY':
        await this.doHistory(intent);
        break;
      case 'CONFIG':
        await this.doConfig(intent);
        break;
      default:
        console.log(chalk.gray('Perintah tidak dikenali. Coba: review, explain, fix, read, undo'));
    }
  }

  async doChat(text) {
    console.log(chalk.yellow('⏳...'));
    const response = await chat(text);
    console.log(chalk.green('\n🤖 ' + response));
    addToHistory('assistant', response);
  }

  async doReview(intent) {
    const file = intent.file || this.context.lastFile;
    if (!file) {
      console.log(chalk.yellow('File? Contoh: review app.js'));
      return;
    }

    this.context.lastFile = file;
    console.log(chalk.yellow(`⏳ Review ${file}...`));

    const result = readFile(file);
    const prompt = `Review this code for bugs, quality, suggestions:

${result.content}

Output:
[Potential Bugs]
- [line] description

[Code Quality]
- [line] description

[Suggestions]
- [line] description`;

    const response = await chat(prompt);
    
    console.log(chalk.cyan(`\n=== Review: ${file} ===`));
    
    let section = '';
    response.split('\n').forEach(line => {
      if (line.includes('Potential Bugs')) {
        section = 'bugs';
        console.log(chalk.red(line));
      } else if (line.includes('Code Quality')) {
        section = 'quality';
        console.log(chalk.yellow(line));
      } else if (line.includes('Suggestions')) {
        section = 'suggestions';
        console.log(chalk.green(line));
      } else if (line.startsWith('- ')) {
        if (section === 'bugs') console.log(chalk.red('  ' + line));
        else if (section === 'quality') console.log(chalk.yellow('  ' + line));
        else if (section === 'suggestions') console.log(chalk.green('  ' + line));
        else console.log('  ' + line);
      } else {
        console.log(line);
      }
    });
  }

  async doExplain(intent) {
    const file = intent.file || this.context.lastFile;
    if (!file) {
      console.log(chalk.yellow('File? Contoh: explain app.js'));
      return;
    }

    this.context.lastFile = file;
    console.log(chalk.yellow(`⏳ Explain ${file}...`));

    try {
      const response = await explain(file);
      console.log(chalk.green('\n🤖 Penjelasan:\n' + response));
      addToHistory('assistant', response);
    } catch (err) {
      throw new Error(`Gagal explain: ${err.message}`);
    }
  }

  async doFix(intent) {
    const file = intent.file || this.context.lastFile;
    if (!file) {
      console.log(chalk.yellow('File? Contoh: fix app.js'));
      return;
    }

    this.context.lastFile = file;
    console.log(chalk.yellow(`⏳ Fix ${file}...`));

    try {
      const response = await fix(file);
      console.log(chalk.green('\n🤖 Perbaikan:\n' + response));
      
      const apply = readlineSync.keyInYNStrict(chalk.yellow('\nApply?'));
      if (apply) {
        backupFile(file);
        // Note: response is the fixed code, need to write it
        // For now, placeholder
        console.log(chalk.green('✓ Applied (placeholder)'));
      }
    } catch (err) {
      throw new Error(`Gagal fix: ${err.message}`);
    }
  }

  async doRead(intent) {
    const file = intent.file;
    try {
      const result = readFile(file);
      console.log(chalk.cyan(`\n📄 ${file} (${result.lines} baris)\n`));
      console.log(result.content);
      this.context.lastFile = file;
    } catch (err) {
      throw err;
    }
  }

  async doUndo(intent) {
    const file = intent.file || this.context.lastFile;
    if (!file) {
      console.log(chalk.yellow('File? Contoh: undo app.js'));
      return;
    }

    const backup = findBackup(file);
    if (!backup) {
      console.log(chalk.yellow('Tidak ada backup.'));
      return;
    }

    console.log(chalk.cyan(`Backup: ${backup}`));
    if (readlineSync.keyInYNStrict(chalk.yellow('Restore?'))) {
      restoreBackup(file);
      console.log(chalk.green('✓ Restored'));
    }
  }

  async doHistory(intent) {
    if (intent.action === 'clear') {
      clearHistory();
      console.log(chalk.green('✓ History cleared'));
      return;
    }

    const h = getHistory();
    if (h.length === 0) {
      console.log(chalk.gray('Kosong'));
      return;
    }

    console.log(chalk.cyan(`\nHistory (${h.length}):\n`));
    h.slice(-10).forEach((e, i) => {
      const icon = e.role === 'user' ? '👤' : '🤖';
      console.log(`${i+1}. ${icon} ${e.content.substring(0,50)}...`);
    });
  }

  async doConfig(intent) {
    if (intent.action === 'get') {
      if (intent.key) {
        console.log(chalk.cyan(`${intent.key}: ${JSON.stringify(getConfig(intent.key))}`));
      } else {
        console.log(chalk.cyan('Config:'));
        Object.entries(getConfig()).forEach(([k,v]) => console.log(`  ${k}: ${v}`));
      }
    } else if (intent.action === 'set') {
      setConfig(intent.key, intent.value);
      console.log(chalk.green(`✓ ${intent.key} = ${intent.value}`));
    }
  }
}

module.exports = { ConversationalShell };
