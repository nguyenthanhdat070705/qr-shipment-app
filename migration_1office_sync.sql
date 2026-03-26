-- ============================================================
-- Migration: 1Office Sync Schema (COMPLETE)
-- Bao gồm: products table + sale_contracts + sale_quotations + stocktakes
-- Chạy trong Supabase SQL Editor
-- ============================================================

-- ── 1. Bảng sản phẩm / vật tư (Products) ────────────────────
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

COMMENT ON TABLE products IS 'Sản phẩm / Vật tư — sync từ 1Office /api/warehouse/product/gets';

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_oneoffice_id ON products (oneoffice_id) WHERE oneoffice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_code ON products (code);
CREATE INDEX IF NOT EXISTS idx_products_name ON products (name);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_products_updated_at') THEN
    CREATE TRIGGER set_products_updated_at
      BEFORE UPDATE ON products
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
END $$;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read products" ON products;
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service insert products" ON products;
CREATE POLICY "Service insert products" ON products FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Service update products" ON products;
CREATE POLICY "Service update products" ON products FOR UPDATE USING (true);

-- ── 2. Bảng hợp đồng bán (Sale Contracts) ────────────────────
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

COMMENT ON TABLE sale_contracts IS 'Hợp đồng bán hàng — sync từ 1Office /api/sale/contract/gets';

CREATE INDEX IF NOT EXISTS idx_sale_contracts_code     ON sale_contracts (contract_code);
CREATE INDEX IF NOT EXISTS idx_sale_contracts_status   ON sale_contracts (status);
CREATE INDEX IF NOT EXISTS idx_sale_contracts_customer ON sale_contracts (customer_name);
CREATE INDEX IF NOT EXISTS idx_sale_contracts_date     ON sale_contracts (sign_date);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_sale_contracts_updated_at') THEN
    CREATE TRIGGER set_sale_contracts_updated_at
      BEFORE UPDATE ON sale_contracts
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
END $$;

ALTER TABLE sale_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read sale_contracts" ON sale_contracts;
CREATE POLICY "Public read sale_contracts" ON sale_contracts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service insert sale_contracts" ON sale_contracts;
CREATE POLICY "Service insert sale_contracts" ON sale_contracts FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Service update sale_contracts" ON sale_contracts;
CREATE POLICY "Service update sale_contracts" ON sale_contracts FOR UPDATE USING (true);

-- ── 3. Bảng báo giá (Sale Quotations) ─────────────────────────
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

COMMENT ON TABLE sale_quotations IS 'Báo giá — sync từ 1Office /api/sale/quotation/gets';

CREATE INDEX IF NOT EXISTS idx_sale_quotations_code     ON sale_quotations (quotation_code);
CREATE INDEX IF NOT EXISTS idx_sale_quotations_customer ON sale_quotations (customer_name);
CREATE INDEX IF NOT EXISTS idx_sale_quotations_date     ON sale_quotations (quotation_date);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_sale_quotations_updated_at') THEN
    CREATE TRIGGER set_sale_quotations_updated_at
      BEFORE UPDATE ON sale_quotations
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
END $$;

ALTER TABLE sale_quotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read sale_quotations" ON sale_quotations;
CREATE POLICY "Public read sale_quotations" ON sale_quotations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service insert sale_quotations" ON sale_quotations;
CREATE POLICY "Service insert sale_quotations" ON sale_quotations FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Service update sale_quotations" ON sale_quotations;
CREATE POLICY "Service update sale_quotations" ON sale_quotations FOR UPDATE USING (true);

-- ── 4. Bảng phiếu kiểm kho (Stocktakes) ──────────────────────
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

COMMENT ON TABLE stocktakes IS 'Phiếu kiểm kho — sync từ 1Office /api/warehouse/stocktake/gets';

CREATE INDEX IF NOT EXISTS idx_stocktakes_code      ON stocktakes (stocktake_code);
CREATE INDEX IF NOT EXISTS idx_stocktakes_warehouse ON stocktakes (warehouse_name);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_stocktakes_updated_at') THEN
    CREATE TRIGGER set_stocktakes_updated_at
      BEFORE UPDATE ON stocktakes
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
END $$;

ALTER TABLE stocktakes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read stocktakes" ON stocktakes;
CREATE POLICY "Public read stocktakes" ON stocktakes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service insert stocktakes" ON stocktakes;
CREATE POLICY "Service insert stocktakes" ON stocktakes FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Service update stocktakes" ON stocktakes;
CREATE POLICY "Service update stocktakes" ON stocktakes FOR UPDATE USING (true);
