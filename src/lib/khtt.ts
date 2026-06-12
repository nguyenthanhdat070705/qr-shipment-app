/**
 * Khách Hàng Trăm Tuổi (KHTT) — logic dùng chung.
 *
 * Một "hợp đồng nền Trăm Tuổi" trong GetFly là một ĐƠN HÀNG BÁN (order_type = 2)
 * có mã chứa "KHTT". Khi khách còn sống đơn ở trạng thái "Chờ duyệt" (status = 1);
 * khi khách mất, đơn được "Đã duyệt" (status = 2) → hợp đồng nền đã dùng → ẩn đi.
 *
 * Xem [[reference_getfly_api]] về cách lấy dữ liệu (chỉ ĐỌC, API v3 chính thức).
 */

// Trạng thái duyệt đơn GetFly: 1 = Chờ duyệt, 2 = Đã duyệt, 3..5 = khác.
export const KHTT_STATUS_WAITING = '1';
export const KHTT_STATUS_WAITING_LABEL = 'Chờ duyệt';

/** Đơn KHTT = mã đơn hàng có chứa "KHTT" (không phân biệt hoa thường). */
export function isKhttOrderCode(code: unknown): boolean {
  return /KHTT/i.test(String(code ?? ''));
}

/** Bản ghi KHTT đang hoạt động = đơn KHTT + đang Chờ duyệt. */
export function isActiveKhttOrder(orderCode: unknown, statusCode: unknown): boolean {
  return isKhttOrderCode(orderCode) && String(statusCode ?? '') === KHTT_STATUS_WAITING;
}

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

/** Bản ghi KHTT trả về cho UI (8 trường hiển thị). */
export interface KhttRecord {
  getfly_order_id: string;
  order_code: string | null;        // Mã đơn hàng / Mã HĐ nền
  order_date: string | null;        // Ngày đặt hàng
  order_status: string | null;      // Trạng thái (Chờ duyệt)
  customer_code: string | null;     // Mã Khách Hàng
  customer_name: string | null;     // Họ tên
  customer_phone: string | null;    // SĐT
  package_name: string | null;      // Gói sử dụng
  total_value: number;              // Tổng giá trị gói
  paid_amount: number;              // Đã thanh toán
  remaining_amount: number;         // Số tiền còn lại
  beneficiary_name: string | null;  // Người thụ hưởng
  beneficiary_phone: string | null; // SĐT người thụ hưởng
  person_in_charge: string | null;  // Người phụ trách
  expiry_date: string | null;       // Ngày hết hạn (nhập thủ công)
}
