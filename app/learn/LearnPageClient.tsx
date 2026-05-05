'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PersonaCard } from '@/components/PersonaCard';

interface Persona {
  personaId: string;
  name: string;
  role: string;
  specialization: string;
  teachingStyle: string;
  tone: string;
}

interface LearnPageClientProps {
  personas: Persona[];
}

export function LearnPageClient({ personas }: LearnPageClientProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  function handleContinue() {
    if (!selected) return;
    sessionStorage.setItem('personaId', selected);
    router.push('/learn/topics');
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Step header */}
      <header className="sticky top-0 z-10 border-b border-neutral-100 bg-white px-4 py-3">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
              aria-label="Exit to dashboard"
            >
              ×
            </a>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
              <div className="h-full w-1/2 rounded-full bg-neutral-900 transition-all" />
            </div>
            <span className="flex-shrink-0 text-xs font-medium text-neutral-400">1 / 2</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-lg px-4 py-8 pb-28">
        <h1 className="mb-1 text-2xl font-bold text-neutral-900">Choose your tutor</h1>
        <p className="mb-8 text-sm text-neutral-500">
          Each tutor has a distinct teaching style. Pick the one that fits how you learn.
        </p>

        <div className="space-y-3">
          {personas.map((p) => (
            <PersonaCard
              key={p.personaId}
              persona={p}
              selected={selected === p.personaId}
              onSelect={() => setSelected(p.personaId)}
            />
          ))}
        </div>
      </main>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-neutral-100 bg-white px-4 py-4">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            disabled={!selected}
            onClick={handleContinue}
            className="w-full rounded-xl bg-neutral-900 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
