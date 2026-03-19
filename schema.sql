-- ============================================================
-- Bảng xác nhận xuất hàng — export_confirmations
-- Chạy đoạn SQL này trong Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS export_confirmations (
  stt              bigserial    PRIMARY KEY,
  ma_san_pham      text         NOT NULL,
  ho_ten           text         NOT NULL,
  email            text         NOT NULL,
  chuc_vu          text         NOT NULL,
  ghi_chu          text,
  ngay_xuat        date         NOT NULL DEFAULT current_date,
  thoi_gian_xuat   time         NOT NULL DEFAULT current_time,
  created_at       timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  export_confirmations IS 'Lịch sử xác nhận xuất hàng — mỗi hàng là một lần xác nhận xuất kho.';
COMMENT ON COLUMN export_confirmations.stt             IS 'Số thứ tự tự tăng — STT xuất hàng.';
COMMENT ON COLUMN export_confirmations.ma_san_pham     IS 'Mã sản phẩm được xuất kho.';
COMMENT ON COLUMN export_confirmations.ho_ten          IS 'Họ và tên người xác nhận xuất hàng.';
COMMENT ON COLUMN export_confirmations.email           IS 'Email người xác nhận xuất hàng.';
COMMENT ON COLUMN export_confirmations.chuc_vu         IS 'Chức vụ người xác nhận.';
COMMENT ON COLUMN export_confirmations.ghi_chu         IS 'Ghi chú thêm (không bắt buộc).';
COMMENT ON COLUMN export_confirmations.ngay_xuat       IS 'Ngày xuất hàng (lấy từ ngày hiện tại).';
COMMENT ON COLUMN export_confirmations.thoi_gian_xuat  IS 'Giờ xuất hàng (lấy từ giờ hiện tại).';
COMMENT ON COLUMN export_confirmations.created_at      IS 'Timestamp đầy đủ khi bản ghi được tạo.';

-- Index tra cứu nhanh theo mã sản phẩm
CREATE INDEX IF NOT EXISTS idx_export_conf_ma_san_pham
  ON export_confirmations (ma_san_pham);

-- Index sắp xếp theo thời gian mới nhất
CREATE INDEX IF NOT EXISTS idx_export_conf_created_at
  ON export_confirmations (created_at DESC);

-- ============================================================
-- Bảng sản phẩm — products (schema gốc nếu bạn dùng demo data)
-- Nếu bạn đã có bảng riêng, bỏ qua phần này.
-- ============================================================

CREATE TABLE IF NOT EXISTS products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code    text UNIQUE NOT NULL,
  qr_code         text UNIQUE,
  name            text NOT NULL,
  sku             text,
  batch_no        text,
  serial_no       text,
  description     text,
  manufacture_date date,
  expiry_date     date,
  status          text NOT NULL DEFAULT 'in_stock'
                    CHECK (status IN ('in_stock', 'exported', 'delivered', 'returned')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Trigger tự cập nhật updated_at
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_products_updated_at ON products;
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Index tra cứu sản phẩm
CREATE INDEX IF NOT EXISTS idx_products_product_code ON products (product_code);
CREATE INDEX IF NOT EXISTS idx_products_status        ON products (status);

-- RLS: cho phép đọc sản phẩm không cần xác thực (dùng anon key)
ALTER TABLE products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read products"
  ON products FOR SELECT USING (true);
-- Ghi vào export_confirmations chỉ qua service_role (server-side)

-- ============================================================
-- Dữ liệu mẫu để kiểm thử
-- ============================================================
INSERT INTO products (product_code, qr_code, name, sku, batch_no, serial_no, description, manufacture_date, expiry_date, status)
VALUES
  ('PC-001', 'QR-PC-001', 'Widget Công nghiệp Alpha',   'SKU-A001', 'BATCH-2025-01', 'SN-00001', 'Widget hiệu suất cao cho ứng dụng công nghiệp nặng.', '2025-01-15', '2027-01-15', 'in_stock'),
  ('PC-002', 'QR-PC-002', 'Mô-đun Cảm biến Chính xác', 'SKU-B002', 'BATCH-2025-02', 'SN-00002', 'Cảm biến nhiệt độ và độ ẩm siêu chính xác.',            '2025-02-10', '2026-08-10', 'in_stock'),
  ('PC-003', 'QR-PC-003', 'Bộ nguồn Compact 12V',       'SKU-C003', 'BATCH-2025-03', 'SN-00003', 'Nguồn điện 12V/5A cho hệ thống nhúng.',                  '2025-03-01', '2028-03-01', 'in_stock')
ON CONFLICT (product_code) DO NOTHING;
