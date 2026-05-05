import type { Message } from '@/types/session';
import { sectionLabel } from '@/theme/tokens';

interface Props {
  messages: Message[];
}

export function TranscriptPanel({ messages }: Props) {
  return (
    <div className="flex flex-1 flex-col rounded-2xl border border-neutral-100 bg-white overflow-hidden lg:sticky lg:top-8 lg:max-h-[calc(100vh-6rem)]">
      <div className="border-b border-neutral-100 px-5 py-4 flex-shrink-0">
        <h2 className="text-sm font-semibold text-neutral-900">
          Transcript
          <span className={`ml-2 font-normal ${sectionLabel}`}>{messages.length} messages</span>
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.message_id}
            className={['flex gap-2.5', m.role === 'user' ? 'justify-end' : 'justify-start'].join(' ')}
          >
            {m.role === 'assistant' && (
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[9px] font-bold text-neutral-500">
                AI
              </div>
            )}
            <div
              className={[
                'max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed',
                m.role === 'user'
                  ? 'rounded-br-sm bg-neutral-900 text-white'
                  : 'rounded-bl-sm border border-neutral-100 bg-neutral-50 text-neutral-700',
              ].join(' ')}
            >
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
              <p className="mt-1 text-[10px] capitalize text-neutral-400 opacity-70">
                {m.phase_at_send}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
