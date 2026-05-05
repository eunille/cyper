'use client';

import { card } from '@/theme/tokens';

interface Persona {
  personaId: string;
  name: string;
  role: string;
  specialization: string;
  teachingStyle: string;
  tone: string;
}

interface PersonaCardProps {
  persona: Persona;
  selected: boolean;
  onSelect: () => void;
}

function getInitials(name: string): string {
  const cleaned = name.replace(/^(Prof\.|Dr\.|Agent)\s+/i, '');
  return cleaned
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function getTeachingTag(style: string): string {
  return style.split('—')[0]?.trim().split('·')[0]?.trim() ?? style.split(' ').slice(0, 3).join(' ');
}

export function PersonaCard({ persona, selected, onSelect }: PersonaCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'w-full flex items-center gap-4 p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2',
        selected ? card.selected : card.interactive,
      ].join(' ')}
    >
      {/* Avatar */}
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-bold text-white">
        {getInitials(persona.name)}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-neutral-900">{persona.name}</p>
        <p className="text-sm text-neutral-500">{persona.role}</p>
        <span className="mt-1 inline-block rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
          {getTeachingTag(persona.teachingStyle)}
        </span>
      </div>

      {/* Checkmark */}
      <div
        className={[
          'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-all',
          selected ? 'bg-neutral-900 text-white' : 'border-2 border-neutral-200',
        ].join(' ')}
      >
        {selected && <span className="text-[10px] leading-none">✓</span>}
      </div>
    </button>
  );
}
