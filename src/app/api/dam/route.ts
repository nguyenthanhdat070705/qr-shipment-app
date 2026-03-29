import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * GET /api/dam — List đám with valid ngay_liem in the future
 * Returns: ma_dam, nguoi_mat, ngay_liem, loai, chi_nhanh
 */
export async function GET() {
  const supabase = getSupabaseAdmin();

  // Fetch all đám — filter in JS since ngay_liem might be text
  const { data, error } = await supabase
    .from('fact_dam')
    .select('ma_dam, nguoi_mat, ngay_liem, loai, chi_nhanh')
    .not('ngay_liem', 'is', null)
    .order('ma_dam', { ascending: false });

  if (error) {
    // Fallback to dim_dam
    const { data: dimData } = await supabase
      .from('dim_dam')
      .select('ma_dam, nguoi_mat, loai, chi_nhanh')
      .order('ma_dam', { ascending: false })
      .limit(50);
    return NextResponse.json({ data: dimData || [] });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter: only keep rows where ngay_liem parses to a valid future date
  const filtered = (data || []).filter((d: any) => {
    if (!d.ngay_liem) return false;
    const str = String(d.ngay_liem).trim();
    if (!str) return false;

    // Try parsing — handles ISO dates, dd/mm/yyyy, etc.
    let dateObj: Date | null = null;

    // Try ISO format first (yyyy-mm-dd)
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      dateObj = new Date(str);
    }
    // Try dd/mm/yyyy
    else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
      const [d, m, y] = str.split('/').map(Number);
      dateObj = new Date(y, m - 1, d);
    }
    // Try other formats
    else {
      dateObj = new Date(str);
    }

    if (!dateObj || isNaN(dateObj.getTime())) return false;

    return dateObj >= today;
  });

  // Normalize ngay_liem to ISO format for frontend
  const normalized = filtered.map((d: any) => {
    const str = String(d.ngay_liem).trim();
    let isoDate = str;

    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
      const [day, month, year] = str.split('/').map(Number);
      isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    return { ...d, ngay_liem: isoDate };
  });

  return NextResponse.json({ data: normalized });
}
