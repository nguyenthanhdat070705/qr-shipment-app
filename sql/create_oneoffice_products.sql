-- Chạy trong Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS oneoffice_crm_products (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  oneoffice_id    INTEGER UNIQUE NOT NULL,
  code            TEXT,
  name            TEXT NOT NULL,
  barcode         TEXT,
  unit            TEXT,
  cost_price      NUMERIC DEFAULT 0,
  selling_price   NUMERIC DEFAULT 0,
  category        TEXT,
  product_type    TEXT,
  manage_type     TEXT,
  supplier_list   TEXT,
  description     TEXT,
  is_active       BOOLEAN DEFAULT true,
  synced_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_prod_name  ON oneoffice_crm_products(name);
CREATE INDEX IF NOT EXISTS idx_crm_prod_code  ON oneoffice_crm_products(code);

-- RLS
ALTER TABLE oneoffice_crm_products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_products' AND tablename = 'oneoffice_crm_products') THEN
    CREATE POLICY "service_role_all_products" ON oneoffice_crm_products FOR ALL USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_read_products' AND tablename = 'oneoffice_crm_products') THEN
    CREATE POLICY "allow_read_products" ON oneoffice_crm_products FOR SELECT USING (true);
  END IF;
END $$;
