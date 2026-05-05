import type { ReactNode } from 'react';

// Minimal inline SVG icons for stat strip
const ICONS: Record<string, ReactNode> = {
  Sessions: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  'Avg score': (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  'Best score': (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  Topics: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  Mastered: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
  'Day streak': (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
    </svg>
  ),
};

interface StatItem {
  label: string;
  value: string | number;
}

interface Props {
  items: StatItem[];
  cols?: 4 | 6;
}

export function StatRow({ items }: Props) {
  return (
    <div className="mb-5 flex divide-x divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-100 bg-white">
      {items.map(({ label, value }) => (
        <div key={label} className="flex min-w-0 flex-1 items-center gap-2.5 px-4 py-3">
          <span className="shrink-0 text-neutral-400">{ICONS[label]}</span>
          <div className="min-w-0">
            <p className="text-base font-bold leading-tight text-neutral-900">{value}</p>
            <p className="mt-0.5 text-[11px] text-neutral-400">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

interface ProgressEmptyProps {
  label?: string;
}

export function ProgressEmptyState({ label = 'No progress yet. Start a session to begin tracking.' }: ProgressEmptyProps) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-12 text-center">
      <p className="text-neutral-400">{label}</p>
      <a
        href="/learn"
        className="mt-4 inline-block rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
      >
        Start learning →
      </a>
    </div>
  );
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-sm font-semibold text-neutral-900">{children}</h2>;
}

interface TableColumn<T> {
  key: string;
  label: string;
  align?: 'left' | 'right';
  render: (row: T) => ReactNode;
}

interface DataTableProps<T extends { id: string }> {
  columns: TableColumn<T>[];
  rows: T[];
}

export function DataTable<T extends { id: string }>({ columns, rows }: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-neutral-100 bg-neutral-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={[
                  'px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-400',
                  col.align === 'right' ? 'text-right' : 'text-left',
                ].join(' ')}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-50">
          {rows.map((row) => (
            <tr key={row.id} className="transition-colors hover:bg-neutral-50">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={['px-4 py-3', col.align === 'right' ? 'text-right' : ''].join(' ')}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
