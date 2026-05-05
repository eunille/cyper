// lib/ollama.ts — kept for backwards compatibility.
// New code should import from @/lib/llm instead.
// This module no longer crashes at load time if env vars are absent.

const ollamaBaseUrl = process.env.OLLAMA_BASE_URL;
const ollamaModel = process.env.OLLAMA_MODEL;

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaChunk {
  model: string;
  message?: { role: string; content: string };
  done: boolean;
}

export async function* streamChat(
  messages: OllamaMessage[],
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: ollamaModel, messages, stream: true }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Ollama responded with status ${response.status}`);
  }

  if (!response.body) {
    throw new Error('Ollama response has no body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Keep the last (potentially incomplete) line in the buffer
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const chunk: OllamaChunk = JSON.parse(trimmed);
          if (chunk.done) return;
          const content = chunk.message?.content;
          if (content) yield content;
        } catch {
          // Partial JSON or non-JSON line — skip
        }
      }
    }

    // Flush any remaining buffer content
    if (buffer.trim()) {
      try {
        const chunk: OllamaChunk = JSON.parse(buffer.trim());
        if (!chunk.done && chunk.message?.content) {
          yield chunk.message.content;
        }
      } catch {
        // Ignore incomplete trailing chunk
      }
    }
  } finally {
    reader.releaseLock();
  }
}
