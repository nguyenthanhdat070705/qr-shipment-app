/**
 * Bộ component UI dùng chung của Blackstones (GĐ2 — Design System).
 * Tất cả đều dùng token ngữ nghĩa (surface/text/border/primary/accent) trong globals.css,
 * tự đổi theo Sáng/Tối. Dùng `import { Button, Card, ... } from '@/components/ui'`.
 */
export { Button } from './Button';
export type { ButtonProps } from './Button';
export { Card, CardHeader, CardBody } from './Card';
export { Badge } from './Badge';
export type { BadgeTone } from './Badge';
export { StatCard } from './StatCard';
export { Skeleton, SkeletonText, SkeletonStat } from './Skeleton';
export { EmptyState } from './EmptyState';
export { PageHeader } from './PageHeader';
