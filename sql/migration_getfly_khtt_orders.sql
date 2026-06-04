-- ═══════════════════════════════════════════════════════════════
-- Migration: GetFly KHTT Orders (Khách Hàng Trăm Tuổi)
-- Đồng bộ các đơn hàng "hợp đồng nền Trăm Tuổi" từ GetFly CRM.
--
-- Một bản ghi KHTT hợp lệ (đang hiển thị) phải thoả ĐỦ:
--   • order_type = 2 (đơn hàng bán)
--   • order_code CHỨA "KHTT"
--   • status = 1  → "Chờ duyệt" (khách còn sống, hợp đồng nền chưa dùng)
-- Khi status = 2 ("Đã duyệt") nghĩa là đã sử dụng (khách đã mất) → KHÔNG hiển thị.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS getfly_khtt_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  getfly_order_id TEXT UNIQUE NOT NULL,      -- order_id từ GetFly

  -- Đơn hàng
  order_code TEXT,                           -- Mã đơn hàng (vd: 260510KHTT_010)
  order_date TEXT,                           -- Ngày đặt hàng
  order_status_code TEXT,                    -- Mã trạng thái gốc (1 = chờ duyệt)
  order_status TEXT,                         -- Trạng thái (Chờ duyệt)

  -- Khách hàng
  account_id TEXT,                           -- account_id GetFly
  customer_code TEXT,                        -- Mã KH (vd: KH16790)
  customer_name TEXT,                        -- Họ tên khách hàng
  customer_phone TEXT,                       -- Số điện thoại

  -- Gói sử dụng
  package_name TEXT,                         -- Tên gói (sản phẩm đầu tiên)
  package_summary TEXT,                      -- Toàn bộ danh sách sản phẩm (gộp)

  -- Tài chính
  total_value NUMERIC DEFAULT 0,             -- Tổng giá trị gói (amount)
  paid_amount NUMERIC DEFAULT 0,             -- Đã thanh toán (f_amount)
  remaining_amount NUMERIC DEFAULT 0,        -- Số tiền còn lại (amount - f_amount)

  -- Người thụ hưởng (= "Người nhận" / contact của account)
  beneficiary_name TEXT,
  beneficiary_phone TEXT,

  -- Người phụ trách
  person_in_charge TEXT,

  -- Ngày hết hạn (đồng bộ từ custom field "ngay_het_han" trên đơn GetFly qua web API)
  expiry_date TEXT,

  -- Hệ thống
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_getfly_khtt_phone ON getfly_khtt_orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_getfly_khtt_beneficiary_phone ON getfly_khtt_orders(beneficiary_phone);
CREATE INDEX IF NOT EXISTS idx_getfly_khtt_code ON getfly_khtt_orders(order_code);
CREATE INDEX IF NOT EXISTS idx_getfly_khtt_status ON getfly_khtt_orders(order_status_code);
CREATE INDEX IF NOT EXISTS idx_getfly_khtt_synced ON getfly_khtt_orders(synced_at DESC);
