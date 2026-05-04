import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/stocktake/migrate
 * Creates stocktake tables using Supabase Management API (pg_query via SQL endpoint).
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
  }

  const sql = `
    -- 1. Header: Phiếu kiểm kho
    CREATE TABLE IF NOT EXISTS fact_kiem_kho (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      ma_phieu_kiem VARCHAR(50) NOT NULL UNIQUE,
      kho_id UUID,
      trang_thai VARCHAR(30) DEFAULT 'in_progress',
      nguoi_kiem_id UUID,
      nguoi_kiem_email VARCHAR(255),
      ngay_kiem DATE DEFAULT CURRENT_DATE,
      ghi_chu TEXT,
      tong_loai_kiem INT DEFAULT 0,
      tong_lech INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 2. Detail: Từng hòm trong phiếu kiểm kho
    CREATE TABLE IF NOT EXISTS fact_kiem_kho_items (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      kiem_kho_id UUID NOT NULL REFERENCES fact_kiem_kho(id) ON DELETE CASCADE,
      hom_id UUID,
      ma_hom VARCHAR(50) NOT NULL,
      ten_hom VARCHAR(500),
      so_luong_he_thong INT DEFAULT 0,
      so_luong_thuc_te INT DEFAULT 0,
      chenh_lech INT GENERATED ALWAYS AS (so_luong_thuc_te - so_luong_he_thong) STORED,
      ghi_chu TEXT,
      trang_thai VARCHAR(30) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 3. Indexes
    CREATE INDEX IF NOT EXISTS idx_kiem_kho_kho_id ON fact_kiem_kho(kho_id);
    CREATE INDEX IF NOT EXISTS idx_kiem_kho_trang_thai ON fact_kiem_kho(trang_thai);
    CREATE INDEX IF NOT EXISTS idx_kiem_kho_items_kiem_kho_id ON fact_kiem_kho_items(kiem_kho_id);
    CREATE INDEX IF NOT EXISTS idx_kiem_kho_items_ma_hom ON fact_kiem_kho_items(ma_hom);

    -- 4. RLS
    ALTER TABLE fact_kiem_kho ENABLE ROW LEVEL SECURITY;
    ALTER TABLE fact_kiem_kho_items ENABLE ROW LEVEL SECURITY;

    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fact_kiem_kho' AND policyname = 'allow_all_fact_kiem_kho') THEN
        CREATE POLICY allow_all_fact_kiem_kho ON fact_kiem_kho FOR ALL USING (true) WITH CHECK (true);
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fact_kiem_kho_items' AND policyname = 'allow_all_fact_kiem_kho_items') THEN
        CREATE POLICY allow_all_fact_kiem_kho_items ON fact_kiem_kho_items FOR ALL USING (true) WITH CHECK (true);
      END IF;
    END $$;
  `;

  // Extract project ref from URL: https://xxxx.supabase.co → xxxx
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0];

  // Try Supabase Management API (v1/query endpoint)
  const approaches: { name: string; ok: boolean; error?: string }[] = [];

  // Approach 1: Supabase pg REST query (newer API)
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ sql }),
    });
    const text = await res.text();
    if (res.ok || res.status === 204) {
      approaches.push({ name: 'rpc/exec_sql', ok: true });
    } else {
      approaches.push({ name: 'rpc/exec_sql', ok: false, error: text.substring(0, 200) });
    }
  } catch (e: any) {
    approaches.push({ name: 'rpc/exec_sql', ok: false, error: e.message });
  }

  // Approach 2: Direct Postgres query via Supabase SQL endpoint (if available)
  if (!approaches.some(a => a.ok)) {
    try {
      const res = await fetch(`${supabaseUrl}/pg/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: sql }),
      });
      const text = await res.text();
      if (res.ok) {
        approaches.push({ name: 'pg/query', ok: true });
      } else {
        approaches.push({ name: 'pg/query', ok: false, error: text.substring(0, 200) });
      }
    } catch (e: any) {
      approaches.push({ name: 'pg/query', ok: false, error: e.message });
    }
  }

  const anySuccess = approaches.some(a => a.ok);

  // Verify tables exist by trying to query them
  try {
    const testRes = await fetch(`${supabaseUrl}/rest/v1/fact_kiem_kho?select=id&limit=1`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    });
    if (testRes.ok) {
      return NextResponse.json({
        message: '✅ Tables fact_kiem_kho & fact_kiem_kho_items are ready!',
        status: 'ok',
        approaches,
      });
    }
  } catch {}

  return NextResponse.json({
    message: anySuccess
      ? '⚠️ SQL ran but tables may not be accessible yet. Refresh Supabase schema cache.'
      : '❌ Could not create tables automatically. Please run SQL manually in Supabase Dashboard.',
    status: anySuccess ? 'partial' : 'manual_required',
    approaches,
    manual_sql: sql.trim(),
  });
}
