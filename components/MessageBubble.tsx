'use client';

import { useState } from 'react';
import Markdown from 'react-markdown';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  isSystemNote?: boolean;
}

export function MessageBubble({ role, content, streaming = false, isSystemNote = false }: MessageBubbleProps) {
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  if (isSystemNote) {
    return (
      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-neutral-100" />
        <span className="text-[11px] font-medium text-neutral-400">{content}</span>
        <div className="h-px flex-1 bg-neutral-100" />
      </div>
    );
  }

  function handleCopy() {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => undefined);
  }

  return (
    <div className={['flex items-end gap-2', isUser ? 'justify-end' : 'justify-start'].join(' ')}>
      {!isUser && (
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-bold text-neutral-500">
          AI
        </div>
      )}

      <div className="group relative max-w-[75%]">
        <div
          className={[
            'rounded-2xl px-4 py-3 text-sm leading-relaxed',
            isUser
              ? 'rounded-br-sm bg-neutral-900 text-white'
              : 'rounded-bl-sm border border-neutral-200 bg-white text-neutral-800',
          ].join(' ')}
        >
          {/* Typing indicator — animated dots before first token */}
          {streaming && !content && (
            <div className="flex items-center gap-1 py-0.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400" />
            </div>
          )}

          {/* User messages: plain text. AI messages: markdown. */}
          {content && (
            isUser ? (
              <span className="whitespace-pre-wrap break-words">{content}</span>
            ) : (
              <div className="prose-sm prose-neutral max-w-none">
                <Markdown
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    pre: ({ children }) => (
                      <pre className="my-2 overflow-x-auto rounded-lg bg-neutral-900 p-3 text-neutral-100">
                        {children}
                      </pre>
                    ),
                    code: ({ className, children }) =>
                      className ? (
                        <code className={`font-mono text-xs ${className}`}>{children}</code>
                      ) : (
                        <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[0.82em] text-neutral-700">
                          {children}
                        </code>
                      ),
                    ul: ({ children }) => <ul className="my-1 ml-4 list-disc space-y-0.5">{children}</ul>,
                    ol: ({ children }) => <ol className="my-1 ml-4 list-decimal space-y-0.5">{children}</ol>,
                    li: ({ children }) => <li>{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  }}
                >
                  {content}
                </Markdown>
              </div>
            )
          )}

          {/* Blinking cursor while streaming */}
          {streaming && content && (
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current opacity-60" />
          )}
        </div>

        {/* Copy button — visible on hover for AI messages only */}
        {!isUser && !streaming && content && (
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy message"
            className="absolute -right-8 top-2 flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 opacity-0 transition-opacity hover:text-neutral-600 group-hover:opacity-100"
          >
            {copied ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-green-500">
                <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                <path fillRule="evenodd" d="M5.5 3.5A1.5 1.5 0 0 1 7 2h2.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 1 12.5 4.62V11.5A1.5 1.5 0 0 1 11 13H7a1.5 1.5 0 0 1-1.5-1.5v-8Zm1.5 0v8A.5.5 0 0 0 7 12h4a.5.5 0 0 0 .5-.5V5.5h-1A1.5 1.5 0 0 1 9 4V3H7a.5.5 0 0 0-.5.5ZM10 3v1a.5.5 0 0 0 .5.5h1l-1.5-1.5Z" clipRule="evenodd" />
                <path d="M3.5 6A1.5 1.5 0 0 0 2 7.5v5A1.5 1.5 0 0 0 3.5 14h4A1.5 1.5 0 0 0 9 12.5V12H7a2 2 0 0 1-2-2V6H3.5Z" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
