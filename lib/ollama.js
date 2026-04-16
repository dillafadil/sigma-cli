const { loadConfig } = require('./config');
const logger = require('./logger');

async function chat(prompt, history = []) {
  const config = loadConfig();
  const url = `${config.base_url}/api/chat`;

  const messages = [
    ...history,
    { role: 'user', content: prompt }
  ];

  const body = {
    model: config.model,
    messages,
    stream: false
  };

  logger.debug(`ollama request: model=${config.model} messages=${messages.length}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    if (!data.message || !data.message.content) {
      throw new Error('Response Ollama tidak valid: tidak ada content');
    }

    logger.debug(`ollama response: ${data.message.content.length} chars`);

    return data.message.content;

  } catch (err) {
    clearTimeout(timeout);
    logger.error(`ollama failed: ${err.message}`);

    if (err.name === 'AbortError') {
      throw new Error('Request timeout (60s). Ollama mungkin sedang sibuk atau model terlalu berat.');
    }

    if (err.message.startsWith('Ollama error:') || err.message.startsWith('Response Ollama tidak valid')) {
      throw err;
    }

    throw new Error(`Gagal connect ke Ollama: ${err.message}`);
  }
}

module.exports = { chat };