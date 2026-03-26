import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * GET   /api/goods-receipt/[id]  → Detail with items
 * PATCH /api/goods-receipt/[id]  → Update status OR update item received_qty
 *
 * PATCH body options:
 *   { status: string }                                             → change GR status
 *   { update_items: [{ id: string, received_qty: number }] }      → update item quantities
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('goods_receipts')
    .select(`
      *,
      warehouse:warehouses(*),
      purchase_order:purchase_orders(*, supplier:suppliers(*)),
      items:goods_receipt_items(*)
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

  let body: {
    status?: string;
    update_items?: { id: string; received_qty: number }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  /* ── Case 1: Update items received_qty ───────────────────────── */
  if (body.update_items && body.update_items.length > 0) {
    const updates = body.update_items;
    const errors: string[] = [];

    for (const item of updates) {
      const { error } = await supabase
        .from('goods_receipt_items')
        .update({ received_qty: item.received_qty })
        .eq('id', item.id)
        .eq('gr_id', id); // safety: only update items belonging to this GR
      if (error) errors.push(error.message);
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join('; ') }, { status: 500 });
    }

    return NextResponse.json({ ok: true, updated: updates.length });
  }

  /* ── Case 2: Change GR status ────────────────────────────────── */
  if (!body.status) {
    return NextResponse.json({ error: 'Thiếu status hoặc update_items.' }, { status: 400 });
  }

  const validStatuses = ['pending', 'inspecting', 'completed', 'rejected'];
  if (!validStatuses.includes(body.status)) {
    return NextResponse.json({ error: `Trạng thái không hợp lệ: ${body.status}` }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('goods_receipts')
    .update({ status: body.status })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  /* ── Auto-generate Inventory QR codes when completed ─────────── */
  let generatedQRCodes: string[] = [];

  if (body.status === 'completed') {
    const { data: grData } = await supabase
      .from('goods_receipts')
      .select('warehouse_id, received_by, goods_receipt_items(product_code, received_qty)')
      .eq('id', id)
      .single();

    if (grData?.goods_receipt_items) {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

      const qrInserts = (grData.goods_receipt_items as { product_code: string; received_qty: number }[])
        .filter((item) => item.received_qty > 0)
        .map((item, i) => {
          const uniqueId = Math.random().toString(36).substring(2, 6).toUpperCase();
          const qr_code = `INV-${dateStr}-${item.product_code}-${uniqueId}-${i}`;
          generatedQRCodes.push(qr_code);
          return {
            qr_code,
            type: 'INVENTORY',
            reference_id: item.product_code,
            quantity: item.received_qty,
            warehouse: grData.warehouse_id,
            status: 'active',
            created_by: grData.received_by || 'system',
          };
        });

      if (qrInserts.length > 0) {
        const { error: qrError } = await supabase.from('qr_codes').insert(qrInserts);
        if (qrError) console.error('[goods-receipt PATCH] QR Insert error:', qrError);
      }
    }

    // Notify procurement
    try {
      const { error: notifError } = await supabase.from('notifications').insert({
        sender_email: data.received_by || 'kho@blackstones.vn',
        receiver_role: 'procurement',
        title: 'Nhập kho hoàn tất — QR đã sinh',
        message: `Phiếu ${data.gr_code} đã hoàn tất. ${generatedQRCodes.length} mã QR lô hàng đã tạo.`,
        type: 'receipt_alert',
        reference_id: id,
      });
      if (notifError) console.error('[goods-receipt PATCH] Notification error:', notifError);
    } catch (e) { console.error(e); }
  }

  return NextResponse.json({ data, qr_codes: generatedQRCodes });
}
