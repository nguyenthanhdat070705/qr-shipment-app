/**
 * ============================================================
 * product.config.ts — Cấu hình trung tâm ứng dụng QR Xuất kho
 * ============================================================
 * Chỉ cần chỉnh sửa file này để kết nối với bảng Supabase thực.
 */

export const PRODUCT_CONFIG = {
  // ── Cấu hình Bảng sản phẩm ─────────────────────────────────
  /** Tên bảng Supabase chứa thông tin sản phẩm */
  TABLE_NAME: 'products',

  /**
   * Cột dùng để TRA CỨU sản phẩm khi quét mã QR / nhập mã.
   * Trong luồng thực tế: QR value = Mã sản phẩm → dùng cột product_code
   */
  LOOKUP_COLUMN: 'code',

  /**
   * Cột lưu MÃ SẢN PHẨM thực tế — sẽ được lưu vào trường ma_san_pham
   * của bảng export_confirmations. Thường giống LOOKUP_COLUMN.
   */
  PRODUCT_CODE_COLUMN: 'code',

  /** Cột lưu trạng thái vòng đời của sản phẩm */
  STATUS_COLUMN: 'is_active',

  /**
   * Giá trị trong STATUS_COLUMN đại diện cho "đã xuất kho".
   * Khi sản phẩm có giá trị này → form xác nhận bị khóa.
   */
  EXPORTED_STATUS_VALUE: 'exported',

  // ── Cấu hình Bảng xác nhận xuất hàng ──────────────────────
  /** Tên bảng Supabase lưu lịch sử xác nhận xuất hàng */
  CONFIRMATION_TABLE: 'export_confirmations',

  // ── Nhãn hiển thị (Tiếng Việt) ────────────────────────────
  /**
   * Ánh xạ từ tên cột → nhãn Tiếng Việt.
   * Thêm/xóa các mục để khớp với schema bảng thực của bạn.
   */
  DISPLAY_LABELS: {
    // — Thông tin cơ bản —
    'mã sản phẩm':    'Mã sản phẩm',
    'sản phẩm':       'Tên sản phẩm',
    'gói sản phẩm':   'Gói sản phẩm',
    'kho nào':        'Kho',
    'số lượng trên web': 'Số lượng trên web',
    qr_code:          'Mã QR',
    barcode:          'Mã vạch',
    sku:              'SKU',
    description:      'Mô tả',
    // — Thông tin lô —
    batch_no:         'Số lô',
    serial_no:        'Số serial',
    manufacture_date: 'Ngày sản xuất',
    expiry_date:      'Hạn sử dụng',
    // — Thuộc tính phân loại —
    nhom_san_pham:    'Nhóm sản phẩm',
    muc_dich_su_dung: 'Mục đích sử dụng',
    ton_kho:          'Số lượng trên web',
    gia_ban:          'Gói sản phẩm',
    hinh_anh:         'Hình ảnh',
    // — Trạng thái —
    'tình trạng':     'Tình trạng',
    created_at:       'Ngày tạo',
    updated_at:       'Cập nhật lần cuối',
  } as Record<string, string>,

  /** Nhãn Tiếng Việt cho từng giá trị trạng thái */
  STATUS_LABELS: {
    in_stock:   'Còn hàng',
    exported:   'Đã xuất',
    delivered:  'Đã giao',
    returned:   'Đã trả lại',
    pending:    'Chờ xử lý',
    cancelled:  'Đã hủy',
    processing: 'Đang xử lý',
    available:  'Sẵn sàng xuất',
    unavailable:'Hết hàng',
  } as Record<string, string>,

  /** Màu badge cho từng giá trị trạng thái */
  STATUS_COLORS: {
    in_stock:   { bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500'   },
    exported:   { bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500'  },
    delivered:  { bg: 'bg-teal-100', text: 'text-teal-800', dot: 'bg-teal-500' },
    returned:   { bg: 'bg-amber-100',  text: 'text-amber-800',  dot: 'bg-amber-500'  },
    pending:    { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
    cancelled:  { bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500'    },
    processing: { bg: 'bg-cyan-100',   text: 'text-cyan-800',   dot: 'bg-cyan-500'   },
    available:  { bg: 'bg-emerald-100',text: 'text-emerald-800',dot: 'bg-emerald-500'},
    unavailable:{ bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500'    },
  } as Record<string, { bg: string; text: string; dot: string }>,

  /** Cột ẩn — không hiển thị trên giao diện người dùng */
  HIDDEN_FIELDS: ['id'] as string[],

  /** Thứ tự ưu tiên hiển thị các trường (xếp lên đầu thẻ sản phẩm) */
  FIELD_ORDER: [
    'name',
    'product_code',
    'nhom_san_pham',
    'muc_dich_su_dung',
    'qr_code',
    'barcode',
    'sku',
    'batch_no',
    'serial_no',
    'description',
    'ton_kho',
  ] as string[],
} as const;

/** Lấy nhãn Tiếng Việt cho một cột */
export function getFieldLabel(column: string): string {
  return (PRODUCT_CONFIG.DISPLAY_LABELS as Record<string, string>)[column] ?? column;
}

/** Lấy nhãn Tiếng Việt cho một giá trị trạng thái */
export function getStatusLabel(statusValue: string): string {
  return (PRODUCT_CONFIG.STATUS_LABELS as Record<string, string>)[statusValue] ?? statusValue;
}
