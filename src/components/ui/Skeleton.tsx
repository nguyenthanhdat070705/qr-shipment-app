import { cn } from '@/lib/utils/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-surface-sunken', className)} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

/** Khung skeleton cho một thẻ KPI (dùng khi dashboard đang tải). */
export function SkeletonStat({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl bg-surface border border-border-subtle p-5', className)}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-20 mt-3" />
      <Skeleton className="h-3 w-16 mt-3" />
    </div>
  );
}
