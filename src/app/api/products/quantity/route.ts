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

  const authHeader = req.headers.get('Authorization');
  let email = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (!authErr && user?.email) {
      email = user.email;
    }
  }

  // Only VIP admin can adjust quantities
  if (!email || !isVIPAdmin(email)) {
    return NextResponse.json(
      { error: 'Bạn không có quyền thay đổi số lượng hòm. Yêu cầu đăng nhập bằng tài khoản Admin.' },
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

  // 3. Sử dụng Supabase RPC để cộng/trừ số lượng một cách an toàn (Atomic & Row-Level Lock)
  // RPC này sẽ tự động tạo dòng fact_inventory mới nếu chưa tồn tại
  const { data: rpcResult, error: rpcErr } = await supabase.rpc('adjust_product_quantity', {
    p_hom_id: id,
    p_kho_id: khoId,
    p_qty_delta: delta,
    p_loai_hang: loaiHang
  });

  if (rpcErr || !rpcResult?.success) {
    console.error('[products/quantity] RPC Error:', rpcErr || rpcResult);
    return NextResponse.json({ error: rpcErr?.message || 'Hết hàng hoặc số lượng trong kho không đủ.' }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    ma_hom: product.ma_hom,
    old_qty: rpcResult.new_warehouse_qty - delta,
    new_qty: rpcResult.total_hom_qty,
    delta,
  });
}

