import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * POST /api/goods-issue
 * Creates a Delivery Order (fact_xuat_hang), deducts from fact_inventory, and notifies Operations.
 */
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON không hợp lệ.' }, { status: 400 });
  }

  const {
    inventory_id,
    quantity,
    customer_name,
    customer_phone,
    customer_address,
    note,
    created_by
  } = body;

  if (!inventory_id || !quantity) {
    return NextResponse.json({ error: 'Thiếu dữ liệu: Lô hàng tồn kho hoặc số lượng.' }, { status: 400 });
  }

  try {
    // 1. Verify Inventory Record & Product Data
    const { data: invRow, error: invErr } = await supabase
      .from('fact_inventory')
      .select('*')
      .eq('Mã', inventory_id)
      .single();

    if (invErr || !invRow) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin tồn kho hợp lệ.' }, { status: 404 });
    }

    const avail = Number(invRow['Ghi chú'] || 0);
    const totalQty = Number(invRow['Số lượng'] || 0);

    if (avail < quantity) {
      return NextResponse.json({ error: `Số lượng khả dụng không đủ (Kho chỉ còn: ${avail})` }, { status: 400 });
    }

    // 2. Map related data from dim_hom and dim_kho
    const { data: homData } = await supabase.from('dim_hom').select('id, ma_hom, ten_hom').eq('id', invRow['Tên hàng hóa']).single();
    if (!homData) throw new Error('Không tìm thấy dữ liệu Sản phẩm.');
    
    const homId = homData.id;
    const maHom = homData.ma_hom;
    const tenHom = homData.ten_hom;
    const khoId = invRow['Kho'];

    // 3. Deduct from fact_inventory
    const newInvQty = Math.max(0, totalQty - quantity);
    const newInvAvail = Math.max(0, avail - quantity);
    const newStatus = newInvQty === 0 ? 'depleted' : 'active';

    const { error: updateInvErr } = await supabase
      .from('fact_inventory')
      .update({ 'Số lượng': newInvQty, 'Ghi chú': newInvAvail })
      .eq('Mã', inventory_id);

    if (updateInvErr) throw new Error('Lỗi cập nhật số lượng tồn kho: ' + updateInvErr.message);

    // 4. Generate DO Code (ma_phieu_xuat)
    const { count } = await supabase.from('fact_xuat_hang').select('*', { count: 'exact', head: true });
    const seq = String((count || 0) + 1).padStart(3, '0');
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const do_code = `DO-${dateStr}-${seq}`;

    // 5. Create Goods Issue (fact_xuat_hang)
    const { data: doData, error: doErr } = await supabase
      .from('fact_xuat_hang')
      .insert({
        ma_phieu_xuat: do_code,
        kho_id: khoId,
        trang_thai: 'pending',
        ten_khach: customer_name || 'Khách vãng lai',
        sdt_khach: customer_phone,
        dia_chi_giao: customer_address,
        ghi_chu: note,
        nguoi_xuat_id: null // Ideally map from created_by to dim_account(id)
      })
      .select()
      .single();

    if (doErr) {
      console.error('[goods-issue] create Delivery Order error:', doErr);
      throw new Error('Lỗi tạo Đơn Xuất Hàng.');
    }

    // 6. Create GI Items (fact_xuat_hang_items)
    const { error: itemsErr } = await supabase
      .from('fact_xuat_hang_items')
      .insert({
        xuat_hang_id: doData.id,
        hom_id: homId,
        ma_hom: maHom,
        ten_hom: tenHom,
        so_luong: quantity,
        inventory_id: inventory_id,
        ghi_chu: 'Xuất từ hệ thống SCM'
      });

    if (itemsErr) console.error('[goods-issue] Items error:', itemsErr);

    // 7. Notify Operations
    await supabase.from('notifications').insert({
      sender_email: created_by,
      receiver_role: 'operations',
      title: 'Đơn giao hàng mới',
      message: `Kho vừa tạo lệnh xuất hàng (${maHom} - Số lượng: ${quantity}) và tạo phiếu giao ${do_code}. Vui lòng tiếp nhận.`,
      type: 'export_alert',
      reference_id: doData.id
    });

    return NextResponse.json({ data: doData, do_code }, { status: 201 });
  } catch (err: any) {
    console.error('[goods-issue API POST]', err);
    return NextResponse.json({ error: err.message || 'Lỗi xử lý server.' }, { status: 500 });
  }
}
