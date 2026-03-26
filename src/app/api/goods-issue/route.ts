import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * POST /api/goods-issue
 * Creates a Delivery Order, deducts Inventory QR quantity, and notifies Operations.
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
    qr_id,
    qr_code,
    product_code,
    quantity,
    warehouse_id,
    customer_name,
    customer_phone,
    customer_address,
    note,
    created_by
  } = body;

  if (!qr_id || !quantity || !warehouse_id) {
    return NextResponse.json({ error: 'Thiếu dữ liệu: Mã lô, Số lượng hoặc Kho.' }, { status: 400 });
  }

  try {
    // 1. Verify and update QR Code
    const { data: qrData, error: qrErr } = await supabase
      .from('qr_codes')
      .select('quantity, status')
      .eq('id', qr_id)
      .single();

    if (qrErr || !qrData) {
      return NextResponse.json({ error: 'Không tìm thấy Mã Đám hợp lệ.' }, { status: 404 });
    }

    if (qrData.status !== 'active') {
      return NextResponse.json({ error: 'Mã Đám không trong trạng thái hoạt động.' }, { status: 400 });
    }

    if (qrData.quantity < quantity) {
      return NextResponse.json({ error: `Số lượng tồn kho không đủ (Tồn: ${qrData.quantity})` }, { status: 400 });
    }

    const newQty = qrData.quantity - quantity;
    const newStatus = newQty === 0 ? 'used' : 'active';

    const { error: qrUpdateErr } = await supabase
      .from('qr_codes')
      .update({ quantity: newQty, status: newStatus })
      .eq('id', qr_id);

    if (qrUpdateErr) throw new Error('Lỗi cập nhật số lượng tồn kho.');

    // 2. Generate DO Code
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const { count } = await supabase.from('delivery_orders').select('*', { count: 'exact', head: true });
    const seq = String((count || 0) + 1).padStart(3, '0');
    const do_code = `DO-${dateStr}-${seq}`;

    // 3. Create Delivery Order
    const { data: doData, error: doErr } = await supabase
      .from('delivery_orders')
      .insert({
        do_code,
        warehouse_id,
        status: 'pending',
        customer_name: customer_name || 'Khách vãng lai',
        customer_phone,
        customer_address,
        note,
        delivery_date: null,
        created_by: created_by || 'Kho (Scan QR)'
      })
      .select()
      .single();

    if (doErr) {
      // Rollback not supported easily without RPC, assume it works for demo
      console.error('[goods-issue] Delivery Order insert error:', doErr);
      throw new Error('Lỗi tạo Đơn Giao Hàng.');
    }

    // 4. Create DO Items
    const { error: itemsErr } = await supabase
      .from('delivery_order_items')
      .insert({
        do_id: doData.id,
        product_code,
        product_name: 'Đám: ' + qr_code,
        quantity,
        note: 'Xuất từ mã QR Đám'
      });

    if (itemsErr) console.error('[goods-issue] Items error:', itemsErr);

    // 5. Notify Operations
    await supabase.from('notifications').insert({
      sender_email: created_by,
      receiver_role: 'operations',
      title: 'Đơn giao hàng mới',
      message: `Kho vừa xuất lô hàng ${qr_code} và tạo lệnh giao ${do_code}. Vui lòng tiếp nhận.`,
      type: 'export_alert',
      reference_id: doData.id
    });

    return NextResponse.json({ data: doData, do_code }, { status: 201 });
  } catch (err: any) {
    console.error('[goods-issue API]', err);
    return NextResponse.json({ error: err.message || 'Lỗi xử lý server.' }, { status: 500 });
  }
}
