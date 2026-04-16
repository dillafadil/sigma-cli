const { PATTERNS } = require('./intents/patterns');
const { chat } = require('./ollama');
const logger = require('./logger');

/**
 * Parse user input ke intent object
 * Return: { intent, ...args } atau { intent: 'CHAT', text: user_input }
 */
async function parseIntent(userInput) {
  if (!userInput || userInput.trim() === '') {
    return null;
  }

  const input = userInput.trim();

  // 1. Try pattern matching (fast, no Ollama)
  for (const [patternName, patternObj] of Object.entries(PATTERNS)) {
    const match = input.match(patternObj.regex);
    if (match) {
      const result = patternObj.extract(match);
      logger.debug(`intent: matched pattern ${patternName} → ${result.intent}`);
      return result;
    }
  }

  // 2. Fallback: ask Ollama "what does user want?"
  logger.debug(`intent: no pattern match, asking Ollama for NLU`);
  try {
    const nluPrompt = `User input: "${input}"

Classify into ONE of these intents:
- REVIEW (code review)
- EDIT (change code)
- EXPLAIN (understand code)
- FIX (auto fix bugs)
- UNDO (revert)
- READ (show file)
- HISTORY (show/clear history)
- CONFIG (manage settings)
- CHAT (general question)
- EXIT (quit)

Respond with ONLY the intent name, nothing else.`;

    const ollama_response = await chat(nluPrompt);
    const detected_intent = ollama_response.trim().toUpperCase();

    // Validate intent
    const valid_intents = ['REVIEW', 'EDIT', 'EXPLAIN', 'FIX', 'UNDO', 'READ', 'HISTORY', 'CONFIG', 'CHAT', 'EXIT'];
    if (valid_intents.includes(detected_intent)) {
      logger.debug(`intent: Ollama detected ${detected_intent}`);
      return {
        intent: detected_intent,
        text: input,
        confidence: 'ollama_fallback'
      };
    }
  } catch (err) {
    logger.warn(`intent: Ollama fallback failed: ${err.message}`);
  }

  // 3. Default fallback: treat as CHAT
  logger.debug(`intent: defaulting to CHAT`);
  return {
    intent: 'CHAT',
    text: input
  };
}

module.exports = { parseIntent };
