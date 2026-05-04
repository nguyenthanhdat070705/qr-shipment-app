import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET  /api/stocktake          → List all stocktake sessions
 * POST /api/stocktake          → Create new stocktake session
 */

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get('warehouse_id');
    const status = searchParams.get('status');

    let query = supabase
      .from('fact_kiem_kho')
      .select('*')
      .order('created_at', { ascending: false });

    if (warehouseId) query = query.eq('kho_id', warehouseId);
    if (status) query = query.eq('trang_thai', status);

    const { data, error } = await query;
    if (error) {
      // Table might not exist yet
      if (error.message.includes('does not exist') || error.message.includes('schema cache')) {
        return NextResponse.json({ data: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enrich with warehouse name
    const khoIds = [...new Set((data || []).map((d: any) => d.kho_id).filter(Boolean))];
    let khoMap = new Map<string, string>();
    if (khoIds.length > 0) {
      const { data: khoData } = await supabase.from('dim_kho').select('id, ten_kho').in('id', khoIds);
      if (khoData) khoData.forEach((k: any) => khoMap.set(k.id, k.ten_kho));
    }

    const enriched = (data || []).map((d: any) => ({
      ...d,
      ten_kho: khoMap.get(d.kho_id) || 'Không rõ',
    }));

    return NextResponse.json({ data: enriched });
  } catch (err: any) {
    console.error('[stocktake GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { warehouse_id, note, created_by } = body as {
      warehouse_id: string;
      note?: string;
      created_by: string;
    };

    if (!warehouse_id) {
      return NextResponse.json({ error: 'warehouse_id là bắt buộc.' }, { status: 400 });
    }

    // Lookup user
    let nguoiKiemId: string | null = null;
    if (created_by?.includes('@')) {
      const { data: account } = await supabase
        .from('dim_account')
        .select('id')
        .eq('email', created_by)
        .maybeSingle();
      nguoiKiemId = account?.id || null;
    }

    // Generate code: KK-YYYYMMDD-HHMM-XXXX (timestamp-based to avoid collision)
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
    const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const ma_phieu_kiem = `KK-${dateStr}-${timeStr.slice(0,4)}-${randSuffix}`;

    // Get warehouse name
    const { data: khoData } = await supabase
      .from('dim_kho')
      .select('ten_kho')
      .eq('id', warehouse_id)
      .single();

    // Fetch current inventory for this warehouse to pre-populate items
    const { data: inventoryData } = await supabase
      .from('fact_inventory')
      .select('*')
      .eq('Kho', warehouse_id);

    const { data: homData } = await supabase
      .from('dim_hom')
      .select('id, ma_hom, ten_hom, ten_hom_the_hien')
      .eq('is_active', true);

    const homMap = new Map<string, any>();
    if (homData) homData.forEach((h: any) => homMap.set(h.id, h));

    // Create the stocktake header
    const { data: created, error: createError } = await supabase
      .from('fact_kiem_kho')
      .insert({
        ma_phieu_kiem,
        kho_id: warehouse_id,
        trang_thai: 'in_progress',
        nguoi_kiem_id: nguoiKiemId,
        nguoi_kiem_email: created_by || null,
        ngay_kiem: now.toISOString().slice(0, 10),
        ghi_chu: note || null,
        tong_loai_kiem: 0,
        tong_lech: 0,
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // Pre-populate items from current inventory
    const itemRows: any[] = [];
    const inventoryByHom = new Map<string, number>();

    if (inventoryData) {
      for (const row of inventoryData) {
        const homId = row['Tên hàng hóa'];
        const qty = Number(row['Số lượng'] || 0);
        inventoryByHom.set(homId, (inventoryByHom.get(homId) || 0) + qty);
      }
    }

    // Include all products that have inventory in this warehouse
    for (const [homId, qty] of inventoryByHom.entries()) {
      const hom = homMap.get(homId);
      if (!hom) continue;

      itemRows.push({
        kiem_kho_id: created.id,
        hom_id: homId,
        ma_hom: hom.ma_hom,
        ten_hom: hom.ten_hom_the_hien || hom.ten_hom,
        so_luong_he_thong: qty,
        so_luong_thuc_te: 0,
        ghi_chu: null,
        trang_thai: 'pending',
      });
    }

    if (itemRows.length > 0) {
      const { error: itemsError } = await supabase
        .from('fact_kiem_kho_items')
        .insert(itemRows);
      if (itemsError) console.error('[stocktake POST] Items insert error:', itemsError);
    }

    return NextResponse.json({
      data: {
        id: created.id,
        ma_phieu_kiem,
        ten_kho: khoData?.ten_kho || '',
        items_count: itemRows.length,
      },
    }, { status: 201 });
  } catch (err: any) {
    console.error('[stocktake POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
