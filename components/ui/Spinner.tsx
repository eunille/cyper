interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE: Record<string, string> = {
  sm: 'h-4 w-4 border-[1.5px]',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-2',
};

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div
      className={[
        'animate-spin rounded-full border-neutral-200 border-t-neutral-900',
        SIZE[size],
        className,
      ].join(' ')}
      aria-label="Loading"
      role="status"
    />
  );
}

/** Full-screen centered loading state */
export function PageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="md" />
        <p className="text-sm text-neutral-400">Loading…</p>
      </div>
    </div>
  );
}
