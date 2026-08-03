/**
 * Khách Hàng Trăm Tuổi (KHTT) — logic RIÊNG của luồng khách hàng.
 *
 * Một "hợp đồng nền Trăm Tuổi" trong GetFly là một ĐƠN HÀNG BÁN (order_type = 2)
 * có mã chứa "KHTT". Khi khách còn sống đơn ở trạng thái "Chờ duyệt" (status = 1);
 * khi khách mất, đơn được "Đã duyệt" (status = 2) → hợp đồng nền đã dùng → ẩn đi.
 *
 * Các helper chuẩn hoá/định dạng (phoneKey, cccdKey, formatPhone, formatCccd, toAmount,
 * formatVnd, normalizePhone) đã TÁCH sang [[normalize]] (src/lib/normalize.ts) để hội viên
 * không phụ thuộc file này. KHÔNG đưa helper dùng chung trở lại đây.
 * Xem [[feedback_tram_tuoi_tach_biet]] và [[reference_getfly_api]].
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
