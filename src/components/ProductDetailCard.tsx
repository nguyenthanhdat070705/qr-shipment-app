import type { DynamicProductRow } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { PRODUCT_CONFIG } from '@/config/product.config';
import { Clock } from 'lucide-react';

interface ProductDetailCardProps {
  row: DynamicProductRow;
}

/** Format giá tiền */
function formatPrice(value: unknown): string {
  if (!value || value === '—') return '—';
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return num.toLocaleString('vi-VN');
}

/** Format timestamp */
function formatTimestamp(value: unknown): string {
  if (!value || value === '—') return '—';
  const str = String(value);
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    return new Date(str).toLocaleString('vi-VN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  }
  return str;
}

/**
 * Get a placeholder coffin image based on product code hash.
 * This gives each product a different but consistent image.
 */
function getCoffinImage(productCode: string): string {
  let hash = 0;
  for (let i = 0; i < productCode.length; i++) {
    hash = ((hash << 5) - hash + productCode.charCodeAt(i)) | 0;
  }
  const index = (Math.abs(hash) % 5) + 1; // 1-5
  return `/coffin-${index}.png`;
}

/**
 * Thẻ thông tin sản phẩm — giao diện tinh gọn, chỉ hiển thị
 * những trường quan trọng nhất.
 */
export default function ProductDetailCard({ row }: ProductDetailCardProps) {
  const statusValue = String(row[PRODUCT_CONFIG.STATUS_COLUMN] ?? '');

  const productName =
    (row['name'] as string | undefined) ??
    (row['product_name'] as string | undefined) ??
    (row['ten_san_pham'] as string | undefined) ??
    'Sản phẩm';

  const productCode = String(
    row[PRODUCT_CONFIG.LOOKUP_COLUMN as keyof typeof row] ??
    row['product_code'] ?? ''
  );

  // Image: use hinh_anh from DB, fallback to coffin placeholder
  const rawImg = String(row['hinh_anh'] ?? row['Hinh anh'] ?? '');
  const hasRealImage = rawImg && rawImg !== '—' && rawImg.trim() !== '' && rawImg.startsWith('http');
  const imgUrl: string = hasRealImage ? rawImg : getCoffinImage(productCode);

  // Price
  const giaBanRaw = row['gia_ban'] ?? row['Gia ban'];
  const giaBanStr = String(giaBanRaw ?? '');
  const hasPrice = giaBanStr && giaBanStr !== '—' && giaBanStr.trim() !== '';

  // Stock status
  const tonKho = String(row['ton_kho'] ?? row['Ton kho'] ?? '');
  const isOutOfStock = !tonKho || tonKho === '—' || tonKho.trim() === '';

  let displayStatus = statusValue;
  if (statusValue !== PRODUCT_CONFIG.EXPORTED_STATUS_VALUE) {
    displayStatus = isOutOfStock ? 'unavailable' : 'in_stock';
  }

  // Serial
  const serialStr = String(row['serial_no'] ?? row['Seri'] ?? '');

  // Timestamps
  const createdAtStr = String(row['created_at'] ?? '');
  const updatedAtStr = String(row['updated_at'] ?? '');

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* ── Header gradient ──────────────────────────── */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 pr-2">
            <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-1">
              Sản phẩm
            </p>
            <h2 className="text-white text-lg font-bold leading-tight line-clamp-2">
              {productName}
            </h2>
          </div>
          <StatusBadge statusValue={displayStatus} size="md" />
        </div>
      </div>

      {/* ── Product Image ────────────────────────────── */}
      <div className="px-5 pt-5">
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgUrl}
            alt={productName}
            className="w-full max-h-56 object-contain p-2"
          />
        </div>
      </div>

      {/* ── Key Info ──────────────────────────────────── */}
      <div className="px-5 py-4 space-y-0">
        {/* Mã sản phẩm */}
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Mã sản phẩm</span>
          <span className="text-sm font-mono font-bold text-indigo-600">{productCode}</span>
        </div>

        {/* Giá bán */}
        {hasPrice && (
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Giá bán</span>
            <span className="text-lg font-extrabold text-indigo-600">
              {formatPrice(giaBanStr)} <span className="text-xs font-semibold text-gray-400">VNĐ</span>
            </span>
          </div>
        )}

        {/* Số serial */}
        {serialStr && serialStr.trim() !== '' && serialStr !== '—' && (
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Số serial</span>
            <span className="text-sm font-mono font-medium text-gray-700">{serialStr}</span>
          </div>
        )}

        {/* Tình trạng kho */}
        <div className="flex items-center justify-between py-3">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Tình trạng</span>
          <StatusBadge statusValue={displayStatus} size="sm" />
        </div>
      </div>

      {/* ── Footer timestamps ────────────────────────── */}
      {(createdAtStr || updatedAtStr) && (
        <div className="bg-gray-50 px-5 py-2.5 flex flex-col sm:flex-row sm:justify-between gap-0.5">
          {createdAtStr && createdAtStr !== '' && (
            <span className="text-[11px] text-gray-400">
              <Clock size={10} className="inline mr-1 mb-0.5" />
              Tạo: {formatTimestamp(createdAtStr)}
            </span>
          )}
          {updatedAtStr && updatedAtStr !== '' && (
            <span className="text-[11px] text-gray-400">
              <Clock size={10} className="inline mr-1 mb-0.5" />
              Cập nhật: {formatTimestamp(updatedAtStr)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
