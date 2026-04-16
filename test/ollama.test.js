const { chat } = require('../lib/ollama');

// Mock config agar tidak baca config asli
jest.mock('../lib/config', () => ({
  loadConfig: () => ({
    model: 'test-model',
    base_url: 'http://localhost:11434'
  })
}));

describe('chat', () => {
  let originalFetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns message content on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        message: { content: 'Hello from AI' }
      })
    });

    const result = await chat('test prompt');
    expect(result).toBe('Hello from AI');
  });

  test('sends correct model and messages in request body', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        message: { content: 'response' }
      })
    });

    await chat('test prompt');

    const call = global.fetch.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.model).toBe('test-model');
    expect(body.stream).toBe(false);
    expect(body.messages.length).toBe(1);
    expect(body.messages[0].role).toBe('user');
    expect(body.messages[0].content).toBe('test prompt');
  });

  test('sends history with prompt', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        message: { content: 'response' }
      })
    });

    const history = [
      { role: 'user', content: 'prev question' },
      { role: 'assistant', content: 'prev answer' }
    ];
    await chat('new prompt', history);

    const call = global.fetch.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.messages.length).toBe(3);
    expect(body.messages[0].content).toBe('prev question');
    expect(body.messages[1].content).toBe('prev answer');
    expect(body.messages[2].content).toBe('new prompt');
  });

  test('throws on non-ok HTTP response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    await expect(chat('test')).rejects.toThrow('Ollama error: 404');
  });

  test('throws on missing message field in response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({})
    });

    await expect(chat('test')).rejects.toThrow('Response Ollama tidak valid');
  });

  test('throws on missing content in message', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: {} })
    });

    await expect(chat('test')).rejects.toThrow('Response Ollama tidak valid');
  });

  test('throws on network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    await expect(chat('test')).rejects.toThrow('Gagal connect ke Ollama');
  });
});