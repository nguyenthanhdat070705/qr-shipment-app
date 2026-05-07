import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * GET   /api/operations/[id]  → Detail with items
 * PATCH /api/operations/[id]  → Update status
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('delivery_orders')
    .select(`
      *,
      warehouse:warehouses(*),
      items:delivery_order_items(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  let body: { status: string; assigned_to?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validStatuses = ['pending', 'assigned', 'in_transit', 'delivered', 'cancelled'];
  if (!validStatuses.includes(body.status)) {
    return NextResponse.json({ error: `Trạng thái không hợp lệ: ${body.status}` }, { status: 400 });
  }

  // 1. Fetch current order to check previous status and get items
  const { data: currentOrder, error: fetchError } = await supabase
    .from('delivery_orders')
    .select('*, items:delivery_order_items(*)')
    .eq('id', id)
    .single();

  if (fetchError || !currentOrder) {
    return NextResponse.json({ error: 'Không tìm thấy lệnh giao hàng' }, { status: 404 });
  }

  // Nếu lệnh đã bị huỷ trước đó thì không làm gì thêm
  if (currentOrder.status === 'cancelled' && body.status === 'cancelled') {
    return NextResponse.json({ error: 'Lệnh đã được huỷ từ trước' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { status: body.status };
  if (body.assigned_to) updateData.assigned_to = body.assigned_to;

  // 2. Update status
  const { data, error } = await supabase
    .from('delivery_orders')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 3. Logic: CỘNG LẠI TỒN KHO khi trạng thái mới là 'cancelled'
  if (body.status === 'cancelled' && currentOrder.warehouse_id) {
    const items = currentOrder.items || [];
    for (const item of items) {
      // Tìm dim_hom.id thông qua mã sản phẩm (product_code)
      const { data: homData } = await supabase
        .from('dim_hom')
        .select('id')
        .eq('ma_hom', item.product_code)
        .maybeSingle();

      if (homData) {
        // Gọi RPC adjust_product_quantity để cộng lại số lượng (p_qty_delta dương)
        const { error: rpcError } = await supabase.rpc('adjust_product_quantity', {
          p_hom_id: homData.id,
          p_kho_id: currentOrder.warehouse_id,
          p_qty_delta: item.quantity,
          p_loai_hang: 'Hoàn trả (Huỷ lệnh xuất)'
        });

        if (rpcError) {
          console.error('[operations] Lỗi hoàn tồn kho:', rpcError);
        }
      }
    }
  }

  return NextResponse.json({ data });
}
