import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * GET /api/inventory/stats
 * Returns aggregate inventory stats.
 * Optional query param: ?warehouse=Kho+1  (filter by warehouse name)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const warehouseFilter = searchParams.get('warehouse');

    const supabase = getSupabaseAdmin();

    // Fetch fact_inventory + dim_kho
    const [invRes, khoRes] = await Promise.all([
      supabase.from('fact_inventory').select('*'),
      supabase.from('dim_kho').select('id, ma_kho, ten_kho'),
    ]);

    if (invRes.error) {
      return NextResponse.json({ error: invRes.error.message }, { status: 500 });
    }

    const inventory = invRes.data || [];
    const khoMap = new Map<string, { ma_kho: string; ten_kho: string }>();
    for (const k of (khoRes.data || [])) {
      khoMap.set(k.id, k);
    }

    // Group by (product, warehouse) same as inventory page
    const groupMap = new Map<string, { qty: number; avail: number; khoId: string }>();

    for (const row of inventory) {
      const homId = row['Tên hàng hóa'];
      const khoId = row['Kho'] || 'unknown';
      const kho = khoMap.get(khoId);

      // Apply warehouse filter if provided
      if (warehouseFilter) {
        const khoName = kho?.ten_kho || '';
        if (!khoName.toLowerCase().includes(warehouseFilter.toLowerCase())) continue;
      }

      const key = `${homId}_${khoId}`;
      const existing = groupMap.get(key);
      if (existing) {
        existing.qty += Number(row['Số lượng'] || 0);
        existing.avail += Number(row['Ghi chú'] || 0);
      } else {
        groupMap.set(key, {
          qty: Number(row['Số lượng'] || 0),
          avail: Number(row['Ghi chú'] || 0),
          khoId,
        });
      }
    }

    const groups = Array.from(groupMap.values());
    const total = groups.length;
    const available = groups.filter(g => g.avail > 0).length;
    const outOfStock = groups.filter(g => g.avail <= 0).length;

    return NextResponse.json({
      total,
      available,
      outOfStock,
      warehouseName: warehouseFilter || 'Tất cả',
    });
  } catch (err) {
    console.error('[inventory/stats]', err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
