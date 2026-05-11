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
  const items = currentOrder.items || [];
  for (const item of items) {
    if (item.inventory_id && item.so_luong) {
      // Fetch current inventory
      const { data: inv } = await supabase
        .from('fact_inventory')
        .select('"Số lượng", "Ghi chú"')
        .eq('Mã', item.inventory_id)
        .single();
        
      if (inv) {
        const newQty = Number(inv['Số lượng'] || 0) + Number(item.so_luong);
        const newKhadung = Number(inv['Ghi chú'] || 0) + Number(item.so_luong);
        
        const { error: updateErr } = await supabase
          .from('fact_inventory')
          .update({ 'Số lượng': newQty, 'Ghi chú': newKhadung, 'Loại hàng': 'Hoàn trả (Huỷ)' })
          .eq('Mã', item.inventory_id);
          
        if (updateErr) {
          console.error('[goods-issue] Lỗi update tồn kho trực tiếp:', updateErr);
        }
      } else {
         // Fallback if inventory_id is not found (deleted)
         const { data: homData } = await supabase.from('dim_hom').select('id').eq('ma_hom', item.ma_hom).maybeSingle();
         if (homData && currentOrder.kho_id) {
           const { data: existInv } = await supabase.from('fact_inventory').select('*').eq('Tên hàng hóa', homData.id).eq('Kho', currentOrder.kho_id).maybeSingle();
           if (existInv) {
             const newQty = Number(existInv['Số lượng'] || 0) + Number(item.so_luong);
             const newKhadung = Number(existInv['Ghi chú'] || 0) + Number(item.so_luong);
             await supabase.from('fact_inventory').update({ 'Số lượng': newQty, 'Ghi chú': newKhadung }).eq('Mã', existInv['Mã']);
           }
         }
      }
    } else {
      console.warn('[goods-issue] Thiếu inventory_id hoặc so_luong để hoàn kho:', item);
    }
  }

  return NextResponse.json({ data });
}
