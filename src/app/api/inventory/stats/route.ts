import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const [inventoryRes, homRes, khoRes] = await Promise.all([
      supabase.from('fact_inventory').select('*'),
      supabase.from('dim_hom').select('id, ma_hom, ten_hom'),
      supabase.from('dim_kho').select('id, ma_kho, ten_kho'),
    ]);

    const inventory = inventoryRes.data || [];
    const homMap = new Map((homRes.data || []).map((h: any) => [h.id, h]));
    const khoMap = new Map((khoRes.data || []).map((k: any) => [k.id, k]));

    // Group by (product + warehouse)
    type Entry = {
      code: string;
      name: string;
      byWarehouse: Record<string, { qty: number; avail: number }>;
    };
    const productMap = new Map<string, Entry>();

    for (const row of inventory) {
      const hom = homMap.get(row['Tên hàng hóa']) as any;
      const kho = khoMap.get(row['Kho']) as any;
      if (!hom) continue;

      const code = hom.ma_hom;
      const khoName = kho?.ten_kho || 'Không rõ';
      const qty = Number(row['Số lượng'] || 0);
      const avail = Number(row['Ghi chú'] || 0);

      if (!productMap.has(code)) {
        productMap.set(code, { code, name: hom.ten_hom, byWarehouse: {} });
      }
      const entry = productMap.get(code)!;
      if (!entry.byWarehouse[khoName]) entry.byWarehouse[khoName] = { qty: 0, avail: 0 };
      entry.byWarehouse[khoName].qty += qty;
      entry.byWarehouse[khoName].avail += avail;
    }

    const products = Array.from(productMap.values());

    // Global stats
    let totalAvailable = 0, totalOutOfStock = 0, totalExported = 0, totalQuantity = 0;
    const outOfStockProducts: { code: string; name: string; warehouse: string; qty: number }[] = [];

    for (const p of products) {
      const totalAvail = Object.values(p.byWarehouse).reduce((s, w) => s + w.avail, 0);
      const totalQty = Object.values(p.byWarehouse).reduce((s, w) => s + w.qty, 0);
      totalQuantity += totalQty;
      if (totalAvail > 0) {
        totalAvailable++;
      } else if (totalQty > 0) {
        totalExported++;
      } else {
        totalOutOfStock++;
        // Collect per-warehouse out-of-stock entries
        for (const [khoName, { qty }] of Object.entries(p.byWarehouse)) {
          if (qty > 0) { // có hàng nhưng avail = 0 → đã xuất hết
            outOfStockProducts.push({ code: p.code, name: p.name, warehouse: khoName, qty });
          }
        }
      }
    }

    // Per-warehouse stats
    const khoStats: Record<string, { name: string; total: number; available: number; outOfStock: number }> = {};
    for (const p of products) {
      for (const [khoName, { qty, avail }] of Object.entries(p.byWarehouse)) {
        if (!khoStats[khoName]) khoStats[khoName] = { name: khoName, total: 0, available: 0, outOfStock: 0 };
        khoStats[khoName].total++;
        if (avail > 0) khoStats[khoName].available++;
        else if (qty <= 0) khoStats[khoName].outOfStock++;
      }
    }

    return NextResponse.json({
      stats: { totalProducts: products.length, totalAvailable, totalOutOfStock, totalExported, totalQuantity },
      byWarehouse: Object.values(khoStats).sort((a, b) => b.total - a.total),
      outOfStockProducts: outOfStockProducts.sort((a, b) => a.name.localeCompare(b.name)),
    });
  } catch (err: any) {
    console.error('[inventory stats]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
