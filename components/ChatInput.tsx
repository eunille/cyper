'use client';

import { useRef, useState, type KeyboardEvent } from 'react';

const MAX_LENGTH = 4000;

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  quickReplies?: readonly string[];
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled,
  quickReplies = ["I'm stuck", 'Explain more', 'Give me a hint'],
  placeholder = 'Message your tutor… (Enter to send)',
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setValue('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  const canSend = Boolean(value.trim()) && !disabled;

  return (
    <div className="px-4 pb-6 pt-2">
      {/* Quick reply chips */}
      {quickReplies.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onSend(reply)}
              className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:bg-neutral-50 disabled:pointer-events-none disabled:opacity-30"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* ChatGPT-style input container */}
      <div
        className={[
          'relative flex flex-col rounded-2xl border bg-white transition-all',
          disabled
            ? 'border-neutral-100 opacity-60'
            : 'border-neutral-200 shadow-sm focus-within:border-neutral-300 focus-within:shadow-md',
        ].join(' ')}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MAX_LENGTH))}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          maxLength={MAX_LENGTH}
          aria-label="Chat message"
          className="w-full resize-none bg-transparent px-4 pb-3 pt-4 text-sm leading-relaxed text-neutral-900 placeholder-neutral-400 focus:outline-none disabled:cursor-not-allowed"
        />

        {/* Bottom row: char count + send */}
        <div className="flex items-center justify-between px-3 pb-2.5">
          <span className="text-[11px] text-neutral-300 tabular-nums">
            {value.length > MAX_LENGTH * 0.8 ? `${MAX_LENGTH - value.length} left` : ''}
          </span>
          <button
            type="button"
            disabled={!canSend}
            onClick={handleSend}
            aria-label="Send message"
            className={[
              'flex h-8 w-8 items-center justify-center rounded-full transition-all',
              canSend
                ? 'bg-neutral-900 text-white hover:bg-neutral-700'
                : 'bg-neutral-100 text-neutral-300',
            ].join(' ')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.288Z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Shift+Enter hint */}
      <p className="mt-1.5 text-center text-[11px] text-neutral-300">
        Shift + Enter for a new line
      </p>
    </div>
  );
}
