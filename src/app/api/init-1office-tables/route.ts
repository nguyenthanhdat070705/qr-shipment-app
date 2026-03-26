/**
 * GET /api/init-1office-tables
 * Tạo tất cả bảng 1Office trong Supabase nếu chưa tồn tại.
 * Chạy 1 lần sau khi deploy.
 * Bảo vệ bởi SYNC_API_KEY.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Tạo từng bảng bằng cách gọi RPC exec hoặc dùng raw query
const MIGRATION_STEPS = [
  {
    name: 'trigger_set_updated_at',
    check: async () => {
      const { data } = await supabase
        .rpc('trigger_set_updated_at')
        .select();
      return !!data;
    },
    sql: `
      CREATE OR REPLACE FUNCTION trigger_set_updated_at()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
    `,
  },
  {
    name: 'sync_logs',
    checkTable: 'sync_logs',
    sql: `
      CREATE TABLE IF NOT EXISTS sync_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        sync_type text NOT NULL DEFAULT '1office_full',
        started_at timestamptz, finished_at timestamptz,
        total_duration_ms integer,
        tables_synced text[], total_fetched integer DEFAULT 0,
        total_upserted integer DEFAULT 0, total_errors integer DEFAULT 0,
        success boolean DEFAULT true, details jsonb, note text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
      CREATE POLICY IF NOT EXISTS "read_sync_logs" ON sync_logs FOR SELECT USING (true);
      CREATE POLICY IF NOT EXISTS "insert_sync_logs" ON sync_logs FOR INSERT WITH CHECK (true);
    `,
  },
  {
    name: 'warehouses_1office',
    checkTable: 'warehouses_1office',
    sql: `
      CREATE TABLE IF NOT EXISTS warehouses_1office (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        oneoffice_id integer UNIQUE,
        code text NOT NULL, name text NOT NULL, address text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      ALTER TABLE warehouses_1office ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "read_warehouses_1office" ON warehouses_1office;
      CREATE POLICY "read_warehouses_1office" ON warehouses_1office FOR SELECT USING (true);
      DROP POLICY IF EXISTS "insert_warehouses_1office" ON warehouses_1office;
      CREATE POLICY "insert_warehouses_1office" ON warehouses_1office FOR INSERT WITH CHECK (true);
      DROP POLICY IF EXISTS "update_warehouses_1office" ON warehouses_1office;
      CREATE POLICY "update_warehouses_1office" ON warehouses_1office FOR UPDATE USING (true);
    `,
  },
  {
    name: 'goods_receipts_1office',
    checkTable: 'goods_receipts_1office',
    sql: `
      CREATE TABLE IF NOT EXISTS goods_receipts_1office (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        oneoffice_id integer UNIQUE,
        gr_code text NOT NULL, warehouse_name text, warehouse_code text,
        supplier_name text, supplier_code text, status text,
        approval_status text, total_amount numeric(15,2) DEFAULT 0,
        note text, received_date date, created_by text, product_list text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      ALTER TABLE goods_receipts_1office ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "read_gr_1o" ON goods_receipts_1office;
      CREATE POLICY "read_gr_1o" ON goods_receipts_1office FOR SELECT USING (true);
      DROP POLICY IF EXISTS "insert_gr_1o" ON goods_receipts_1office;
      CREATE POLICY "insert_gr_1o" ON goods_receipts_1office FOR INSERT WITH CHECK (true);
      DROP POLICY IF EXISTS "update_gr_1o" ON goods_receipts_1office;
      CREATE POLICY "update_gr_1o" ON goods_receipts_1office FOR UPDATE USING (true);
    `,
  },
  {
    name: 'inventory_1office',
    checkTable: 'inventory_1office',
    sql: `
      CREATE TABLE IF NOT EXISTS inventory_1office (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        oneoffice_id integer UNIQUE,
        product_code text, product_name text,
        warehouse_name text, warehouse_code text,
        quantity numeric(15,3) DEFAULT 0,
        available_qty numeric(15,3) DEFAULT 0, unit text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      ALTER TABLE inventory_1office ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "read_inv_1o" ON inventory_1office;
      CREATE POLICY "read_inv_1o" ON inventory_1office FOR SELECT USING (true);
      DROP POLICY IF EXISTS "insert_inv_1o" ON inventory_1office;
      CREATE POLICY "insert_inv_1o" ON inventory_1office FOR INSERT WITH CHECK (true);
      DROP POLICY IF EXISTS "update_inv_1o" ON inventory_1office;
      CREATE POLICY "update_inv_1o" ON inventory_1office FOR UPDATE USING (true);
    `,
  },
  {
    name: 'sale_orders',
    checkTable: 'sale_orders',
    sql: `
      CREATE TABLE IF NOT EXISTS sale_orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        oneoffice_id integer UNIQUE,
        order_code text NOT NULL, title text, customer_id integer,
        customer_name text, customer_code text, customer_phone text,
        customer_email text, order_date date, delivery_date date,
        status text, approval_status text,
        total_amount numeric(15,2) DEFAULT 0,
        currency_unit text DEFAULT 'VND',
        product_list text, note text, created_by text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      ALTER TABLE sale_orders ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "read_so" ON sale_orders;
      CREATE POLICY "read_so" ON sale_orders FOR SELECT USING (true);
      DROP POLICY IF EXISTS "insert_so" ON sale_orders;
      CREATE POLICY "insert_so" ON sale_orders FOR INSERT WITH CHECK (true);
      DROP POLICY IF EXISTS "update_so" ON sale_orders;
      CREATE POLICY "update_so" ON sale_orders FOR UPDATE USING (true);
    `,
  },
  {
    name: 'products_add_oneoffice_id',
    alterOnly: true,
    sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS oneoffice_id integer;`,
  },
  {
    name: 'sale_contracts_add_col',
    alterOnly: true,
    sql: `ALTER TABLE sale_contracts ADD COLUMN IF NOT EXISTS oneoffice_id integer;`,
  },
  {
    name: 'sale_quotations_add_col',
    alterOnly: true,
    sql: `ALTER TABLE sale_quotations ADD COLUMN IF NOT EXISTS oneoffice_id integer;`,
  },
  {
    name: 'stocktakes_add_col',
    alterOnly: true,
    sql: `ALTER TABLE stocktakes ADD COLUMN IF NOT EXISTS oneoffice_id integer;`,
  },
];

function authorized(req: NextRequest): boolean {
  const key = req.headers.get('x-sync-api-key') || req.nextUrl.searchParams.get('api_key');
  const expected = process.env.SYNC_API_KEY;
  if (!expected) return true;
  return key === expected;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, string> = {};
  let hasError = false;

  for (const step of MIGRATION_STEPS) {
    try {
      // Check if table already exists
      if (step.checkTable) {
        const { error: checkErr } = await supabase
          .from(step.checkTable)
          .select('*')
          .limit(1);
        
        if (!checkErr) {
          results[step.name] = 'already_exists';
          continue;
        }
      }

      // Execute via rpc or raw SQL approach
      // Since we can't run DDL directly, we'll need to use the SQL editor
      // BUT we CAN use the Supabase Admin API via REST
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`,
        {
          method: 'POST',
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
            'Content-Type': 'application/json',
            'X-Client-Info': 'blackstone-scm',
          },
          body: step.sql,
        }
      );

      results[step.name] = response.ok ? 'created' : `error_${response.status}`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results[step.name] = `error: ${msg}`;
      hasError = true;
    }
  }

  return NextResponse.json({
    message: hasError
      ? 'IMPORTANT: Vui lòng chạy migration_1office_tables.sql trong Supabase SQL Editor'
      : 'Kiểm tra bảng hoàn tất',
    sql_editor_url: `https://supabase.com/dashboard/project/${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('.')[0].split('//')[1]}/sql/new`,
    steps: results,
    migration_file: 'migration_1office_tables.sql',
  }, { status: hasError ? 206 : 200 });
}

export const maxDuration = 60;
