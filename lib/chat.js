const readlineSync = require('readline-sync');
const chalk = require('chalk');
const { chat } = require('./ollama');
const { addToHistory } = require('./history');

// In-memory history untuk context AI
const sessionHistory = [];

async function startChat() {
  console.log(chalk.cyan('🤖 Sigma CLI — Chat Mode'));
  console.log(chalk.gray('Ketik "exit" atau "quit" untuk keluar.\n'));

  while (true) {
    const input = readlineSync.question(chalk.yellow('You: '));

    if (!input.trim()) continue;
    if (input.trim() === 'exit' || input.trim() === 'quit') {
      console.log(chalk.gray('\n👋 Sampai jumpa!'));
      break;
    }

    sessionHistory.push({ role: 'user', content: input });
    addToHistory('user', input);

    console.log(chalk.gray('⏳ Mengirim...'));

    try {
      const response = await chat(input, sessionHistory);
      sessionHistory.push({ role: 'assistant', content: response });
      addToHistory('assistant', response);

      console.log(chalk.green('\n🤖 AI:'));
      console.log(response);
      console.log();
    } catch (err) {
      console.error(chalk.red(`❌ Error: ${err.message}\n`));
    }
  }
}

module.exports = { startChat };