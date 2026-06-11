import { cn } from '@/lib/utils/cn';

type Tone = 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const ICON_TONES: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary dark:bg-primary/25',
  accent: 'bg-brand-100 text-brand-700 dark:bg-brand-400/15 dark:text-brand-300',
  success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  danger: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300',
  info: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
};

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = 'primary',
  onClick,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: Tone;
  onClick?: () => void;
  className?: string;
}) {
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
      className={cn(
        'rounded-2xl bg-surface border border-border-subtle shadow-[var(--shadow-card)] p-4 sm:p-5 transition-all',
        interactive && 'cursor-pointer hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted truncate">{label}</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-text-strong mt-1.5 tabular-nums leading-none">{value}</p>
          {sub && <p className="text-xs text-text-muted mt-2">{sub}</p>}
        </div>
        {icon && (
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0', ICON_TONES[tone])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
