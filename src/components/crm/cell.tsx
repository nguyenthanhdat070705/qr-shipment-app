import type { CrmColumn } from '@/config/crmModules';

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
  switch (col?.type) {
    case 'money':
      return formatMoney(v);
    case 'percent':
      return `${v}%`;
    case 'bool':
      return v === '1' || v.toLowerCase() === 'true' || v === 'Có' ? 'Có' : 'Không';
    case 'date':
      return v.length > 10 ? v.slice(0, 16).replace('T', ' ') : v;
    default:
      return v;
  }
}

export function isImageUrl(v: unknown): boolean {
  return /^https?:\/\/\S+\.(png|jpe?g|gif|webp|bmp|svg)/i.test(String(v ?? '')) || /^https?:\/\//.test(String(v ?? ''));
}
