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
  maDonHang?: string; // Mã đám
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

// ============================================================
// Phase 3 — New Domain Types
// ============================================================

/** Kho hàng */
export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Nhà cung cấp */
export interface Supplier {
  id: string;
  code: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Trạng thái PO */
export type POStatus = 'confirmed' | 'received' | 'closed' | 'cancelled';

/** Đơn mua hàng — Purchase Order */
export interface PurchaseOrder {
  id: string;
  po_code: string;
  supplier_id: string | null;
  warehouse_id: string | null;
  status: POStatus;
  total_amount: number;
  note: string | null;
  created_by: string;
  approved_by: string | null;
  order_date: string;
  expected_date: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  supplier?: Supplier;
  warehouse?: Warehouse;
  items?: PurchaseOrderItem[];
}

/** Chi tiết item trong PO */
export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  received_qty: number;
  hang_ky_gui?: boolean;
  note: string | null;
  created_at: string;
}

/** Trạng thái GRPO */
export type GRStatus = 'completed' | 'cancelled';

/** Phiếu nhập kho — Goods Receipt PO */
export interface GoodsReceipt {
  id: string;
  gr_code: string;
  po_id: string | null;
  warehouse_id: string;
  status: GRStatus;
  note: string | null;
  received_by: string;
  received_date: string;
  created_at: string;
  updated_at: string;
  // Joined
  purchase_order?: PurchaseOrder;
  warehouse?: Warehouse;
  items?: GoodsReceiptItem[];
}

/** Chi tiết item nhập kho */
export interface GoodsReceiptItem {
  id: string;
  gr_id: string;
  product_code: string;
  product_name: string;
  expected_qty: number;
  received_qty: number;
  is_accepted: boolean;
  note: string | null;
  created_at: string;
}

/** Trạng thái đơn giao hàng */
export type DeliveryStatus = 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';

/** Đơn giao hàng */
export interface DeliveryOrder {
  id: string;
  do_code: string;
  warehouse_id: string | null;
  status: DeliveryStatus;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  assigned_to: string | null;
  note: string | null;
  delivery_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined
  warehouse?: Warehouse;
  items?: DeliveryOrderItem[];
}

/** Chi tiết đơn giao hàng */
export interface DeliveryOrderItem {
  id: string;
  do_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  note: string | null;
  created_at: string;
}

/** QR Code Types */
export type QRDocType = 'po' | 'grpo' | 'export' | 'delivery' | 'product';
