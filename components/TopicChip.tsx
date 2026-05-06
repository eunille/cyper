'use client';

import { difficulty as diffTokens } from '@/theme/tokens';

type Difficulty = 'beginner' | 'intermediate' | 'advanced';

interface Topic {
  topicId: string;
  name: string;
  category: string;
  difficulty: Difficulty;
}

interface TopicChipProps {
  topic: Topic;
  selected: boolean;
  onSelect: () => void;
}

// Left accent strip color per difficulty
const ACCENT: Record<Difficulty, string> = {
  beginner:     'bg-emerald-400',
  intermediate: 'bg-amber-400',
  advanced:     'bg-rose-400',
};

export function TopicChip({ topic, selected, onSelect }: TopicChipProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'group relative w-full overflow-hidden rounded-2xl border text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2',
        selected
          ? 'border-neutral-900 bg-neutral-900 shadow-md'
          : 'border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm',
      ].join(' ')}
    >
      <div className="flex items-center gap-0">
        {/* Left difficulty accent strip */}
        <div
          className={[
            'w-1 self-stretch flex-shrink-0 rounded-l-2xl transition-all',
            selected ? 'opacity-0' : ACCENT[topic.difficulty],
          ].join(' ')}
        />

        {/* Content */}
        <div className="flex flex-1 items-center justify-between gap-3 px-4 py-3.5">
          {/* Left: name + category */}
          <div className="min-w-0 flex-1">
            <p className={[
              'truncate text-sm font-semibold transition-colors',
              selected ? 'text-white' : 'text-neutral-900',
            ].join(' ')}>
              {topic.name}
            </p>
            <p className={[
              'mt-0.5 text-xs transition-colors',
              selected ? 'text-neutral-300' : 'text-neutral-400',
            ].join(' ')}>
              {topic.category}
            </p>
          </div>

          {/* Right: difficulty badge + radio */}
          <div className="flex flex-shrink-0 items-center gap-2.5">
            <span className={[
              diffTokens[topic.difficulty],
              selected ? 'opacity-70' : '',
            ].join(' ')}>
              {topic.difficulty}
            </span>
            <div className={[
              'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all',
              selected
                ? 'border-white bg-white'
                : 'border-neutral-300 group-hover:border-neutral-500',
            ].join(' ')}>
              {selected && (
                <div className="h-2 w-2 rounded-full bg-neutral-900" />
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
