/**
 * Chuẩn hoá & định dạng SĐT / CCCD / tiền — HELPER THUẦN, KHÔNG gắn với luồng nào.
 *
 * Trước đây nằm trong `@/lib/khtt` (luồng Khách Hàng Trăm Tuổi) nhưng cả hội viên
 * (`hopDongBanSheet.ts`) lẫn CRM sync (`crmSheetSync.ts`) đều dùng → tách ra module
 * trung lập này để hội viên KHÔNG phụ thuộc file mang tên "khtt". Hành vi giữ NGUYÊN
 * 100% so với bản cũ (chỉ đổi vị trí). Xem [[feedback_tram_tuoi_tach_biet]].
 */

/** Chuẩn hoá SĐT: bỏ ký tự không phải số, đổi tiền tố 84 → 0. */
export function normalizePhone(phone: unknown): string {
  const digits = String(phone ?? '').replace(/\D/g, '');
  return digits.startsWith('84') ? `0${digits.slice(2)}` : digits;
}

/**
 * Khoá so khớp SĐT (bền vững): bỏ ký tự lạ, bỏ tiền tố 84 và số 0 đầu.
 * Dùng để khớp "0937789023" ⇄ "937789023" (GetFly hay lưu thiếu số 0 đầu).
 */
export function phoneKey(phone: unknown): string {
  let d = String(phone ?? '').replace(/\D/g, '');
  if (d.startsWith('84')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  return d;
}

/** Khoá so khớp CCCD/VNeID: chỉ giữ chữ số, bỏ MỌI số 0 đầu (KHÔNG động tới 84). */
export function cccdKey(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '').replace(/^0+/, '');
}

/**
 * Hiển thị SĐT có số 0 đầu (data sync rớt số 0 vì lưu dạng số).
 * "975882255" → "0975882255"; "84975882255" → "0975882255"; giữ nguyên nếu đã có 0.
 */
export function formatPhone(value: unknown): string {
  let d = String(value ?? '').replace(/\D/g, '');
  if (!d) return String(value ?? '');
  if (d.startsWith('84') && d.length >= 11) d = d.slice(2); // bỏ mã quốc gia
  if (!d.startsWith('0')) d = '0' + d;
  return d;
}

/**
 * Hiển thị CCCD có số 0 đầu. CCCD 12 số luôn bắt đầu bằng 0 (mã tỉnh ≤ 096);
 * data rớt 0 → còn 11 số → thêm lại 0. Các độ dài khác giữ nguyên.
 */
export function formatCccd(value: unknown): string {
  const d = String(value ?? '').replace(/\D/g, '');
  if (!d) return String(value ?? '');
  if (d.length === 11) return '0' + d;
  return d;
}

/** Chuyển chuỗi tiền kiểu "110,817,500" hoặc số → number. */
export function toAmount(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = parseFloat(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** Định dạng tiền VNĐ (vd: 80000000 → "80.000.000"). */
export function formatVnd(value: unknown): string {
  const n = toAmount(value);
  return n.toLocaleString('vi-VN');
}
