import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { parseDateVN, normalizeDateToISO } from '@/lib/utils/date';

function getMonthFromDamCode(maDam: unknown): number | null {
  const match = String(maDam || '').match(/^(?:BL)?\d{2}(\d{2})/i);
  if (!match) return null;
  const month = Number(match[1]);
  return month >= 1 && month <= 12 ? month : null;
}

/**
 * GET /api/dam — List đám từ fact_dam
 * 
 * Query params:
 *   ?all=true  → Trả tất cả đám (bao gồm quá khứ)
 *   (default)  → Chỉ trả đám có ngay_liem >= hôm nay (tương lai)
 * 
 * Returns: ma_dam, nguoi_mat, ngay_liem, loai, chi_nhanh
 */
export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const showAll = request.nextUrl.searchParams.get('all') === 'true';

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
      .limit(200);
    return NextResponse.json({ data: dimData || [] });
  }

  // Filter: optionally only keep future dates
  const filtered = showAll
    ? (data || []).filter((d: any) => {
        // Even in "all" mode, skip rows with unparseable dates
        const str = String(d.ngay_liem || '').trim();
        return str !== '' && parseDateVN(str, { expectedMonth: getMonthFromDamCode(d.ma_dam) }) !== null;
      })
    : (data || []).filter((d: any) => {
        const expectedMonth = getMonthFromDamCode(d.ma_dam);
        const dateObj = parseDateVN(d.ngay_liem, { expectedMonth });
        if (!dateObj) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return dateObj >= today;
      });

  // Normalize ngay_liem to ISO format for frontend
  const normalized = filtered.map((d: any) => ({
    ...d,
    ngay_liem: normalizeDateToISO(d.ngay_liem, { expectedMonth: getMonthFromDamCode(d.ma_dam) }),
  }));

  return NextResponse.json({ data: normalized });
}
