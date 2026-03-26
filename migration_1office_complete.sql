-- ============================================================
-- Complete Migration: 1Office Sync
-- Tạo TOÀN BỘ các bảng đồng bộ từ 1Office nếu chưa tồn tại
-- Chạy trong Supabase SQL Editor
-- ============================================================

-- ── 0. Hàm tự cập nhật thời gian (updated_at) ──────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ── 1. Bảng Sản phẩm (Products) ──────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  oneoffice_id    integer     UNIQUE,
  code            text        NOT NULL,
  name            text        NOT NULL,
  barcode         text,
  unit            text,
  cost_price      numeric(15,2) DEFAULT 0,
  selling_price   numeric(15,2) DEFAULT 0,
  category        text,
  product_type    text,
  manage_type     text,
  supplier_list   text,
  description     text,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_1o_oid ON products (oneoffice_id) WHERE oneoffice_id IS NOT NULL;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read products" ON products;
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service policy products" ON products;
CREATE POLICY "Service policy products" ON products USING (true);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_products_updated_at') THEN
    CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
END $$;


-- ── 2. Bảng Hợp đồng bán (Sale Contracts) ────────────────────
CREATE TABLE IF NOT EXISTS sale_contracts (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  oneoffice_id        integer     UNIQUE,
  contract_code       text        NOT NULL,
  contract_type       text,
  type                text,
  customer_name       text,
  customer_code       text,
  customer_type       text,
  customer_phone      text,
  customer_email      text,
  sign_date           date,
  start_date          date,
  end_date            date,
  status              text,
  approval_status     text,
  total_amount        numeric(15,2) DEFAULT 0,
  currency_unit       text        DEFAULT 'VND',
  pay_type            text,
  product_list        text,
  detail_text         text,
  note                text,
  created_by          text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_1o_oid ON sale_contracts (oneoffice_id) WHERE oneoffice_id IS NOT NULL;
ALTER TABLE sale_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read sale_contracts" ON sale_contracts;
CREATE POLICY "Public read sale_contracts" ON sale_contracts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service policy sale_contracts" ON sale_contracts;
CREATE POLICY "Service policy sale_contracts" ON sale_contracts USING (true);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_sale_contracts_updated_at') THEN
    CREATE TRIGGER set_sale_contracts_updated_at BEFORE UPDATE ON sale_contracts FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
END $$;


-- ── 3. Bảng Báo giá (Sale Quotations) ─────────────────────────
CREATE TABLE IF NOT EXISTS sale_quotations (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  oneoffice_id        integer     UNIQUE,
  quotation_code      text        NOT NULL,
  title               text,
  customer_id         integer,
  customer_name       text,
  customer_code       text,
  customer_phone      text,
  customer_email      text,
  quotation_date      date,
  expiry_date         date,
  total_amount        numeric(15,2) DEFAULT 0,
  currency_unit       text        DEFAULT 'VND',
  approval_status     text,
  product_list        text,
  product_detail      text,
  note                text,
  created_by          text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quotations_1o_oid ON sale_quotations (oneoffice_id) WHERE oneoffice_id IS NOT NULL;
ALTER TABLE sale_quotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read sale_quotations" ON sale_quotations;
CREATE POLICY "Public read sale_quotations" ON sale_quotations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service policy sale_quotations" ON sale_quotations;
CREATE POLICY "Service policy sale_quotations" ON sale_quotations USING (true);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_sale_quotations_updated_at') THEN
    CREATE TRIGGER set_sale_quotations_updated_at BEFORE UPDATE ON sale_quotations FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
END $$;


-- ── 4. Bảng Phiếu kiểm kho (Stocktakes) ──────────────────────
CREATE TABLE IF NOT EXISTS stocktakes (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  oneoffice_id        integer     UNIQUE,
  stocktake_code      text        NOT NULL,
  warehouse_name      text,
  warehouse_address   text,
  status              text,
  approval_status     text,
  note                text,
  stocktake_date      date,
  created_by          text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stocktakes_1o_oid ON stocktakes (oneoffice_id) WHERE oneoffice_id IS NOT NULL;
ALTER TABLE stocktakes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read stocktakes" ON stocktakes;
CREATE POLICY "Public read stocktakes" ON stocktakes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service policy stocktakes" ON stocktakes;
CREATE POLICY "Service policy stocktakes" ON stocktakes USING (true);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_stocktakes_updated_at') THEN
    CREATE TRIGGER set_stocktakes_updated_at BEFORE UPDATE ON stocktakes FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
END $$;


-- ── 5. Bảng Kho hàng 1Office (Warehouses) ─────────────────────
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
ALTER TABLE warehouses_1office ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read warehouses_1office" ON warehouses_1office;
CREATE POLICY "Public read warehouses_1office" ON warehouses_1office FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service policy warehouses_1o" ON warehouses_1office;
CREATE POLICY "Service policy warehouses_1o" ON warehouses_1office USING (true);


-- ── 6. Bảng Phiếu nhập kho từ 1Office (Goods Receipts) ────────
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
  product_list    text,   
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_gr_1o_oid ON goods_receipts_1office (oneoffice_id) WHERE oneoffice_id IS NOT NULL;
ALTER TABLE goods_receipts_1office ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read gr_1o" ON goods_receipts_1office;
CREATE POLICY "Public read gr_1o" ON goods_receipts_1office FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service policy gr_1o" ON goods_receipts_1office;
CREATE POLICY "Service policy gr_1o" ON goods_receipts_1office USING (true);


-- ── 7. Bảng Tồn kho 1Office (Inventory) ──────────────────────
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_1o_oid ON inventory_1office (oneoffice_id) WHERE oneoffice_id IS NOT NULL;
ALTER TABLE inventory_1office ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read inv_1o" ON inventory_1office;
CREATE POLICY "Public read inv_1o" ON inventory_1office FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service policy inv_1o" ON inventory_1office;
CREATE POLICY "Service policy inv_1o" ON inventory_1office USING (true);


-- ── 8. Bảng Đơn bán hàng (Sale Orders) ──────────────────────
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
  product_list    text,
  note            text,
  created_by      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_so_1o_oid ON sale_orders (oneoffice_id) WHERE oneoffice_id IS NOT NULL;
ALTER TABLE sale_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read sale_orders" ON sale_orders;
CREATE POLICY "Public read sale_orders" ON sale_orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service policy sale_orders" ON sale_orders;
CREATE POLICY "Service policy sale_orders" ON sale_orders USING (true);


-- ── 9. Bảng Log Đồng bộ (Sync Logs) ──────────────────────────
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
  details             jsonb,
  note                text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read sync_logs" ON sync_logs;
CREATE POLICY "Public read sync_logs" ON sync_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service policy sync_logs" ON sync_logs;
CREATE POLICY "Service policy sync_logs" ON sync_logs USING (true);


SELECT 'Toàn bộ Migration các bảng 1Office hoàn thành thành công!' AS result;
