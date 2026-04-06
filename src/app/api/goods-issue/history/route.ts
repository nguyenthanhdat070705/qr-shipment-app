import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();

  try {
    const { searchParams } = new URL(request.url);
    const warehouseFilter = searchParams.get('warehouse');
    const createdBy = searchParams.get('created_by'); // Filter by who created

    // Fetch goods issue records with items + warehouse + creator info
    let query = supabase
      .from('fact_xuat_hang')
      .select(`
        id,
        ma_phieu_xuat,
        ten_khach,
        ghi_chu,
        trang_thai,
        nguoi_xuat_id,
        created_at,
        dim_kho!inner ( id, ten_kho ),
        dim_account ( ho_ten, email ),
        fact_xuat_hang_items (
          ma_hom,
          ten_hom,
          so_luong,
          ghi_chu
        )
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    // Apply warehouse filtering if active
    if (warehouseFilter && warehouseFilter !== 'Tổng kho') {
      query = query.ilike('dim_kho.ten_kho', `%${warehouseFilter}%`);
    }

    // Filter by creator if specified
    if (createdBy && createdBy.includes('@')) {
      // Find account ID first
      const { data: account } = await supabase
        .from('dim_account')
        .select('id')
        .eq('email', createdBy)
        .maybeSingle();

      if (account) {
        query = query.eq('nguoi_xuat_id', account.id);
      }
    }

    const { data: issues, error } = await query;

    if (error) throw error;

    // Map to include readable fields
    const mapped = (issues || []).map((item: any) => ({
      ...item,
      kho_xuat: item.dim_kho?.ten_kho || '—',
      nguoi_tao: item.dim_account?.ho_ten || item.dim_account?.email?.split('@')[0] || '—',
    }));

    return NextResponse.json({ data: mapped });
  } catch (err: any) {
    console.error('[goods-issue/history]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
