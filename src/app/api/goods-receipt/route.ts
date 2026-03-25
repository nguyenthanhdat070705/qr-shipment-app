import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * GET  /api/goods-receipt     → List all GRPOs
 * POST /api/goods-receipt     → Create new GRPO
 */

export async function GET() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('goods_receipts')
    .select(`
      *,
      warehouse:warehouses(*),
      purchase_order:purchase_orders(po_code, supplier_id, suppliers:suppliers(name))
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { po_id, warehouse_id, note, received_by, items } = body as {
    po_id?: string;
    warehouse_id: string;
    note?: string;
    received_by: string;
    items?: { product_code: string; product_name: string; expected_qty: number; received_qty: number; note?: string }[];
  };

  if (!warehouse_id || !received_by) {
    return NextResponse.json({ error: 'warehouse_id và received_by là bắt buộc.' }, { status: 400 });
  }

  // Generate GR code: GR-YYYYMMDD-XXX
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const { count } = await supabase.from('goods_receipts').select('*', { count: 'exact', head: true });
  const seq = String((count || 0) + 1).padStart(3, '0');
  const gr_code = `GR-${dateStr}-${seq}`;

  const { data: gr, error: grError } = await supabase
    .from('goods_receipts')
    .insert({
      gr_code,
      po_id: po_id || null,
      warehouse_id,
      note: note || null,
      received_by,
      status: 'pending',
    })
    .select()
    .single();

  if (grError) {
    return NextResponse.json({ error: grError.message }, { status: 500 });
  }

  // Insert items
  if (items && items.length > 0) {
    const itemRows = items.map((item) => ({
      gr_id: gr.id,
      product_code: item.product_code,
      product_name: item.product_name,
      expected_qty: item.expected_qty,
      received_qty: item.received_qty,
      note: item.note || null,
    }));

    const { error: itemsError } = await supabase.from('goods_receipt_items').insert(itemRows);
    if (itemsError) console.error('[goods-receipt] Items insert error:', itemsError);
  }

  // Send Email Notification
  let ordererEmail = 'phongmuahang@blackstones.vn';
  let poCodeDisplay = 'Không';
  if (po_id) {
    const { data: po } = await supabase.from('purchase_orders').select('created_by, po_code').eq('id', po_id).single();
    if (po && po.created_by) {
      ordererEmail = po.created_by;
      poCodeDisplay = po.po_code;
    }
  }

  try {
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    await fetch(`${origin}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: ordererEmail,
        subject: `[Thông báo nhập kho] GRPO: ${gr_code}`,
        html: `
          <h3>Thông báo đã nhập hàng kho</h3>
          <p><strong>Mã phiếu nhập:</strong> ${gr_code}</p>
          <p><strong>PO liên kết:</strong> ${poCodeDisplay}</p>
          <p><strong>Người nhận (Kho):</strong> ${received_by}</p>
          <hr/>
          <p><a href="${origin}/goods-receipt/${gr.id}">Bấm vào đây để xem chi tiết số lượng nhập</a></p>
        `
      })
    });
  } catch (emailError) {
    console.error('[goods-receipt] Lỗi gọi API gửi email:', emailError);
  }

  return NextResponse.json({ data: gr, gr_code }, { status: 201 });
}
