import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * GET /api/dam — List all đám with ngay_liem >= today (upcoming funerals only)
 * Returns: ma_dam, nguoi_mat, ngay_liem, loai, chi_nhanh
 */
export async function GET() {
  const supabase = getSupabaseAdmin();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const { data, error } = await supabase
    .from('fact_dam')
    .select('ma_dam, nguoi_mat, ngay_liem, loai, chi_nhanh')
    .gte('ngay_liem', today)
    .order('ngay_liem', { ascending: true });

  if (error) {
    // If fact_dam doesn't exist, try dim_dam as fallback
    const { data: dimData, error: dimError } = await supabase
      .from('dim_dam')
      .select('ma_dam, nguoi_mat, loai, chi_nhanh')
      .order('ma_dam', { ascending: false })
      .limit(50);

    if (dimError) {
      return NextResponse.json({ data: [] });
    }
    return NextResponse.json({ data: dimData || [] });
  }

  return NextResponse.json({ data: data || [] });
}
