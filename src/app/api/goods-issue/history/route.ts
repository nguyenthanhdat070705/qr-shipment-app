import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();

  try {
    const { searchParams } = new URL(request.url);
    const warehouseFilter = searchParams.get('warehouse');

    // Fetch recent goods issue records with items
    let query = supabase
      .from('fact_xuat_hang')
      .select(`
        id,
        ma_phieu_xuat,
        ten_khach,
        ghi_chu,
        trang_thai,
        created_at,
        dim_kho!inner ( ten_kho ),
        fact_xuat_hang_items (
          ma_hom,
          ten_hom,
          so_luong,
          ghi_chu
        )
      `)
      .order('created_at', { ascending: false })
      .limit(60);

    // Apply warehouse filtering if active
    if (warehouseFilter && warehouseFilter !== 'Tổng kho') {
      query = query.ilike('dim_kho.ten_kho', `%${warehouseFilter}%`);
    }

    const { data: issues, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data: issues || [] });
  } catch (err: any) {
    console.error('[goods-issue/history]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
