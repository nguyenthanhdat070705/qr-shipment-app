import type { DynamicProductRow } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { PRODUCT_CONFIG, getFieldLabel } from '@/config/product.config';
import { Clock } from 'lucide-react';
import QRCodeDisplay from '@/components/QRCodeDisplay';

interface ProductDetailCardProps {
  row: DynamicProductRow;
}

// ── Kiểm tra kiểu giá trị để định dạng phù hợp ──────────────

/** True nếu chuỗi trông giống ISO timestamp (có chữ T) */
function isTimestamp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T/.test(value);
}

/** True nếu chuỗi trông giống ISO date (YYYY-MM-DD) */
function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Định dạng giá trị ô dữ liệu thành chuỗi hiển thị Tiếng Việt */
function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  if (typeof value === 'number') return value.toLocaleString('vi-VN');
  if (typeof value === 'object') return JSON.stringify(value);

  const str = String(value);

  if (isTimestamp(str)) {
    return new Date(str).toLocaleString('vi-VN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  }

  if (isDateOnly(str)) {
    return new Date(str + 'T00:00:00').toLocaleDateString('vi-VN', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  return str;
}

/**
 * Sắp xếp các khoá của row theo thứ tự ưu tiên trong FIELD_ORDER,
 * sau đó theo thứ tự bảng chữ cái cho các trường còn lại.
 */
function sortedFields(row: DynamicProductRow): string[] {
  const hiddenSet = new Set(PRODUCT_CONFIG.HIDDEN_FIELDS);
  const statusCol = PRODUCT_CONFIG.STATUS_COLUMN;
  const orderList = PRODUCT_CONFIG.FIELD_ORDER as readonly string[];

  // loại bỏ cột trạng thái và cột ẩn — trạng thái hiển thị ở header
  const allKeys = Object.keys(row).filter(
    (k) => !hiddenSet.has(k) && k !== statusCol
  );

  const prioritised = orderList.filter((k) => allKeys.includes(k));
  const rest = allKeys
    .filter((k) => !new Set(orderList).has(k))
    .sort((a, b) => a.localeCompare(b, 'vi'));

  return [...prioritised, ...rest];
}

interface FieldRowProps {
  label: string;
  value: string;
}

function FieldRow({ label, value }: FieldRowProps) {
  const isEmpty = value === '—';
  return (
    <div className="flex flex-col gap-0.5 py-3 border-b border-gray-100 last:border-b-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`text-sm font-medium break-words ${isEmpty ? 'text-gray-300 italic' : 'text-gray-800'}`}>
        {value}
      </p>
    </div>
  );
}

/**
 * Thẻ thông tin sản phẩm — hiển thị TẤT CẢ các trường từ hàng dữ liệu
 * theo đúng nhãn Tiếng Việt được cấu hình trong product.config.ts.
 */
export default function ProductDetailCard({ row }: ProductDetailCardProps) {
  const statusValue = String(row[PRODUCT_CONFIG.STATUS_COLUMN] ?? '');

  // Lấy tên hiển thị của sản phẩm: ưu tiên 'name', sau đó trường đầu tiên có giá trị
  const productName =
    (row['name'] as string | undefined) ??
    (row['product_name'] as string | undefined) ??
    (row['ten_san_pham'] as string | undefined) ??
    'Sản phẩm';

  const fields = sortedFields(row);

  // Tách các trường timestamp hệ thống (created_at, updated_at) ra footer
  const FOOTER_FIELDS = ['created_at', 'updated_at'];
  const mainFields = fields.filter((k) => !FOOTER_FIELDS.includes(k));
  const footerFields = FOOTER_FIELDS.filter((k) => k in row && !new Set(PRODUCT_CONFIG.HIDDEN_FIELDS).has(k));

  // Tách trường hình ảnh và giá bán để hiển thị riêng ở giữa
  const rawImgUrl = (row['hinh_anh'] as string) || (row['Hinh anh'] as string);
  const imgUrl = (!rawImgUrl || rawImgUrl === '—' || String(rawImgUrl).trim() === '') ? '/placeholder.png' : rawImgUrl;
  const giaBan = row['gia_ban'] ?? row['Gia ban'];
  
  // Lọc bỏ hình ảnh và giá bán khỏi danh sách render tự động
  const excluded = new Set(['hinh_anh', 'gia_ban', 'Hinh anh', 'Gia ban', 'status', 'Trang thai']);
  const mainFieldsFiltered = mainFields.filter((k) => !excluded.has(k));

  // Tình trạng kho hàng
  const tonKho = row['ton_kho'] ?? row['Ton kho'];
  const isOutOfStock = !tonKho || tonKho === '—' || String(tonKho).trim() === '';
  
  // Lấy status từ hệ thống (ưu tiên đã xuất) để hiển thị góc phải
  let displayStatus = statusValue;
  if (statusValue !== PRODUCT_CONFIG.EXPORTED_STATUS_VALUE) {
    displayStatus = isOutOfStock ? 'unavailable' : 'in_stock';
  }

  // Chia đôi danh sách field để chèn hình ảnh vào giữa
  const splitIndex = Math.ceil(mainFieldsFiltered.length / 2);
  const firstHalf = mainFieldsFiltered.slice(0, splitIndex);
  const secondHalf = mainFieldsFiltered.slice(splitIndex);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Tiêu đề thẻ với gradient */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 pr-2">
            <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">
              Tên sản phẩm
            </p>
            <h2 className="text-white text-xl font-bold leading-tight line-clamp-2">{productName}</h2>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <StatusBadge statusValue={displayStatus} size="md" />
            {!isOutOfStock && tonKho !== '—' && (
              <span className="text-[10px] text-white/90 font-medium bg-white/15 border border-white/20 px-2 py-0.5 rounded backdrop-blur-sm max-w-[130px] text-right leading-tight">
                {String(tonKho)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Thân thẻ — tất cả các trường */}
      <div className="px-5 py-2">
        {mainFieldsFiltered.length === 0 && !imgUrl && (
          <p className="py-6 text-center text-sm text-gray-400">Không có dữ liệu hiển thị.</p>
        )}
        
        {/* Nửa đầu thông tin */}
        {firstHalf.map((key) => (
          <FieldRow key={key} label={getFieldLabel(key)} value={formatValue(row[key])} />
        ))}

        {/* Khối Hình ảnh & Giá bán (Nằm giữa) */}
        {Boolean(imgUrl || giaBan) && (
          <div className="py-5 border-b border-gray-100 last:border-b-0">
            {Boolean(imgUrl) && imgUrl !== '—' && (
              <div className="mb-3 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgUrl as string} alt={productName} className="max-h-64 object-contain" />
              </div>
            )}
            {Boolean(giaBan) && giaBan !== '—' && (
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                  {getFieldLabel('gia_ban')}
                </p>
                <p className="text-xl font-extrabold text-indigo-600">
                  {Number(giaBan).toLocaleString('vi-VN')} VNĐ
                </p>
              </div>
            )}
          </div>
        )}

        {/* Nửa sau thông tin */}
        {secondHalf.map((key) => (
          <FieldRow key={key} label={getFieldLabel(key)} value={formatValue(row[key])} />
        ))}
        
        {/* QR Code Mẫu */}
        <div className="py-6 flex flex-col items-center justify-center border-t border-gray-100 mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
            Mã QR Liên Kết Sản Phẩm
          </p>
          <QRCodeDisplay code={String(row[PRODUCT_CONFIG.LOOKUP_COLUMN as keyof typeof row] || row['product_code'] || row['qr_code'] || '')} size={160} />
        </div>
      </div>

      {/* Chân thẻ — timestamps */}
      {footerFields.length > 0 && (
        <div className="bg-gray-50 px-5 py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
          {footerFields.map((key) => (
            <span key={key} className="text-xs text-gray-400">
              <Clock size={11} className="inline mr-1 mb-0.5" />
              {getFieldLabel(key)}: {formatValue(row[key])}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
