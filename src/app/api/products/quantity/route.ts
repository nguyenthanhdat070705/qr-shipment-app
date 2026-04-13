import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { isVIPAdmin } from '@/config/roles.config';

/**
 * PATCH /api/products/quantity
 * Cộng/trừ số lượng hòm.
 *
 * Source of truth: fact_inventory (per-warehouse rows).
 * dim_hom.so_luong is updated as a cached aggregate afterwards.
 *
 * ⚠️ Chỉ VIP Admin mới được phép điều chỉnh số lượng.
 *
 * Body: { id, delta, email, kho_id?, loai_hang? }
 */
export async function PATCH(req: NextRequest) {
  const supabase = getSupabaseAdmin();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = (body.email as string) || '';
  // Only VIP admin can adjust quantities
  if (!isVIPAdmin(email)) {
    return NextResponse.json(
      { error: 'Bạn không có quyền thay đổi số lượng hòm.' },
      { status: 403 }
    );
  }

  const id = body.id as string;
  const delta = Number(body.delta);
  if (!id || isNaN(delta) || delta === 0) {
    return NextResponse.json({ error: 'id và delta (≠0) là bắt buộc.' }, { status: 400 });
  }

  // 1. Verify product exists
  const { data: product, error: fetchErr } = await supabase
    .from('dim_hom')
    .select('id, ma_hom, ten_hom')
    .eq('id', id)
    .single();

  if (fetchErr || !product) {
    return NextResponse.json({ error: 'Không tìm thấy sản phẩm.' }, { status: 404 });
  }

  // 2. Determine target warehouse
  let khoId = body.kho_id as string | undefined;
  if (!khoId) {
    const { data: firstKho } = await supabase
      .from('dim_kho')
      .select('id')
      .order('ma_kho', { ascending: true })
      .limit(1)
      .single();
    khoId = firstKho?.id;
  }

  if (!khoId) {
    return NextResponse.json({ error: 'Không tìm thấy kho nào trong hệ thống.' }, { status: 400 });
  }

  const loaiHang = (body.loai_hang as string) || 'Đã mua';

  // 3. Read current qty from fact_inventory for THIS specific (product, warehouse)
  const { data: existingRow } = await supabase
    .from('fact_inventory')
    .select('Mã, "Số lượng", "Ghi chú"')
    .eq('Tên hàng hóa', id)
    .eq('Kho', khoId)
    .maybeSingle();

  const currentWarehouseQty = existingRow ? (Number(existingRow['Số lượng']) || 0) : 0;
  const newWarehouseQty = Math.max(0, currentWarehouseQty + delta);

  // 4. Update fact_inventory for this specific warehouse
  if (existingRow) {
    if (newWarehouseQty > 0) {
      // Update existing row
      await supabase
        .from('fact_inventory')
        .update({
          'Số lượng': newWarehouseQty,
          'Ghi chú': newWarehouseQty,
          'Loại hàng': loaiHang,
        })
        .eq('Mã', existingRow['Mã']);
    } else {
      // Qty reached 0 → remove this warehouse row
      await supabase
        .from('fact_inventory')
        .delete()
        .eq('Mã', existingRow['Mã']);
    }
  } else if (newWarehouseQty > 0) {
    // No existing row → insert new
    await supabase
      .from('fact_inventory')
      .insert({
        'Tên hàng hóa': id,
        'Kho': khoId,
        'Số lượng': newWarehouseQty,
        'Ghi chú': newWarehouseQty,
        'Loại hàng': loaiHang,
      });
  }

  // 5. Recalculate TOTAL quantity across ALL warehouses for this product
  const { data: allRows } = await supabase
    .from('fact_inventory')
    .select('"Số lượng"')
    .eq('Tên hàng hóa', id);

  const totalQty = (allRows || []).reduce(
    (sum: number, r: Record<string, unknown>) => sum + (Number(r['Số lượng']) || 0),
    0
  );

  // 6. Cache the total back to dim_hom.so_luong
  await supabase
    .from('dim_hom')
    .update({ so_luong: totalQty, updated_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json({
    success: true,
    ma_hom: product.ma_hom,
    old_qty: currentWarehouseQty,
    new_qty: totalQty,   // Return the TOTAL across all warehouses
    delta,
  });
}

