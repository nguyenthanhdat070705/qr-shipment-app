-- ============================================================
-- Phase 3 Migration — BlackStone_Order_SCM
-- Chạy trong Supabase SQL Editor
-- ============================================================

-- ── 1. Bảng kho hàng ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS warehouses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text UNIQUE NOT NULL,
  name          text NOT NULL,
  address       text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE warehouses IS 'Danh sách kho hàng.';

INSERT INTO warehouses (code, name, address) VALUES
  ('KHO-01', 'Kho 1 — Chính', 'Địa chỉ kho 1'),
  ('KHO-02', 'Kho 2 — Chi nhánh', 'Địa chỉ kho 2'),
  ('KHO-03', 'Kho 3 — Phụ', 'Địa chỉ kho 3')
ON CONFLICT (code) DO NOTHING;

-- ── 2. Bảng nhà cung cấp ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text UNIQUE NOT NULL,
  name          text NOT NULL,
  contact_name  text,
  phone         text,
  email         text,
  address       text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE suppliers IS 'Nhà cung cấp.';

INSERT INTO suppliers (code, name, contact_name, phone, email) VALUES
  ('NCC-001', 'Công ty TNHH Vật tư ABC', 'Nguyễn Văn A', '0901234567', 'ncc_abc@example.com'),
  ('NCC-002', 'Công ty CP Thiết bị XYZ', 'Trần Thị B', '0912345678', 'ncc_xyz@example.com')
ON CONFLICT (code) DO NOTHING;

-- ── 3. Bảng Đơn mua hàng (PO) ────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_code         text UNIQUE NOT NULL,
  supplier_id     uuid REFERENCES suppliers(id),
  warehouse_id    uuid REFERENCES warehouses(id),
  status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','submitted','approved','received','closed','cancelled')),
  total_amount    numeric(15,2) DEFAULT 0,
  note            text,
  created_by      text NOT NULL,
  approved_by     text,
  order_date      date NOT NULL DEFAULT current_date,
  expected_date   date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE purchase_orders IS 'Đơn mua hàng — Purchase Order.';

CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders (status);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders (supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_created_at ON purchase_orders (created_at DESC);

-- ── 4. Chi tiết PO ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id           uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_code    text NOT NULL,
  product_name    text NOT NULL,
  quantity        integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price      numeric(15,2) NOT NULL DEFAULT 0,
  total_price     numeric(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  received_qty    integer NOT NULL DEFAULT 0,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON purchase_order_items (po_id);

-- ── 5. Phiếu nhập kho (GRPO) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS goods_receipts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gr_code         text UNIQUE NOT NULL,
  po_id           uuid REFERENCES purchase_orders(id),
  warehouse_id    uuid NOT NULL REFERENCES warehouses(id),
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','inspecting','completed','rejected')),
  note            text,
  received_by     text NOT NULL,
  received_date   date NOT NULL DEFAULT current_date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE goods_receipts IS 'Phiếu nhập kho — Goods Receipt PO.';

CREATE INDEX IF NOT EXISTS idx_gr_status ON goods_receipts (status);
CREATE INDEX IF NOT EXISTS idx_gr_warehouse ON goods_receipts (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_gr_po ON goods_receipts (po_id);

-- ── 6. Chi tiết phiếu nhập ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gr_id           uuid NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  product_code    text NOT NULL,
  product_name    text NOT NULL,
  expected_qty    integer NOT NULL DEFAULT 0,
  received_qty    integer NOT NULL DEFAULT 0,
  is_accepted     boolean DEFAULT true,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gr_items_gr_id ON goods_receipt_items (gr_id);

-- ── 7. Đơn giao hàng (Delivery / Operations) ──────────────────
CREATE TABLE IF NOT EXISTS delivery_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  do_code         text UNIQUE NOT NULL,
  warehouse_id    uuid REFERENCES warehouses(id),
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','assigned','in_transit','delivered','cancelled')),
  customer_name   text,
  customer_phone  text,
  customer_address text,
  assigned_to     text,
  note            text,
  delivery_date   date,
  created_by      text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE delivery_orders IS 'Đơn giao hàng — quản lý vận hành.';

CREATE INDEX IF NOT EXISTS idx_do_status ON delivery_orders (status);
CREATE INDEX IF NOT EXISTS idx_do_created_at ON delivery_orders (created_at DESC);

-- ── 8. Chi tiết đơn giao hàng ──────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_order_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  do_id           uuid NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  product_code    text NOT NULL,
  product_name    text NOT NULL,
  quantity        integer NOT NULL DEFAULT 1,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_do_items_do_id ON delivery_order_items (do_id);

-- ── 9. Triggers updated_at ──────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_warehouses_updated_at') THEN
    CREATE TRIGGER set_warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_suppliers_updated_at') THEN
    CREATE TRIGGER set_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_po_updated_at') THEN
    CREATE TRIGGER set_po_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_gr_updated_at') THEN
    CREATE TRIGGER set_gr_updated_at BEFORE UPDATE ON goods_receipts FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_do_updated_at') THEN
    CREATE TRIGGER set_do_updated_at BEFORE UPDATE ON delivery_orders FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
END $$;

-- ── 10. RLS Policies ────────────────────────────────────────────
ALTER TABLE warehouses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_order_items ENABLE ROW LEVEL SECURITY;

-- Public read access (qua anon key — read-only)
DROP POLICY IF EXISTS "Public read warehouses" ON warehouses;
CREATE POLICY "Public read warehouses" ON warehouses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read suppliers" ON suppliers;
CREATE POLICY "Public read suppliers" ON suppliers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read PO" ON purchase_orders;
CREATE POLICY "Public read PO" ON purchase_orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read PO items" ON purchase_order_items;
CREATE POLICY "Public read PO items" ON purchase_order_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read GR" ON goods_receipts;
CREATE POLICY "Public read GR" ON goods_receipts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read GR items" ON goods_receipt_items;
CREATE POLICY "Public read GR items" ON goods_receipt_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read DO" ON delivery_orders;
CREATE POLICY "Public read DO" ON delivery_orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read DO items" ON delivery_order_items;
CREATE POLICY "Public read DO items" ON delivery_order_items FOR SELECT USING (true);

-- ============================================================
-- SCM Features - Bảng liên quan mã QR và Thông báo
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Bảng lưu trữ mã QR cho lô/đám (Inventory QR Codes)
CREATE TABLE IF NOT EXISTS qr_codes (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code         text         UNIQUE NOT NULL,
  type            text         NOT NULL CHECK (type IN ('PO', 'INVENTORY', 'EXPORT')),
  reference_id    text,        -- Liên kết tới mã PO, hoặc mã Sản phẩm
  quantity        int          DEFAULT 0,
  warehouse       text,        -- Lưu trữ kho nào (Kho 1, Kho 2, etc.)
  status          text         NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  created_by      text,        -- user/email tạo mã
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now()
);

-- Index cho tra cứu nhanh qr_code
CREATE INDEX IF NOT EXISTS idx_qr_codes_qr_code ON qr_codes (qr_code);

-- 2. Bảng Notifications (Quản lý luồng Tin nhắn/Notice giữa các Role)
CREATE TABLE IF NOT EXISTS notifications (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_email    text         NOT NULL,
  receiver_role   text         NOT NULL, -- VD: 'procurement', 'operations', 'warehouse'
  title           text         NOT NULL,
  message         text         NOT NULL,
  type            text         NOT NULL CHECK (type IN ('receipt_alert', 'export_alert', 'system_alert')),
  reference_id    text,        -- Chứa mã PO, QR code ID,... để link đến đối tượng cụ thể
  is_read         boolean      NOT NULL DEFAULT false,
  created_at      timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_receiver_role ON notifications (receiver_role);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications (is_read);

-- ============================================================
-- Triggers cho `qr_codes`
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_qr_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_qr_updated_at ON qr_codes;
CREATE TRIGGER set_qr_updated_at
  BEFORE UPDATE ON qr_codes
  FOR EACH ROW EXECUTE FUNCTION trigger_set_qr_updated_at();

-- RLS
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read qr codes" ON qr_codes;
CREATE POLICY "Public can read qr codes" ON qr_codes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert qr codes" ON qr_codes;
CREATE POLICY "Public can insert qr codes" ON qr_codes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update qr codes" ON qr_codes;
CREATE POLICY "Public can update qr codes" ON qr_codes FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Roles can read messages" ON notifications;
CREATE POLICY "Roles can read messages" ON notifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Roles can insert messages" ON notifications;
CREATE POLICY "Roles can insert messages" ON notifications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Roles can update messages" ON notifications;
CREATE POLICY "Roles can update messages" ON notifications FOR UPDATE USING (true);
