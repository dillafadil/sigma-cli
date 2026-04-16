const { readFile } = require('./filesystem');
const { chat } = require('./ollama');

async function fix(filePath) {
  const result = readFile(filePath);

  const prompt = `Berikut adalah kode yang mungkin memiliki bug atau masalah:\n\`\`\`\n${result.content}\n\`\`\`\n\nTolong:\n1. Identifikasi masalah atau bug yang ada\n2. Perbaiki kode tersebut\n3. Balas HANYA dengan kode yang sudah diperbaiki, tanpa penjelasan, tanpa markdown.`;

  const response = await chat(prompt);

  if (!response || response.trim() === '') {
    throw new Error('AI tidak memberikan response.');
  }

  return response;
}

async function explain(filePath) {
  const result = readFile(filePath);

  const prompt = `Berikut adalah kode:\n\`\`\`\n${result.content}\n\`\`\`\n\nJelaskan kode ini secara singkat dan jelas:\n1. Apa fungsi utama kode ini?\n2. Bagaimana cara kerjanya?\n3. Apakah ada yang perlu diperhatikan?`;

  const response = await chat(prompt);

  if (!response || response.trim() === '') {
    throw new Error('AI tidak memberikan response.');
  }

  return response;
}

module.exports = { fix, explain };