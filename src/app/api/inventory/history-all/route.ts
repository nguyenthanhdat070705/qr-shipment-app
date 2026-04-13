import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const warehouseFilter = searchParams.get('warehouse');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // 1. Fetch Nhập Kho (Imports)
    // GRPO thường lưu trong fact_nhap_hang & fact_nhap_hang_items
    let importQuery = supabase
      .from('fact_nhap_hang_items')
      .select(`
        id,
        ma_hom,
        ten_hom,
        so_luong:so_luong_thuc_nhan,
        ghi_chu,
        created_at,
        fact_nhap_hang!inner(ma_phieu_nhap, kho_id)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    // 2. Fetch Xuất Kho (Exports)
    let exportQuery = supabase
      .from('fact_xuat_hang_items')
      .select(`
        id,
        ma_hom,
        ten_hom,
        so_luong,
        ghi_chu,
        created_at,
        fact_xuat_hang!inner(ma_phieu_xuat, kho_id, ghi_chu)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    const [importRes, exportRes] = await Promise.all([importQuery, exportQuery]);

    // Lọc theo kho (nếu cần)
    // Tạm thời nếu có warehouse thì filter bằng JS vì kho_id/tên kho phức tạp.
    let filterKhoId: string | null = null;
    if (warehouseFilter && warehouseFilter.trim() !== '') {
      const { data: khoData } = await supabase.from('dim_kho').select('id, ten_kho').ilike('ten_kho', `%${warehouseFilter}%`).limit(1).single();
      if (khoData) {
        filterKhoId = khoData.id;
      }
    }

    let allItems: any[] = [];

    // Map Imports
    if (importRes.data) {
      importRes.data.forEach((item: any) => {
        if (filterKhoId && item.fact_nhap_hang?.kho_id !== filterKhoId) return;
        allItems.push({
          id: item.id,
          type: 'import',
          created_at: item.created_at,
          voucher: item.fact_nhap_hang?.ma_phieu_nhap || 'GRPO',
          ma_sp: item.ma_hom,
          ten_sp: item.ten_hom,
          so_luong: item.so_luong || 0,
          ma_dam: '', // Nhập không có mã đám
          ghi_chu: item.ghi_chu || ''
        });
      });
    }

    // Map Exports
    if (exportRes.data) {
      exportRes.data.forEach((item: any) => {
        if (filterKhoId && item.fact_xuat_hang?.kho_id !== filterKhoId) return;
        
        let ma_dam = '';
        const combinedNote = (item.ghi_chu || '') + ' ' + (item.fact_xuat_hang?.ghi_chu || '');
        if (combinedNote) {
          // Parse "Mã Đám: XXXXX" hoặc "đám XXXXX"
          const m1 = combinedNote.match(/Mã Đám:\s*(\w+)/i);
          if (m1 && m1[1]) ma_dam = m1[1];
          else {
            const m2 = combinedNote.match(/đám\s+(\d+)/i);
            if (m2 && m2[1]) ma_dam = m2[1];
          }
        }

        allItems.push({
          id: item.id,
          type: 'export',
          created_at: item.created_at,
          voucher: item.fact_xuat_hang?.ma_phieu_xuat || 'IT',
          ma_sp: item.ma_hom,
          ten_sp: item.ten_hom,
          so_luong: item.so_luong || 0,
          ma_dam: ma_dam,
          ghi_chu: item.ghi_chu || ''
        });
      });
    }

    // Combine and Sort by date descending
    allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Cut to limit
    allItems = allItems.slice(0, limit);

    return NextResponse.json({ data: allItems });

  } catch (error: any) {
    console.error('Error in history-all:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
