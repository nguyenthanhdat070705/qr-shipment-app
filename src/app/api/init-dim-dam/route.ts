/**
 * GET /api/init-dim-dam
 * Create dim_dam table and seed from CSV data
 */
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getSupabaseAdmin();

  // Check if table exists
  const { error: checkErr } = await supabase.from('dim_dam').select('id').limit(1);

  if (checkErr) {
    return NextResponse.json({
      tableExists: false,
      message: 'Bảng dim_dam chưa tồn tại. Vui lòng tạo bảng trong Supabase SQL Editor.',
      sql: `CREATE TABLE IF NOT EXISTS public.dim_dam (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ma_dam TEXT UNIQUE NOT NULL,
  ngay TEXT,
  loai TEXT,
  chi_nhanh TEXT,
  nguoi_mat TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.dim_dam ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_dim_dam" ON public.dim_dam FOR ALL USING (true) WITH CHECK (true);`,
    });
  }

  const { count } = await supabase.from('dim_dam').select('*', { count: 'exact', head: true });
  return NextResponse.json({ tableExists: true, count });
}

export async function POST(req: Request) {
  const supabase = getSupabaseAdmin();

  const body = await req.json();
  const records = body.records as { ma_dam: string; loai: string | null; chi_nhanh: string | null; nguoi_mat: string | null }[];

  if (!records || !Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ error: 'No records provided' }, { status: 400 });
  }

  // Upsert in batches
  let ok = 0;
  const errors: string[] = [];
  const BATCH = 50;

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from('dim_dam')
      .upsert(batch, { onConflict: 'ma_dam', ignoreDuplicates: false })
      .select('id');

    if (error) {
      errors.push(`Batch ${i + 1}-${i + batch.length}: ${error.message}`);
    } else {
      ok += (data || []).length;
    }
  }

  const { count } = await supabase.from('dim_dam').select('*', { count: 'exact', head: true });

  return NextResponse.json({
    success: true,
    upserted: ok,
    errors: errors.length > 0 ? errors : undefined,
    totalInTable: count,
  });
}
