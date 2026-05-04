import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const supabase = getSupabaseAdmin();
  const { id } = await props.params;

  if (!id) {
    return NextResponse.json({ error: 'Thiếu ID phiếu xuất.' }, { status: 400 });
  }

  try {
    // 1. Fetch export and items
    const { data: exportData, error: exportErr } = await supabase
      .from('fact_xuat_hang')
      .select('*, fact_xuat_hang_items(*)')
      .eq('id', id)
      .single();

    if (exportErr || !exportData) {
      return NextResponse.json({ error: 'Không tìm thấy phiếu xuất.' }, { status: 404 });
    }

    if (exportData.trang_thai === 'cancelled') {
      return NextResponse.json({ error: 'Phiếu xuất này đã được hủy trước đó.' }, { status: 400 });
    }

    // 2. ATOMIC UPDATE FIRST to prevent race conditions
    const { data: updated, error: updateErr } = await supabase
      .from('fact_xuat_hang')
      .update({ trang_thai: 'cancelled' })
      .eq('id', id)
      .neq('trang_thai', 'cancelled')
      .select('id')
      .maybeSingle();

    if (updateErr || !updated) {
      return NextResponse.json({ error: 'Phiếu xuất này đang được xử lý hoặc đã bị hủy.' }, { status: 400 });
    }

    const items = exportData.fact_xuat_hang_items || [];

    // 3. Loop items and return inventory if it was not 'draft' (meaning it was actually deducted)
    if (exportData.trang_thai !== 'draft') {
      for (const item of items) {
        let inventoryId = item.inventory_id;
        let invRow = null;

        if (inventoryId) {
          const { data } = await supabase.from('fact_inventory').select('*').eq('Mã', inventoryId).maybeSingle();
          invRow = data;
        }

        if (!invRow && item.hom_id && exportData.kho_id) {
          // Fallback lookup if inventory_id is missing
          const { data } = await supabase
            .from('fact_inventory')
            .select('*')
            .eq('Tên hàng hóa', item.hom_id)
            .eq('Kho', exportData.kho_id)
            .limit(1); 
          invRow = data && data.length > 0 ? data[0] : null;
          if (invRow) inventoryId = invRow['Mã'];
        }

        if (invRow && inventoryId) {
          const oldTotal = Number(invRow['Số lượng'] || 0);
          const oldAvail = Number(invRow['Ghi chú'] || 0);
          const qty = Number(item.so_luong || 0);

          await supabase
            .from('fact_inventory')
            .update({ 'Số lượng': oldTotal + qty, 'Ghi chú': oldAvail + qty })
            .eq('Mã', inventoryId);
            
          console.log(`[goods-issue-cancel] ✅ Hoàn kho: ${inventoryId} | SL: ${oldTotal} → ${oldTotal + qty}`);
        } else {
          console.warn(`[goods-issue-cancel] ⚠️ Không tìm thấy tồn kho để hoàn (hom_id: ${item.hom_id}, kho_id: ${exportData.kho_id})`);
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Hủy phiếu xuất thành công.' });
  } catch (err: any) {
    console.error('[goods-issue cancel POST]', err);
    return NextResponse.json({ error: err.message || 'Lỗi xử lý server.' }, { status: 500 });
  }
}
