import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  let body: { status: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.status !== 'cancelled') {
    return NextResponse.json({ error: `Trạng thái không hợp lệ: ${body.status}` }, { status: 400 });
  }

  // 1. Fetch current order
  const { data: currentOrder, error: fetchError } = await supabase
    .from('fact_xuat_hang')
    .select('*, items:fact_xuat_hang_items(*)')
    .eq('id', id)
    .single();

  if (fetchError || !currentOrder) {
    return NextResponse.json({ error: 'Không tìm thấy phiếu xuất' }, { status: 404 });
  }

  if (currentOrder.trang_thai === 'cancelled') {
    return NextResponse.json({ error: 'Phiếu xuất đã được huỷ từ trước' }, { status: 400 });
  }

  // 2. Update status to cancelled
  const { data, error } = await supabase
    .from('fact_xuat_hang')
    .update({ trang_thai: 'cancelled' })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 3. Logic: CỘNG LẠI TỒN KHO 
  if (currentOrder.kho_id) {
    const items = currentOrder.items || [];
    for (const item of items) {
      // Tìm dim_hom.id thông qua mã sản phẩm
      const { data: homData } = await supabase
        .from('dim_hom')
        .select('id')
        .eq('ma_hom', item.ma_hom)
        .maybeSingle();

      if (homData) {
        // Cộng lại tồn kho (huỷ lệnh xuất -> trả lại kho -> + số lượng)
        const { error: rpcError } = await supabase.rpc('adjust_product_quantity', {
          p_hom_id: homData.id,
          p_kho_id: currentOrder.kho_id,
          p_qty_delta: item.so_luong,
          p_loai_hang: 'Hoàn trả (Huỷ phiếu xuất)'
        });

        if (rpcError) {
          console.error('[goods-issue] Lỗi hoàn tồn kho:', rpcError);
        }
      }
    }
  }

  return NextResponse.json({ data });
}
