require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  global: { headers: { 'x-supabase-auth-override': 'service_role' } }
});

async function createTable() {
  const sql = `
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
    CREATE INDEX IF NOT EXISTS idx_crm_prod_name ON oneoffice_crm_products(name);
    CREATE INDEX IF NOT EXISTS idx_crm_prod_code ON oneoffice_crm_products(code);
    ALTER TABLE oneoffice_crm_products ENABLE ROW LEVEL SECURITY;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_products' AND tablename = 'oneoffice_crm_products') THEN
        CREATE POLICY "service_role_all_products" ON oneoffice_crm_products FOR ALL USING (true);
      END IF;
    END $$;
  `;
  
  // Actually Supabase JS `.rpc` or similar is needed to execute raw SQL, but we don't have standard exec.
  // Wait, the standard way in this app to create tables is putting an SQL file and maybe executing it. Wait, I can just use Supabase JS REST if there is an RPC.
  // But without an RPC to exec sql, `createTable` can't be run directly via Supabase JS from node easily!
}
createTable();
