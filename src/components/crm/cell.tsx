import type { CrmColumn } from '@/config/crmModules';
import { formatPhone, formatCccd } from '@/lib/khtt';

/** Suy ra "loại" ô: ưu tiên type khai trong config, sau đó tự nhận diện theo tên cột
 *  (cột chứa phone/mobile/so_dien_thoai → SĐT; cccd/vneid → CCCD) để thêm số 0 đầu. */
function inferKind(col?: CrmColumn): string | undefined {
  if (col?.type) return col.type;
  const k = (col?.key || '').toLowerCase();
  if (/phone|mobile|so_dien_thoai/.test(k)) return 'phone';
  if (/cccd|vneid/.test(k)) return 'cccd';
  return undefined;
}

/** Định dạng tiền VNĐ: 2160000 → "2.160.000đ". */
export function formatMoney(v: unknown): string {
  const s = String(v ?? '').trim();
  if (s === '') return '—';
  const n = parseFloat(s.replace(/,/g, ''));
  return Number.isFinite(n) ? `${n.toLocaleString('vi-VN')}đ` : s;
}

/** Giá trị 1 ô dạng text theo loại cột. */
export function cellText(col: CrmColumn | undefined, raw: unknown): string {
  const v = raw == null ? '' : String(raw);
  if (v.trim() === '') return '—';
  switch (inferKind(col)) {
    case 'money':
      return formatMoney(v);
    case 'percent':
      return `${v}%`;
    case 'bool':
      return v === '1' || v.toLowerCase() === 'true' || v === 'Có' ? 'Có' : 'Không';
    case 'date':
      return v.length > 10 ? v.slice(0, 16).replace('T', ' ') : v;
    case 'phone':
      return formatPhone(v);
    case 'cccd':
      return formatCccd(v);
    default:
      return v;
  }
}

export function isImageUrl(v: unknown): boolean {
  return /^https?:\/\/\S+\.(png|jpe?g|gif|webp|bmp|svg)/i.test(String(v ?? '')) || /^https?:\/\//.test(String(v ?? ''));
}
