/**
 * GET /api/run-migration
 * Chạy SQL migration để tạo các bảng mới cho 1Office sync
 * Chỉ dùng trong môi trường dev
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseKey);

// SQL statements to run (split individually)
const migrationSQL = [
  // products table
  `CREATE TABLE IF NOT EXISTS products (
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
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS idx_products_oneoffice_id ON products (oneoffice_id) WHERE oneoffice_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_products_code ON products (code)`,

  `ALTER TABLE products ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "Public read products" ON products`,
  `CREATE POLICY "Public read products" ON products FOR SELECT USING (true)`,
  `DROP POLICY IF EXISTS "Service insert products" ON products`,
  `CREATE POLICY "Service insert products" ON products FOR INSERT WITH CHECK (true)`,
  `DROP POLICY IF EXISTS "Service update products" ON products`,
  `CREATE POLICY "Service update products" ON products FOR UPDATE USING (true)`,

  // sale_contracts table
  `CREATE TABLE IF NOT EXISTS sale_contracts (
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
  )`,
  `ALTER TABLE sale_contracts ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "Public read sale_contracts" ON sale_contracts`,
  `CREATE POLICY "Public read sale_contracts" ON sale_contracts FOR SELECT USING (true)`,
  `DROP POLICY IF EXISTS "Service insert sale_contracts" ON sale_contracts`,
  `CREATE POLICY "Service insert sale_contracts" ON sale_contracts FOR INSERT WITH CHECK (true)`,
  `DROP POLICY IF EXISTS "Service update sale_contracts" ON sale_contracts`,
  `CREATE POLICY "Service update sale_contracts" ON sale_contracts FOR UPDATE USING (true)`,

  // sale_quotations table
  `CREATE TABLE IF NOT EXISTS sale_quotations (
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
  )`,
  `ALTER TABLE sale_quotations ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "Public read sale_quotations" ON sale_quotations`,
  `CREATE POLICY "Public read sale_quotations" ON sale_quotations FOR SELECT USING (true)`,
  `DROP POLICY IF EXISTS "Service insert sale_quotations" ON sale_quotations`,
  `CREATE POLICY "Service insert sale_quotations" ON sale_quotations FOR INSERT WITH CHECK (true)`,
  `DROP POLICY IF EXISTS "Service update sale_quotations" ON sale_quotations`,
  `CREATE POLICY "Service update sale_quotations" ON sale_quotations FOR UPDATE USING (true)`,

  // stocktakes table
  `CREATE TABLE IF NOT EXISTS stocktakes (
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
  )`,
  `ALTER TABLE stocktakes ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "Public read stocktakes" ON stocktakes`,
  `CREATE POLICY "Public read stocktakes" ON stocktakes FOR SELECT USING (true)`,
  `DROP POLICY IF EXISTS "Service insert stocktakes" ON stocktakes`,
  `CREATE POLICY "Service insert stocktakes" ON stocktakes FOR INSERT WITH CHECK (true)`,
  `DROP POLICY IF EXISTS "Service update stocktakes" ON stocktakes`,
  `CREATE POLICY "Service update stocktakes" ON stocktakes FOR UPDATE USING (true)`,

  // goods_receipts: thêm cột oneoffice_id nếu chưa có
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='goods_receipts' AND column_name='oneoffice_id') THEN
      ALTER TABLE goods_receipts ADD COLUMN oneoffice_id integer UNIQUE;
    END IF;
  END $$`,

  // goods_receipts: bỏ NOT NULL trên warehouse_id để insert không cần warehouse
  `ALTER TABLE goods_receipts ALTER COLUMN warehouse_id DROP NOT NULL`,
];

export async function GET() {
  const results: { sql: string; ok: boolean; error?: string }[] = [];

  for (const sql of migrationSQL) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql }).single();
      if (error) {
        // Fallback: try direct query via REST
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
