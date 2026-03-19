import { PRODUCT_CONFIG, getStatusLabel } from '@/config/product.config';

interface StatusBadgeProps {
  statusValue: string;
  size?: 'sm' | 'md' | 'lg';
}

const DEFAULT_COLORS = { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' };

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
};

/**
 * Badge trạng thái — màu sắc và nhãn đọc từ PRODUCT_CONFIG.
 * Tự động hỗ trợ bất kỳ giá trị trạng thái nào được khai báo trong config.
 */
export default function StatusBadge({ statusValue, size = 'md' }: StatusBadgeProps) {
  const colors =
    (PRODUCT_CONFIG.STATUS_COLORS as Record<string, typeof DEFAULT_COLORS>)[statusValue] ??
    DEFAULT_COLORS;

  const label = getStatusLabel(statusValue);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap shrink-0 ${colors.bg} ${colors.text} ${SIZE_CLASSES[size]}`}
    >
      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${colors.dot}`} />
      {label}
    </span>
  );
}
