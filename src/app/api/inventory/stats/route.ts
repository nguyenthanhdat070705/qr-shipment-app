import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const warehouseFilter = searchParams.get('warehouse'); // e.g. "Kho Hàm Long"

    const [inventoryRes, homRes, khoRes] = await Promise.all([
      supabase.from('fact_inventory').select('*'),
      supabase.from('dim_hom').select('id, ma_hom, ten_hom, gia_von'),
      supabase.from('dim_kho').select('id, ma_kho, ten_kho'),
    ]);

    const inventory = inventoryRes.data || [];
    const allProducts = homRes.data || [];
    const homMap = new Map(allProducts.map((h: any) => [h.id, h]));
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

    /* ── If warehouse filter provided → return legacy format for WarehouseDashboard ── */
    if (warehouseFilter) {
      let total = 0, available = 0, outOfStock = 0, totalQuantity = 0;

      const outOfStockList: { code: string; name: string; warehouse: string; qty: number }[] = [];
      for (const p of products) {
        const w = p.byWarehouse[warehouseFilter];
        if (!w) continue;
        total++;
        totalQuantity += w.qty;
        if (w.avail > 0) {
          // Còn hàng (khả dụng > 0)
          available++;
        } else if (w.qty > 0 && w.avail <= 0) {
          // Đã xuất hết (có hàng trong kho nhưng khả dụng = 0) → không tính vào hết hàng
        } else {
          // Hết hàng thật sự: qty = 0 và avail = 0
          outOfStock++;
          outOfStockList.push({ code: p.code, name: p.name, warehouse: warehouseFilter, qty: w.qty });
        }
      }

      return NextResponse.json({
        total,
        available,
        outOfStock,
        totalQuantity,
        warehouseName: warehouseFilter,
        outOfStockProducts: outOfStockList.sort((a, b) => a.name.localeCompare(b.name)),
      });
    }

    /* ── No filter → return full admin stats ── */

    // Collect product IDs that have inventory rows
    const productIdsWithInventory = new Set<string>();
    for (const row of inventory) {
      const homId = row['Tên hàng hóa'] as string;
      if (homId) productIdsWithInventory.add(homId);
    }

    // Build qty map from fact_inventory for ALL dim_hom products
    const qtyByProductId = new Map<string, number>();
    for (const row of inventory) {
      const homId = row['Tên hàng hóa'] as string;
      const qty = Number(row['Số lượng'] || 0);
      qtyByProductId.set(homId, (qtyByProductId.get(homId) || 0) + qty);
    }

    // Total products = all loại hàng in dim_hom
    const totalProductTypes = allProducts.length;

    // Out of stock = products in dim_hom where total so_luong across all warehouses = 0
    const outOfStockProducts: { code: string; name: string; warehouse: string; qty: number }[] = [];
    let totalOutOfStock = 0;
    let totalAvailable = 0;
    let totalExported = 0;
    let totalQuantity = 0;

    for (const hom of allProducts) {
      const totalQty = qtyByProductId.get(hom.id) || 0;
      totalQuantity += totalQty;

      if (totalQty > 0) {
        // Check if this product has available stock (avail > 0) across any warehouse
        const p = productMap.get(hom.ma_hom);
        if (p) {
          const totalAvail = Object.values(p.byWarehouse).reduce((s, w) => s + w.avail, 0);
          if (totalAvail > 0) {
            totalAvailable++;
          } else {
            totalExported++;
          }
        } else {
          totalAvailable++;
        }
      } else {
        // so_luong = 0 → hết hàng
        totalOutOfStock++;
        outOfStockProducts.push({
          code: hom.ma_hom,
          name: hom.ten_hom,
          warehouse: 'Tất cả kho',
          qty: 0,
        });
      }
    }

    // Per-warehouse breakdown
    const khoStats: Record<string, { name: string; total: number; available: number; outOfStock: number }> = {};
    for (const p of products) {
      for (const [khoName, { qty, avail }] of Object.entries(p.byWarehouse)) {
        if (!khoStats[khoName]) khoStats[khoName] = { name: khoName, total: 0, available: 0, outOfStock: 0 };
        khoStats[khoName].total++;
        if (avail > 0) khoStats[khoName].available++;
        else if (qty <= 0) khoStats[khoName].outOfStock++;
      }
    }

    /* ── Additional admin stats ── */
    const [poRes, grRes, nccRes, accountRes, damRes] = await Promise.all([
      supabase.from('fact_don_hang').select('id, trang_thai, tong_tien', { count: 'exact' }),
      supabase.from('fact_nhap_hang').select('id, trang_thai', { count: 'exact' }),
      supabase.from('dim_ncc').select('id', { count: 'exact' }),
      supabase.from('dim_account').select('id', { count: 'exact' }),
      supabase.from('dim_dam').select('id', { count: 'exact' }).then(r => r).catch(() => ({ data: null, count: 0 })),
    ]);

    const poData = poRes.data || [];
    const grData = grRes.data || [];
    const accountData = accountRes.data || [];

    // PO stats
    const totalPO = poRes.count || poData.length;
    const pendingPO = poData.filter((p: any) => ['draft', 'submitted', 'confirmed'].includes(p.trang_thai)).length;
    const totalPOValue = poData.reduce((s: number, p: any) => s + (Number(p.tong_tien) || 0), 0);

    // GR stats
    const totalGR = grRes.count || grData.length;
    const pendingGR = grData.filter((g: any) => ['pending', 'inspecting'].includes(g.trang_thai)).length;

    // NCC stats
    const totalNCC = nccRes.count || (nccRes.data || []).length;

    // Account stats
    const totalAccounts = accountRes.count || accountData.length;

    // Inventory value (gia_von * quantity for each product)
    let totalInventoryValue = 0;
    for (const hom of allProducts) {
      const qty = qtyByProductId.get(hom.id) || 0;
      const giaVon = Number(hom.gia_von) || 0;
      totalInventoryValue += qty * giaVon;
    }

    // Funeral (đám) count
    const totalDam = (damRes as any).count || ((damRes as any).data || []).length || 0;

    return NextResponse.json({
      stats: {
        totalProducts: totalProductTypes,
        totalAvailable,
        totalOutOfStock,
        totalExported,
        totalQuantity,
      },
      adminStats: {
        totalPO,
        pendingPO,
        totalPOValue,
        totalGR,
        pendingGR,
        totalNCC,
        totalAccounts,
        totalInventoryValue,
        totalDam,
      },
      byWarehouse: Object.values(khoStats).sort((a, b) => b.total - a.total),
      outOfStockProducts: outOfStockProducts.sort((a, b) => a.name.localeCompare(b.name)),
    });
  } catch (err: any) {
    console.error('[inventory stats]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
