import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  const supabase = getSupabaseAdmin();

  try {
    // Fetch recent goods issue records with items
    const { data: issues, error } = await supabase
      .from('fact_xuat_hang')
      .select(`
        id,
        ma_phieu_xuat,
        ten_khach,
        ghi_chu,
        trang_thai,
        created_at,
        fact_xuat_hang_items (
          ma_hom,
          ten_hom,
          so_luong,
          ghi_chu
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json({ data: issues || [] });
  } catch (err: any) {
    console.error('[goods-issue/history]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
