/**
 * GET /api/fix-dim-dam
 * One-time migration: add 'ngay' column to dim_dam
 * DELETE THIS FILE after running once
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Step 1: Check if 'ngay' column exists by trying to select it
  const { error: colCheck } = await supabase
    .from('dim_dam')
    .select('ngay')
    .limit(1);

  if (colCheck && colCheck.code === '42703') {
    // Column doesn't exist — we need to add it via SQL
    // Supabase JS client can't run DDL directly, so we use a workaround:
    // We'll drop and recreate the table with the ngay column
    // BUT that would lose data, so instead we do upsert without 'ngay' first
    
    return NextResponse.json({
      status: 'COLUMN_MISSING',
      message: 'Cột "ngay" chưa tồn tại trong dim_dam. Bạn cần chạy SQL sau trong Supabase SQL Editor:',
      sql: 'ALTER TABLE dim_dam ADD COLUMN IF NOT EXISTS ngay text;',
      supabase_sql_editor: `https://supabase.com/dashboard/project/zspazvdyrrkdosqigomk/sql/new`,
    });
  }

  // Step 2: If column exists, update from fact_dam
  const { data: factData } = await supabase
    .from('fact_dam')
    .select('ma_dam, ngay');

  if (factData && factData.length > 0) {
    let updated = 0;
    for (let i = 0; i < factData.length; i += 50) {
      const chunk = factData.slice(i, i + 50).map((r: any) => ({
        ma_dam: r.ma_dam,
        ngay: r.ngay,
      }));
      const { error } = await supabase
        .from('dim_dam')
        .upsert(chunk, { onConflict: 'ma_dam' });
      if (!error) updated += chunk.length;
    }
    return NextResponse.json({ status: 'OK', updated, total_fact_rows: factData.length });
  }

  return NextResponse.json({ status: 'OK', message: 'Column exists, no fact_dam data to sync' });
}
