/**
 * Provider-agnostic LLM streaming client.
 *
 * Supported providers (set LLM_PROVIDER env var):
 *   "cloudflare" — Cloudflare Workers AI (recommended: free, zero-retention policy)
 *   "groq"       — Groq API (free tier, OpenAI-compatible SSE)
 *   "gemini"     — Google Gemini Flash (free tier, OpenAI-compatible endpoint)
 *   "ollama"     — Local / VPS Ollama (NDJSON stream, 100% private)
 *
 * Required env vars per provider:
 *   cloudflare: CF_ACCOUNT_ID, CF_API_TOKEN, CF_MODEL (e.g. @cf/meta/llama-3.3-70b-instruct-fp8-fast)
 *   groq:       GROQ_API_KEY, GROQ_MODEL   (e.g. llama-3.3-70b-versatile)
 *   gemini:     GEMINI_API_KEY, GEMINI_MODEL (e.g. gemini-2.0-flash)
 *   ollama:     OLLAMA_BASE_URL, OLLAMA_MODEL
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

type Provider = 'cloudflare' | 'groq' | 'gemini' | 'ollama';

function getProvider(): Provider {
  const p = process.env.LLM_PROVIDER ?? 'cloudflare';
  if (p === 'cloudflare' || p === 'groq' || p === 'gemini' || p === 'ollama') return p;
  throw new Error(`Unknown LLM_PROVIDER: "${p}". Valid values: cloudflare, groq, gemini, ollama`);
}

// ── OpenAI-compatible SSE stream parser (Groq + Gemini use this format) ───────

async function* streamOpenAI(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: LLMMessage[],
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`LLM API error ${response.status}: ${body.slice(0, 200)}`);
  }

  if (!response.body) throw new Error('LLM API returned no body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const payload = trimmed.slice(6);
        if (payload === '[DONE]') return;
        try {
          const chunk = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // Partial or non-JSON SSE line — skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ── Ollama NDJSON stream parser ────────────────────────────────────────────────

async function* streamOllama(
  messages: LLMMessage[],
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const baseUrl = process.env.OLLAMA_BASE_URL;
  const model = process.env.OLLAMA_MODEL;
  if (!baseUrl || !model) {
    throw new Error('OLLAMA_BASE_URL and OLLAMA_MODEL are required when LLM_PROVIDER=ollama');
  }

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  });

  if (!response.ok) throw new Error(`Ollama responded with status ${response.status}`);
  if (!response.body) throw new Error('Ollama response has no body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const chunk = JSON.parse(trimmed) as {
            done: boolean;
            message?: { content?: string };
          };
          if (chunk.done) return;
          const content = chunk.message?.content;
          if (content) yield content;
        } catch {
          // Skip partial JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ── Public API — drop-in replacement for lib/ollama.ts's streamChat ───────────

export async function* streamChat(
  messages: LLMMessage[],
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const provider = getProvider();

  if (provider === 'cloudflare') {
    const accountId = process.env.CF_ACCOUNT_ID;
    const apiToken = process.env.CF_API_TOKEN;
    const model = process.env.CF_MODEL ?? '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
    if (!accountId || !apiToken) {
      throw new Error('CF_ACCOUNT_ID and CF_API_TOKEN are required when LLM_PROVIDER=cloudflare');
    }
    yield* streamOpenAI(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`,
      apiToken,
      model,
      messages,
      signal,
    );
    return;
  }

  if (provider === 'groq') {
    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';
    if (!apiKey) throw new Error('GROQ_API_KEY is not set');
    yield* streamOpenAI(
      'https://api.groq.com/openai/v1',
      apiKey,
      model,
      messages,
      signal,
    );
    return;
  }

  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    // Gemini exposes an OpenAI-compatible endpoint
    yield* streamOpenAI(
      `https://generativelanguage.googleapis.com/v1beta/openai`,
      apiKey,
      model,
      messages,
      signal,
    );
    return;
  }

  // provider === 'ollama'
  yield* streamOllama(messages, signal);
}

// Re-export the message type under the legacy name so existing code that imports
// OllamaMessage from this module also works.
export type { LLMMessage as OllamaMessage };
