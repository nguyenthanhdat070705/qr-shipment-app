import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getUserRole } from '@/config/roles.config';

/**
 * PATCH /api/products/quantity
 * Cộng/trừ số lượng hòm trong dim_hom.
 * Nếu so_luong > 0 → tự upsert vào fact_inventory.
 * Nếu so_luong <= 0 → xóa khỏi fact_inventory.
 *
 * Body: { id, delta, email, kho_id?, loai_hang? }
 *   - id: dim_hom.id
 *   - delta: +1 hoặc -1 (hoặc bất kỳ số nguyên)
 *   - email: để check quyền
 *   - kho_id: (optional) ID kho đích trong fact_inventory
 *   - loai_hang: (optional) "Đã mua" hoặc "Ký gửi"
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
  const role = getUserRole(email);
  if (role !== 'admin' && role !== 'procurement' && role !== 'warehouse') {
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

  // 1. Lấy sản phẩm hiện tại
  const { data: product, error: fetchErr } = await supabase
    .from('dim_hom')
    .select('id, ma_hom, ten_hom, so_luong, don_vi_tinh, gia_ban, gia_von, kich_thuoc, tinh_chat, NCC, loai_hom')
    .eq('id', id)
    .single();

  if (fetchErr || !product) {
    return NextResponse.json({ error: 'Không tìm thấy sản phẩm.' }, { status: 404 });
  }

  const oldQty = product.so_luong || 0;
  const newQty = Math.max(0, oldQty + delta); // Không cho phép âm

  // 2. Cập nhật so_luong trong dim_hom
  const { error: updateErr } = await supabase
    .from('dim_hom')
    .update({ so_luong: newQty, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // 3. Đồng bộ sang fact_inventory
  const loaiHang = (body.loai_hang as string) || 'Đã mua';
  try {
    if (newQty > 0) {
      // Tìm kho mặc định (kho đầu tiên) nếu không truyền kho_id
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

      if (khoId) {
        // Kiểm tra xem đã có record trong fact_inventory chưa
        const { data: existing } = await supabase
          .from('fact_inventory')
          .select('Mã')
          .eq('Tên hàng hóa', id)
          .eq('Kho', khoId)
          .maybeSingle();

        if (existing) {
          // Update số lượng + loại hàng
          await supabase
            .from('fact_inventory')
            .update({ 'Số lượng': newQty, 'Ghi chú': newQty, 'Loại hàng': loaiHang })
            .eq('Tên hàng hóa', id)
            .eq('Kho', khoId);
        } else {
          // Insert mới
          await supabase
            .from('fact_inventory')
            .insert({
              'Tên hàng hóa': id,
              'Kho': khoId,
              'Số lượng': newQty,
              'Ghi chú': newQty,
              'Loại hàng': loaiHang,
            });
        }
      }
    } else {
      // newQty === 0 → xóa khỏi fact_inventory
      await supabase
        .from('fact_inventory')
        .delete()
        .eq('Tên hàng hóa', id);
    }
  } catch (syncErr) {
    console.error('[quantity] fact_inventory sync error:', syncErr);
    // Không fail request vì dim_hom đã cập nhật thành công
  }

  return NextResponse.json({
    success: true,
    ma_hom: product.ma_hom,
    old_qty: oldQty,
    new_qty: newQty,
    delta,
  });
}
