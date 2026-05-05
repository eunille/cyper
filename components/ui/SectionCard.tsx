import { sectionCard, sectionLabel } from '@/theme/tokens';

interface SectionCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  /** Render an element in the top-right of the header row */
  headerRight?: React.ReactNode;
}

/**
 * Reusable card shell used throughout the result page, dashboard, etc.
 * Applies the standard `rounded-2xl border border-neutral-100 bg-white p-5` pattern.
 */
export function SectionCard({ title, children, className = '', headerRight }: SectionCardProps) {
  return (
    <div className={`${sectionCard} ${className}`}>
      {title && (
        <div className={`mb-3 flex items-center justify-between ${headerRight ? '' : 'mb-3'}`}>
          <h2 className={sectionLabel}>{title}</h2>
          {headerRight}
        </div>
      )}
      {children}
    </div>
  );
}
