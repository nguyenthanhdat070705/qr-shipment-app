import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

function getCoffinImage(productCode: string): string {
  if (productCode === '2AQ0106' || productCode === '2AQ0129') return '/coffin-3.png';
  let hash = 0;
  for (let i = 0; i < productCode.length; i++) {
    hash = ((hash << 5) - hash + productCode.charCodeAt(i)) | 0;
  }
  return `/coffin-${(Math.abs(hash) % 5) + 1}.png`;
}

function resolveImage(hinhAnh: string | null | undefined, productCode: string): string {
  const raw = (hinhAnh || '').trim();
  return raw.startsWith('http') ? raw : getCoffinImage(productCode || '');
}

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
  const warehouseFilter = searchParams.get('warehouse'); // Tên kho thực trong DB (ví dụ: 'Kho Hàm Long')

  if (!q) {
    return NextResponse.json({ error: 'Thiếu tham số tìm kiếm' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const searchCode = q.trim();

  try {
    // 1. Fetch dam data by ma_dam (multi-strategy search)
    let damData: any = null;

    // Build search variants: original, stripped zeros, zero-padded
    const searchVariants = [searchCode];
    const stripped = searchCode.replace(/^0+/, '');
    if (stripped && stripped !== searchCode) searchVariants.push(stripped);
    if (/^\d+$/.test(searchCode) && searchCode.length < 6) {
      searchVariants.push(searchCode.padStart(6, '0'));
    }

    // 1a. Try fact_dam exact match with all variants
    for (const variant of searchVariants) {
      if (damData) break;
      const { data: exactDam } = await supabase
        .from('fact_dam')
        .select('*')
        .eq('ma_dam', variant)
        .maybeSingle();
      if (exactDam) damData = exactDam;
    }

    // 1b. Try fact_dam fuzzy match
    if (!damData) {
      const { data: fuzzyDams } = await supabase
        .from('fact_dam')
        .select('*')
        .ilike('ma_dam', `%${searchCode}%`)
        .limit(1);
      if (fuzzyDams && fuzzyDams.length > 0) {
        damData = fuzzyDams[0];
      }
    }

    // 1c. Fallback: try dim_dam table (may have different records)
    if (!damData) {
      for (const variant of searchVariants) {
        const { data: dimDam } = await supabase
          .from('dim_dam')
          .select('ma_dam, loai, chi_nhanh, nguoi_mat')
          .eq('ma_dam', variant)
          .maybeSingle();
        if (dimDam) {
          // dim_dam doesn't have ma_hom, but we can still return dam info
          damData = dimDam;
          break;
        }
      }
      // dim_dam fuzzy
      if (!damData) {
        const { data: fuzzyDimDams } = await supabase
          .from('dim_dam')
          .select('ma_dam, loai, chi_nhanh, nguoi_mat')
          .ilike('ma_dam', `%${searchCode}%`)
          .limit(1);
        if (fuzzyDimDams && fuzzyDimDams.length > 0) {
          damData = fuzzyDimDams[0];
        }
      }
    }

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

      // Look up dim_hom by ma_hom (exact then fuzzy)
      let foundHom: any = null;
      const { data: exactHom } = await supabase
        .from('dim_hom')
        .select('id, ma_hom, ten_hom, hinh_anh')
        .eq('ma_hom', maHomCode)
        .maybeSingle();
      
      if (exactHom) {
        foundHom = exactHom;
      } else {
        const { data: fuzzyHoms } = await supabase
          .from('dim_hom')
          .select('id, ma_hom, ten_hom, hinh_anh')
          .ilike('ma_hom', `%${maHomCode}%`)
          .limit(1);
        if (fuzzyHoms && fuzzyHoms.length > 0) foundHom = fuzzyHoms[0];
      }

      if (foundHom) {
        targetHom = foundHom;
        // Filter inventory: "Tên hàng hóa" = dim_hom.id, "Ghi chú" > 0
        matchingRows = inventory.filter((row: any) => {
          return row['Tên hàng hóa'] === foundHom.id;
        });
      }
    }

    // ── STRATEGY B: User typed a product code directly ────────────────────────
    if (matchingRows.length === 0 && !damData) {
      // Try exact match first
      let foundHom: any = null;
      const { data: exactHom } = await supabase
        .from('dim_hom')
        .select('id, ma_hom, ten_hom, hinh_anh')
        .eq('ma_hom', searchCode)
        .maybeSingle();
      
      if (exactHom) {
        foundHom = exactHom;
      } else {
        // Try case-insensitive / fuzzy match
        const { data: fuzzyHoms } = await supabase
          .from('dim_hom')
          .select('id, ma_hom, ten_hom, hinh_anh')
          .ilike('ma_hom', `%${searchCode}%`)
          .limit(5);
        if (fuzzyHoms && fuzzyHoms.length > 0) foundHom = fuzzyHoms[0];
      }

      if (foundHom) {
        targetHom = foundHom;
        matchingRows = inventory.filter((row: any) => {
          return row['Tên hàng hóa'] === foundHom.id;
        });
      }
    }

    // ── STRATEGY C: Search by product name ───────────────────────────────────
    if (matchingRows.length === 0 && !damData) {
      const { data: nameHoms } = await supabase
        .from('dim_hom')
        .select('id, ma_hom, ten_hom, hinh_anh')
        .ilike('ten_hom', `%${searchCode}%`)
        .limit(5);
      
      if (nameHoms && nameHoms.length > 0) {
        const homIds = nameHoms.map(h => h.id);
        targetHom = nameHoms[0];
        matchingRows = inventory.filter((row: any) => {
          return homIds.includes(row['Tên hàng hóa']);
        });
      }
    }

    // ── No result ──────────────────────────────────────────────────────────────
    if (matchingRows.length === 0) {
      if (damData) {
        // Found dam info but no inventory - return dam data so frontend can show it
        return NextResponse.json({
          data: [],
          dam_data: damData,
          message: `Tìm thấy thông tin đám "${damData.ma_dam}" nhưng không có tồn kho sản phẩm liên kết.`,
        });
      }
      return NextResponse.json(
        { error: `Không tìm thấy thông tin đám hoặc tồn kho cho mã "${searchCode}".`, data: [], dam_data: null },
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

    // 3b. Nếu có warehouse filter, chỉ giữ lại hàng thuộc kho đó
    if (warehouseFilter && matchingRows.length > 0) {
      const filterLower = warehouseFilter.toLowerCase().trim();
      matchingRows = matchingRows.filter((row: any) => {
        const kho = khoMap.get(row['Kho']);
        if (!kho) return false;
        const khoName = (kho.ten_kho || '').toLowerCase();
        return khoName.includes(filterLower) || filterLower.includes(khoName);
      });
    }

    // 4. Resolve dim_hom for each row (use cached targetHom if available)
    const homIds = [...new Set(matchingRows.map((r: any) => r['Tên hàng hóa']).filter(Boolean))];
    let homMap = new Map<string, any>();
    if (targetHom) {
      homMap.set(targetHom.id, targetHom);
    } else if (homIds.length > 0) {
      const { data: homData } = await supabase
        .from('dim_hom')
        .select('id, ma_hom, ten_hom, hinh_anh')
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
        image_url: resolveImage(h?.hinh_anh, h?.ma_hom || ''),
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
