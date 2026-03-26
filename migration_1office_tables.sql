-- ============================================================
-- Migration: 1Office Sync — Bảng bổ sung
-- Chạy trong Supabase SQL Editor
-- ============================================================

-- Đảm bảo function trigger_set_updated_at đã tồn tại
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── 1. Bảng Kho hàng 1Office ──────────────────────────────────
CREATE TABLE IF NOT EXISTS warehouses_1office (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  oneoffice_id    integer     UNIQUE,
  code            text        NOT NULL,
  name            text        NOT NULL,
  address         text,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouses_1o_oid ON warehouses_1office (oneoffice_id) WHERE oneoffice_id IS NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_warehouses_1office_updated_at') THEN
    CREATE TRIGGER set_warehouses_1office_updated_at
      BEFORE UPDATE ON warehouses_1office
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
END $$;

ALTER TABLE warehouses_1office ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read warehouses_1office" ON warehouses_1office;
CREATE POLICY "Public read warehouses_1office" ON warehouses_1office FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service insert warehouses_1office" ON warehouses_1office;
CREATE POLICY "Service insert warehouses_1office" ON warehouses_1office FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Service update warehouses_1office" ON warehouses_1office;
CREATE POLICY "Service update warehouses_1office" ON warehouses_1office FOR UPDATE USING (true);

-- ── 2. Bảng Phiếu nhập kho từ 1Office ────────────────────────
CREATE TABLE IF NOT EXISTS goods_receipts_1office (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  oneoffice_id    integer     UNIQUE,
  gr_code         text        NOT NULL,
  warehouse_name  text,
  warehouse_code  text,
  supplier_name   text,
  supplier_code   text,
  status          text,
  approval_status text,
  total_amount    numeric(15,2) DEFAULT 0,
  note            text,
  received_date   date,
  created_by      text,
  product_list    text,   -- JSON text của danh sách sản phẩm
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE goods_receipts_1office IS 'Phiếu nhập kho — sync từ 1Office /api/warehouse/receipt/gets';

CREATE UNIQUE INDEX IF NOT EXISTS idx_gr_1o_oid ON goods_receipts_1office (oneoffice_id) WHERE oneoffice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gr_1o_code ON goods_receipts_1office (gr_code);
CREATE INDEX IF NOT EXISTS idx_gr_1o_warehouse ON goods_receipts_1office (warehouse_name);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_goods_receipts_1office_updated_at') THEN
    CREATE TRIGGER set_goods_receipts_1office_updated_at
      BEFORE UPDATE ON goods_receipts_1office
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
END $$;

ALTER TABLE goods_receipts_1office ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read goods_receipts_1office" ON goods_receipts_1office;
CREATE POLICY "Public read goods_receipts_1office" ON goods_receipts_1office FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service insert goods_receipts_1office" ON goods_receipts_1office;
CREATE POLICY "Service insert goods_receipts_1office" ON goods_receipts_1office FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Service update goods_receipts_1office" ON goods_receipts_1office;
CREATE POLICY "Service update goods_receipts_1office" ON goods_receipts_1office FOR UPDATE USING (true);

-- ── 3. Bảng Tồn kho 1Office ──────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_1office (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  oneoffice_id    integer     UNIQUE,
  product_code    text,
  product_name    text,
  warehouse_name  text,
  warehouse_code  text,
  quantity        numeric(15,3) DEFAULT 0,
  available_qty   numeric(15,3) DEFAULT 0,
  unit            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE inventory_1office IS 'Tồn kho — sync từ 1Office /api/warehouse/inventory/gets';

CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_1o_oid ON inventory_1office (oneoffice_id) WHERE oneoffice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inv_1o_product ON inventory_1office (product_code);
CREATE INDEX IF NOT EXISTS idx_inv_1o_warehouse ON inventory_1office (warehouse_name);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_inventory_1office_updated_at') THEN
    CREATE TRIGGER set_inventory_1office_updated_at
      BEFORE UPDATE ON inventory_1office
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
END $$;

ALTER TABLE inventory_1office ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read inventory_1office" ON inventory_1office;
CREATE POLICY "Public read inventory_1office" ON inventory_1office FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service insert inventory_1office" ON inventory_1office;
CREATE POLICY "Service insert inventory_1office" ON inventory_1office FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Service update inventory_1office" ON inventory_1office;
CREATE POLICY "Service update inventory_1office" ON inventory_1office FOR UPDATE USING (true);

-- ── 4. Bảng Đơn bán hàng 1Office ────────────────────────────
CREATE TABLE IF NOT EXISTS sale_orders (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  oneoffice_id    integer     UNIQUE,
  order_code      text        NOT NULL,
  title           text,
  customer_id     integer,
  customer_name   text,
  customer_code   text,
  customer_phone  text,
  customer_email  text,
  order_date      date,
  delivery_date   date,
  status          text,
  approval_status text,
  total_amount    numeric(15,2) DEFAULT 0,
  currency_unit   text        DEFAULT 'VND',
  product_list    text,   -- JSON text
  note            text,
  created_by      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE sale_orders IS 'Đơn bán hàng — sync từ 1Office /api/sale/order/gets';

CREATE UNIQUE INDEX IF NOT EXISTS idx_so_1o_oid ON sale_orders (oneoffice_id) WHERE oneoffice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_so_code ON sale_orders (order_code);
CREATE INDEX IF NOT EXISTS idx_so_status ON sale_orders (status);
CREATE INDEX IF NOT EXISTS idx_so_customer ON sale_orders (customer_name);
CREATE INDEX IF NOT EXISTS idx_so_date ON sale_orders (order_date DESC);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_sale_orders_updated_at') THEN
    CREATE TRIGGER set_sale_orders_updated_at
      BEFORE UPDATE ON sale_orders
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
END $$;

ALTER TABLE sale_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read sale_orders" ON sale_orders;
CREATE POLICY "Public read sale_orders" ON sale_orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service insert sale_orders" ON sale_orders;
CREATE POLICY "Service insert sale_orders" ON sale_orders FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Service update sale_orders" ON sale_orders;
CREATE POLICY "Service update sale_orders" ON sale_orders FOR UPDATE USING (true);

-- ── 5. Bảng Log Sync ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_logs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type           text        NOT NULL DEFAULT '1office_full',
  started_at          timestamptz,
  finished_at         timestamptz,
  total_duration_ms   integer,
  tables_synced       text[],
  total_fetched       integer     DEFAULT 0,
  total_upserted      integer     DEFAULT 0,
  total_errors        integer     DEFAULT 0,
  success             boolean     DEFAULT true,
  details             jsonb,      -- Chi tiết từng bảng
  note                text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE sync_logs IS 'Log lịch sử sync dữ liệu từ 1Office';

CREATE INDEX IF NOT EXISTS idx_sync_logs_type ON sync_logs (sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started ON sync_logs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_success ON sync_logs (success);

ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read sync_logs" ON sync_logs;
CREATE POLICY "Public read sync_logs" ON sync_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service insert sync_logs" ON sync_logs;
CREATE POLICY "Service insert sync_logs" ON sync_logs FOR INSERT WITH CHECK (true);

-- ── 6. Thêm cột oneoffice_id vào bảng sale_contracts, sale_quotations, stocktakes nếu chưa có ──
ALTER TABLE sale_contracts  ADD COLUMN IF NOT EXISTS oneoffice_id integer;
ALTER TABLE sale_quotations ADD COLUMN IF NOT EXISTS oneoffice_id integer;
ALTER TABLE stocktakes       ADD COLUMN IF NOT EXISTS oneoffice_id integer;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_1o_oid  ON sale_contracts  (oneoffice_id) WHERE oneoffice_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotations_1o_oid ON sale_quotations (oneoffice_id) WHERE oneoffice_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_stocktakes_1o_oid ON stocktakes       (oneoffice_id) WHERE oneoffice_id IS NOT NULL;

-- ── 7. Thêm cột oneoffice_id vào bảng products nếu chưa có ──
ALTER TABLE products ADD COLUMN IF NOT EXISTS oneoffice_id integer;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_1o_oid ON products (oneoffice_id) WHERE oneoffice_id IS NOT NULL;

-- Hoàn thành!
SELECT 'Migration hoàn thành! Đã tạo: warehouses_1office, goods_receipts_1office, inventory_1office, sale_orders, sync_logs' AS message;
