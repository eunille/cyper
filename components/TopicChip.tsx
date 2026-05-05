'use client';

import { card, difficulty as diffTokens } from '@/theme/tokens';

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

export function TopicChip({ topic, selected, onSelect }: TopicChipProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2',
        selected ? card.selected : card.interactive,
      ].join(' ')}
    >
      {/* Left: name + category */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-neutral-900">{topic.name}</p>
        <p className="mt-0.5 text-xs text-neutral-400">{topic.category}</p>
      </div>

      {/* Right: difficulty badge + checkmark */}
      <div className="flex flex-shrink-0 items-center gap-2">
        <span className={diffTokens[topic.difficulty]}>{topic.difficulty}</span>
        <div
          className={[
            'flex h-5 w-5 items-center justify-center rounded-full transition-all',
            selected ? 'bg-neutral-900 text-white' : 'border-2 border-neutral-200',
          ].join(' ')}
        >
          {selected && <span className="text-[10px] leading-none">✓</span>}
        </div>
      </div>
    </button>
  );
}
