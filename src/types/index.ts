// ============================================================
// Domain Types
// ============================================================

/** Hàng sản phẩm động — hỗ trợ bất kỳ schema bảng nào */
export type DynamicProductRow = Record<string, unknown>;

/** Bản ghi xác nhận xuất hàng (bảng export_confirmations) */
export interface ExportConfirmation {
  stt: number;
  ma_san_pham: string;
  ho_ten: string;
  email: string;
  ngay_xuat: string;       // ISO date: YYYY-MM-DD
  thoi_gian_xuat: string;  // ISO time: HH:MM:SS
  created_at: string;      // ISO timestamp
}

// ============================================================
// API Contract — POST /api/confirm-shipment
// ============================================================

/** Dữ liệu gửi từ client khi xác nhận xuất hàng */
export interface ConfirmShipmentRequest {
  qrCode: string;    // Mã QR / Mã sản phẩm đã quét
  hoTen: string;     // Họ và tên người xác nhận
  email: string;     // Email người xác nhận
  chucVu: string;    // Chức vụ
  note?: string;     // Ghi chú (tuỳ chọn)
  maSanPhamXacNhan: string; // Mã sản phẩm nhập thủ công để đối chiếu
}

/** Phản hồi khi xác nhận thành công */
export interface ConfirmShipmentSuccess {
  success: true;
  message: string;
  confirmation: {
    ho_ten: string;
    email: string;
    ngay_xuat: string;
    thoi_gian_xuat: string;
    created_at: string;
    stt: number;
  };
  product: { id: string; name: string; status: string };
}

/** Phản hồi khi có lỗi */
export interface ConfirmShipmentError {
  success: false;
  error: string;
  code:
    | 'VALIDATION_ERROR'
    | 'PRODUCT_NOT_FOUND'
    | 'ALREADY_EXPORTED'
    | 'DATABASE_ERROR'
    | 'INTERNAL_ERROR';
}

export type ConfirmShipmentResponse = ConfirmShipmentSuccess | ConfirmShipmentError;
