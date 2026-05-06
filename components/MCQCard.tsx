'use client';

import type { McqData } from '@/hooks/useSession';

interface MCQCardProps {
  messageId: string;
  mcq: McqData;
  answeredWith?: string; // key of the selected option, e.g. "A"
  onAnswer: (messageId: string, key: string, optionText: string) => void;
}

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;

export function MCQCard({ messageId, mcq, answeredWith, onAnswer }: MCQCardProps) {
  const locked = answeredWith !== undefined;

  return (
    <div className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      {/* Question */}
      <p className="mb-3 text-sm font-semibold leading-snug text-neutral-800">{mcq.q}</p>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {OPTION_KEYS.map((key) => {
          const text = mcq.opts[key];
          const isSelected = answeredWith === key;

          return (
            <button
              key={key}
              type="button"
              disabled={locked}
              onClick={() => !locked && onAnswer(messageId, key, text)}
              className={[
                'flex items-start gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition-colors',
                locked
                  ? isSelected
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'cursor-default border-neutral-200 bg-white text-neutral-400'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50 active:bg-neutral-100',
              ].join(' ')}
            >
              {/* Key badge */}
              <span
                className={[
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  locked
                    ? isSelected
                      ? 'bg-white text-neutral-900'
                      : 'bg-neutral-200 text-neutral-400'
                    : 'bg-neutral-100 text-neutral-600',
                ].join(' ')}
              >
                {key}
              </span>
              <span className="leading-snug">{text}</span>
            </button>
          );
        })}
      </div>

      {/* Lock state hint */}
      {locked && (
        <p className="mt-3 text-xs text-neutral-400">
          You selected <strong>{answeredWith}</strong> — your tutor will follow up.
        </p>
      )}
    </div>
  );
}
