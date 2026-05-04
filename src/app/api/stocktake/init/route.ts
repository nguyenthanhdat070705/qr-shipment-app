import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/stocktake/migrate
 * Creates the stocktake tables using Supabase service role.
 * Uses direct table creation via REST API workaround.
 */
export async function GET() {
  const supabase = getSupabaseAdmin();
  const results: string[] = [];

  // Test if tables already exist
  const { error: testErr } = await supabase.from('fact_kiem_kho').select('id').limit(1);
  
  if (!testErr) {
    return NextResponse.json({ 
      message: '✅ Tables already exist!',
      status: 'ok' 
    });
  }

  // Tables don't exist — try to create them by inserting test data
  // This is a workaround since Supabase REST API doesn't support DDL
  
  // Last resort: Use the Supabase SQL API (available in newer versions)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
  }

  const sqlStatements = [
    `CREATE TABLE IF NOT EXISTS fact_kiem_kho (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      ma_phieu_kiem VARCHAR(50) NOT NULL UNIQUE,
      kho_id UUID,
      trang_thai VARCHAR(30) DEFAULT 'draft',
      nguoi_kiem_id UUID,
      nguoi_kiem_email VARCHAR(255),
      ngay_kiem DATE DEFAULT CURRENT_DATE,
      ghi_chu TEXT,
      tong_loai_kiem INT DEFAULT 0,
      tong_lech INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS fact_kiem_kho_items (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      kiem_kho_id UUID NOT NULL REFERENCES fact_kiem_kho(id) ON DELETE CASCADE,
      hom_id UUID,
      ma_hom VARCHAR(50) NOT NULL,
      ten_hom VARCHAR(255),
      so_luong_he_thong INT DEFAULT 0,
      so_luong_thuc_te INT DEFAULT 0,
      chenh_lech INT GENERATED ALWAYS AS (so_luong_thuc_te - so_luong_he_thong) STORED,
      ghi_chu TEXT,
      trang_thai VARCHAR(30) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  ];

  // Try multiple approaches
  for (const sql of sqlStatements) {
    try {
      // Approach 1: Try via Supabase SQL API (v2)
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ query: sql }),
      });
      results.push(`REST RPC: ${res.status}`);
    } catch (e: any) {
      results.push(`REST RPC error: ${e.message}`);
    }
  }

  // Check again
  const { error: testErr2 } = await supabase.from('fact_kiem_kho').select('id').limit(1);
  
  if (!testErr2) {
    return NextResponse.json({ 
      message: '✅ Tables created successfully!',
      status: 'ok',
      results 
    });
  }

  return NextResponse.json({
    message: '❌ Tables could not be created automatically.',
    status: 'migration_needed',
    instructions: 'Please run the SQL below in Supabase Dashboard > SQL Editor',
    results,
    sql: sqlStatements.join(';\n\n') + ';',
  });
}
