const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const migrationSQL = [
    `CREATE TABLE IF NOT EXISTS stocktake_items (
      id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      stocktake_id        uuid REFERENCES stocktakes(id) ON DELETE CASCADE,
      product_code        text NOT NULL,
      product_name        text,
      system_quantity     integer DEFAULT 0,
      actual_quantity     integer DEFAULT 0,
      difference          integer GENERATED ALWAYS AS (actual_quantity - system_quantity) STORED,
      note                text,
      created_at          timestamptz DEFAULT now(),
      updated_at          timestamptz DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_stocktake_items_stocktake_id ON stocktake_items(stocktake_id)`,
    `CREATE INDEX IF NOT EXISTS idx_stocktake_items_product_code ON stocktake_items(product_code)`,
    `ALTER TABLE stocktake_items ENABLE ROW LEVEL SECURITY`,
    `DROP POLICY IF EXISTS "Public read stocktake_items" ON stocktake_items`,
    `CREATE POLICY "Public read stocktake_items" ON stocktake_items FOR SELECT USING (true)`,
    `DROP POLICY IF EXISTS "Service insert stocktake_items" ON stocktake_items`,
    `CREATE POLICY "Service insert stocktake_items" ON stocktake_items FOR INSERT WITH CHECK (true)`,
    `DROP POLICY IF EXISTS "Service update stocktake_items" ON stocktake_items`,
    `CREATE POLICY "Service update stocktake_items" ON stocktake_items FOR UPDATE USING (true)`,
    `DROP POLICY IF EXISTS "Service delete stocktake_items" ON stocktake_items`,
    `CREATE POLICY "Service delete stocktake_items" ON stocktake_items FOR DELETE USING (true)`
  ];
  
  for (const sql of migrationSQL) {
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) console.error("Error executing:", sql.substring(0, 50), error);
    else console.log("Success:", sql.substring(0, 50));
  }
}
run();
