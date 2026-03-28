import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * fact_inventory schema (actual column names):
 *   "Mã"            → record ID
 *   "Tên hàng hóa"  → dim_hom.id (UUID)
 *   "Kho"           → dim_kho.id (UUID)
 *   "Số lượng"      → total quantity
 *   "Ghi chú"       → available quantity (khả dụng)
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ error: 'Thiếu tham số tìm kiếm' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const searchCode = q.trim();

  try {
    // 1. Fetch dam data by ma_dam
    const { data: damData } = await supabase
      .from('fact_dam')
      .select('*')
      .eq('ma_dam', searchCode)
      .maybeSingle();

    // 2. Fetch all inventory with correct column names
    const { data: allInventory, error: invError } = await supabase
      .from('fact_inventory')
      .select('*');

    if (invError) throw invError;
    const inventory = allInventory || [];

    let matchingRows: any[] = [];
    let targetHom: { id: string; ma_hom: string; ten_hom: string } | null = null;

    // ── STRATEGY A: Found a funeral record → use ma_hom from fact_dam ────────
    if (damData && damData.ma_hom && String(damData.ma_hom).trim() !== '' && String(damData.ma_hom).trim().toUpperCase() !== 'EMPTY') {
      const maHomCode = String(damData.ma_hom).trim();

      // Look up dim_hom by ma_hom
      const { data: foundHom } = await supabase
        .from('dim_hom')
        .select('id, ma_hom, ten_hom')
        .eq('ma_hom', maHomCode)
        .maybeSingle();

      if (foundHom) {
        targetHom = foundHom;
        // Filter inventory: "Tên hàng hóa" = dim_hom.id, "Ghi chú" > 0
        matchingRows = inventory.filter((row: any) => {
          const avail = Number(row['Ghi chú'] || 0);
          return avail > 0 && row['Tên hàng hóa'] === foundHom.id;
        });
      }
    }

    // ── STRATEGY B: User typed a product code directly ────────────────────────
    if (matchingRows.length === 0 && !damData) {
      const { data: foundHom } = await supabase
        .from('dim_hom')
        .select('id, ma_hom, ten_hom')
        .eq('ma_hom', searchCode)
        .maybeSingle();

      if (foundHom) {
        targetHom = foundHom;
        matchingRows = inventory.filter((row: any) => {
          const avail = Number(row['Ghi chú'] || 0);
          return avail > 0 && row['Tên hàng hóa'] === foundHom.id;
        });
      }
    }

    // ── No result ──────────────────────────────────────────────────────────────
    if (matchingRows.length === 0 && !damData) {
      return NextResponse.json(
        { error: `Không tìm thấy thông tin đám hoặc tồn kho cho mã "${searchCode}".` },
        { status: 404 }
      );
    }

    // 3. Resolve dim_kho names
    const khoIds = [...new Set(matchingRows.map((r: any) => r['Kho']).filter(Boolean))];
    const { data: khoData } = await supabase
      .from('dim_kho')
      .select('id, ma_kho, ten_kho')
      .in('id', khoIds.length > 0 ? khoIds : ['__none__']);

    const khoMap = new Map<string, any>();
    (khoData || []).forEach((k: any) => khoMap.set(k.id, k));

    // 4. Resolve dim_hom for each row (use cached targetHom if available)
    const homIds = [...new Set(matchingRows.map((r: any) => r['Tên hàng hóa']).filter(Boolean))];
    let homMap = new Map<string, any>();
    if (targetHom) {
      homMap.set(targetHom.id, targetHom);
    } else if (homIds.length > 0) {
      const { data: homData } = await supabase
        .from('dim_hom')
        .select('id, ma_hom, ten_hom')
        .in('id', homIds);
      (homData || []).forEach((h: any) => homMap.set(h.id, h));
    }

    // 5. Build response
    const results = matchingRows.map((item: any) => {
      const h = homMap.get(item['Tên hàng hóa']);
      const k = khoMap.get(item['Kho']);
      return {
        inventory_id: item['Mã'],
        ma_lo: item['Loại hàng'] || '—',
        product_id: h?.id,
        product_code: h?.ma_hom,
        product_name: h?.ten_hom,
        warehouse_id: k?.id,
        warehouse_name: k?.ten_kho,
        quantity_available: Number(item['Ghi chú'] || 0),
        quantity_total: Number(item['Số lượng'] || 0),
      };
    });

    return NextResponse.json({
      data: results,
      dam_data: damData,
    });
  } catch (err: any) {
    console.error('[goods-issue search]', err);
    return NextResponse.json({ error: 'Lỗi tra cứu tồn kho.' }, { status: 500 });
  }
}
