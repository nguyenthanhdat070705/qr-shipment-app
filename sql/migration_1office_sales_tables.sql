-- Tạo bảng sale_contracts và sale_quotations nếu chưa có
-- Chạy trong Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS sale_contracts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  oneoffice_id    INTEGER UNIQUE,
  contract_code   TEXT UNIQUE,
  contract_type   TEXT,
  type            TEXT,
  customer_name   TEXT,
  customer_code   TEXT,
  customer_type   TEXT,
  customer_phone  TEXT,
  customer_email  TEXT,
  sign_date       DATE,
  start_date      DATE,
  end_date        DATE,
  status          TEXT,
  approval_status TEXT,
  total_amount    NUMERIC DEFAULT 0,
  currency_unit   TEXT DEFAULT 'VND',
  pay_type        TEXT,
  product_list    TEXT,
  detail_text     TEXT,
  note            TEXT,
  created_by      TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_quotations (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  oneoffice_id    INTEGER UNIQUE,
  quotation_code  TEXT UNIQUE,
  title           TEXT,
  customer_id     INTEGER,
  customer_name   TEXT,
  customer_code   TEXT,
  customer_phone  TEXT,
  customer_email  TEXT,
  quotation_date  DATE,
  expiry_date     DATE,
  total_amount    NUMERIC DEFAULT 0,
  currency_unit   TEXT DEFAULT 'VND',
  approval_status TEXT,
  product_list    TEXT,
  product_detail  TEXT,
  note            TEXT,
  created_by      TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_orders (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  oneoffice_id    INTEGER UNIQUE,
  order_code      TEXT UNIQUE,
  title           TEXT,
  customer_id     INTEGER,
  customer_name   TEXT,
  customer_code   TEXT,
  customer_phone  TEXT,
  customer_email  TEXT,
  order_date      DATE,
  delivery_date   DATE,
  status          TEXT,
  approval_status TEXT,
  total_amount    NUMERIC DEFAULT 0,
  currency_unit   TEXT DEFAULT 'VND',
  product_list    TEXT,
  note            TEXT,
  created_by      TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contracts_customer ON sale_contracts(customer_name);
CREATE INDEX IF NOT EXISTS idx_contracts_status   ON sale_contracts(status);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON sale_quotations(customer_name);
CREATE INDEX IF NOT EXISTS idx_orders_customer    ON sale_orders(customer_name);

-- RLS
ALTER TABLE sale_contracts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_orders     ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_contracts'  AND tablename = 'sale_contracts')  THEN CREATE POLICY "allow_all_contracts"  ON sale_contracts  FOR ALL USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_quotations' AND tablename = 'sale_quotations') THEN CREATE POLICY "allow_all_quotations" ON sale_quotations FOR ALL USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_orders'     AND tablename = 'sale_orders')     THEN CREATE POLICY "allow_all_orders"     ON sale_orders     FOR ALL USING (true); END IF;
END $$;
