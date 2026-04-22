import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic'; // Trigger hot reload

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const warehouseFilter = searchParams.get('warehouse');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Resolve warehouse ID if filter is provided
    let filterKhoId: string | null = null;
    if (warehouseFilter && warehouseFilter.trim() !== '') {
      // Strip "Kho " prefix since dim_kho.ten_kho stores names like "Hàm Long", "Kha Vạn Cân"
      const cleanName = warehouseFilter.replace(/^Kho\s+/i, '').trim();
      
      // Try exact-ish match with cleaned name first
      let { data: khoData } = await supabase
        .from('dim_kho')
        .select('id, ten_kho')
        .ilike('ten_kho', `%${cleanName}%`)
        .limit(1)
        .maybeSingle();
      
      // Fallback: try original filter
      if (!khoData) {
        const res = await supabase
          .from('dim_kho')
          .select('id, ten_kho')
          .ilike('ten_kho', `%${warehouseFilter}%`)
          .limit(1)
          .maybeSingle();
        khoData = res.data;
      }
      
      if (khoData) {
        filterKhoId = khoData.id;
      }
    }

    // 1. Fetch Nhập Kho (Imports) from fact_nhap_hang_items
    let importQuery = supabase
      .from('fact_nhap_hang_items')
      .select(`
        id,
        ma_hom,
        ten_hom,
        so_luong:so_luong_thuc_nhan,
        ghi_chu,
        created_at,
        fact_nhap_hang!inner(ma_phieu_nhap, kho_id, dim_kho (ten_kho))
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    // 2. Fetch Xuất Kho (Exports) — two strategies:
    //    a) From fact_xuat_hang_items (detailed items)
    //    b) From fact_xuat_hang directly (fallback when items are missing)

    let exportItemsQuery = supabase
      .from('fact_xuat_hang_items')
      .select(`
        id,
        ma_hom,
        ten_hom,
        so_luong,
        ghi_chu,
        created_at,
        fact_xuat_hang!inner(ma_phieu_xuat, kho_id, ghi_chu, ten_khach, dim_kho (ten_kho))
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Also fetch export headers directly for records without items
    let exportHeaderQuery = supabase
      .from('fact_xuat_hang')
      .select(`
        id,
        ma_phieu_xuat,
        kho_id,
        ten_khach,
        ghi_chu,
        trang_thai,
        created_at,
        dim_kho ( ten_kho ),
        fact_xuat_hang_items ( id, ma_hom, ten_hom, so_luong )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    const [importRes, exportItemsRes, exportHeaderRes] = await Promise.all([
      importQuery,
      exportItemsQuery,
      exportHeaderQuery,
    ]);

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
          ghi_chu: item.ghi_chu || '',
          kho_name: item.fact_nhap_hang?.dim_kho?.ten_kho || ''
        });
      });
    }

    // Map Exports — prefer items, fallback to headers
    const exportIdsFromItems = new Set<string>();

    if (exportItemsRes.data && exportItemsRes.data.length > 0) {
      exportItemsRes.data.forEach((item: any) => {
        if (filterKhoId && item.fact_xuat_hang?.kho_id !== filterKhoId) return;

        // Track which export headers have items
        if (item.fact_xuat_hang) {
          exportIdsFromItems.add(item.fact_xuat_hang?.ma_phieu_xuat);
        }
        
        let ma_dam = '';
        let extractedKho = '';
        const combinedNote = (item.ghi_chu || '') + ' ' + (item.fact_xuat_hang?.ghi_chu || '');
        if (combinedNote) {
          const m1 = combinedNote.match(/Mã Đám:\s*(\w+)/i);
          if (m1 && m1[1]) ma_dam = m1[1];
          else {
            const m2 = combinedNote.match(/đám\s+(\d+)/i);
            if (m2 && m2[1]) ma_dam = m2[1];
          }
          
          const kMatch = combinedNote.match(/Kho:\s*([^—]+)/i);
          if (kMatch && kMatch[1]) extractedKho = kMatch[1].trim();
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
          ghi_chu: item.ghi_chu || '',
          ten_khach: item.fact_xuat_hang?.ten_khach || '',
          kho_name: item.fact_xuat_hang?.dim_kho?.ten_kho || extractedKho || '',
        });
      });
    }

    // Fallback: Include export headers that DON'T have items in fact_xuat_hang_items
    if (exportHeaderRes.data) {
      exportHeaderRes.data.forEach((header: any) => {
        if (filterKhoId && header.kho_id !== filterKhoId) return;
        
        // Skip if this header already has items processed above
        if (exportIdsFromItems.has(header.ma_phieu_xuat)) return;

        const items = header.fact_xuat_hang_items || [];
        
        // If header has items attached, map each one
        if (items.length > 0) {
          items.forEach((item: any) => {
            let ma_dam = '';
            let extractedKho = '';
            if (header.ghi_chu) {
              const m1 = header.ghi_chu.match(/Mã Đám:\s*(\w+)/i);
              if (m1 && m1[1]) ma_dam = m1[1];
              else {
                const m2 = header.ghi_chu.match(/đám\s+(\d+)/i);
                if (m2 && m2[1]) ma_dam = m2[1];
              }

              const kMatch = header.ghi_chu.match(/Kho:\s*([^—]+)/i);
              if (kMatch && kMatch[1]) extractedKho = kMatch[1].trim();
            }

            allItems.push({
              id: `${header.id}-${item.id}`,
              type: 'export',
              created_at: header.created_at,
              voucher: header.ma_phieu_xuat || 'IT',
              ma_sp: item.ma_hom,
              ten_sp: item.ten_hom,
              so_luong: item.so_luong || 0,
              ma_dam,
              ghi_chu: header.ghi_chu || '',
              ten_khach: header.ten_khach || '',
              kho_name: header.dim_kho?.ten_kho || extractedKho || '',
            });
          });
        } else {
          // No items at all — still show the export header as a record
          let ma_dam = '';
          let extractedKho = '';
          if (header.ghi_chu) {
            const m1 = header.ghi_chu.match(/Mã Đám:\s*(\w+)/i);
            if (m1 && m1[1]) ma_dam = m1[1];
            else {
              const m2 = header.ghi_chu.match(/đám\s+(\d+)/i);
              if (m2 && m2[1]) ma_dam = m2[1];
            }

            const kMatch = header.ghi_chu.match(/Kho:\s*([^—]+)/i);
            if (kMatch && kMatch[1]) extractedKho = kMatch[1].trim();
          }

          allItems.push({
            id: header.id,
            type: 'export',
            created_at: header.created_at,
            voucher: header.ma_phieu_xuat || 'IT',
            ma_sp: '—',
            ten_sp: header.ten_khach || 'Xuất kho',
            so_luong: 1,
            ma_dam,
            ghi_chu: header.ghi_chu || '',
            ten_khach: header.ten_khach || '',
            kho_name: header.dim_kho?.ten_kho || extractedKho || '',
            trang_thai: header.trang_thai,
          });
        }
      });
    }

    // Combine and Sort by date descending
    allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Cut to limit
    allItems = allItems.slice(0, limit);

    // Calculate summary counts
    const importCount = allItems.filter(i => i.type === 'import').length;
    const exportCount = allItems.filter(i => i.type === 'export').length;

    return NextResponse.json({ 
      data: allItems,
      summary: {
        importCount,
        exportCount,
        totalCount: allItems.length,
      }
    });

  } catch (error: any) {
    console.error('Error in history-all:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
