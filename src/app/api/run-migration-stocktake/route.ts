import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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

export async function GET() {
  const supabase = getSupabaseAdmin();
  const results: { sql: string; ok: boolean; error?: string }[] = [];

  for (const sql of migrationSQL) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql }).single();
      if (error) {
        results.push({ sql: sql.substring(0, 60) + '...', ok: false, error: error.message });
      } else {
        results.push({ sql: sql.substring(0, 60) + '...', ok: true });
      }
    } catch (e) {
      results.push({
        sql: sql.substring(0, 60) + '...',
        ok: false,
        error: String(e),
      });
    }
  }

  const ok = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;

  return NextResponse.json({
    message: `Migration done: ${ok} thành công, ${failed} lỗi`,
    results,
  });
}
