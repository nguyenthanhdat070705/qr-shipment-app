import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

/**
 * GET   /api/goods-receipt/[id]  → Detail with items
 * PATCH /api/goods-receipt/[id]  → Update status OR update item received_qty
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  // Fetch GR from fact_nhap_hang
  const { data: gr, error } = await supabase
    .from('fact_nhap_hang')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 });
  }

  // Fetch items from fact_nhap_hang_items
  const { data: rawItems } = await supabase
    .from('fact_nhap_hang_items')
    .select('*')
    .eq('nhap_hang_id', id);

  const items = (rawItems || []).map((item: Record<string, unknown>) => ({
    id: item.id,
    gr_id: item.nhap_hang_id,
    product_code: item.ma_hom,
    product_name: item.ten_hom,
    expected_qty: item.so_luong_yeu_cau || 0,
    received_qty: item.so_luong_thuc_nhan || 0,
    is_accepted: true,
    note: item.ghi_chu,
    created_at: item.created_at,
  }));

  // Fetch warehouse from dim_kho
  let warehouse = null;
  if (gr.kho_id) {
    const { data: kho } = await supabase
      .from('dim_kho')
      .select('id, ma_kho, ten_kho')
      .eq('id', gr.kho_id)
      .single();
    if (kho) warehouse = { id: kho.id, code: kho.ma_kho, name: kho.ten_kho };
  }

  // Fetch PO from fact_don_hang
  let purchase_order = null;
  if (gr.don_hang_id) {
    const { data: po } = await supabase
      .from('fact_don_hang')
      .select('*')
      .eq('id', gr.don_hang_id)
      .single();

    if (po) {
      let supplier = null;
      if (po.ncc_id) {
        const { data: ncc } = await supabase
          .from('dim_ncc')
          .select('*')
          .eq('id', po.ncc_id)
          .single();
        if (ncc) {
          supplier = {
            id: ncc.id,
            code: ncc.ma_ncc,
            name: ncc.ten_ncc,
            contact_name: ncc.nguoi_lien_he,
            phone: ncc.sdt,
          };
        }
      }
      purchase_order = {
        id: po.id,
        po_code: po.ma_don_hang,
        status: po.trang_thai,
        supplier,
      };
    }
  }

  return NextResponse.json({
    data: {
      id: gr.id,
      gr_code: gr.ma_phieu_nhap,
      po_id: gr.don_hang_id,
      warehouse_id: gr.kho_id,
      status: gr.trang_thai || 'pending',
      note: gr.ghi_chu,
      received_by: gr.nguoi_nhan_id,
      received_date: gr.ngay_nhan,
      created_at: gr.created_at,
      updated_at: gr.updated_at,
      warehouse,
      purchase_order,
      items,
    },
  });
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
        .from('fact_nhap_hang_items')
        .update({ so_luong_thuc_nhan: item.received_qty })
        .eq('id', item.id)
        .eq('nhap_hang_id', id);
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
    .from('fact_nhap_hang')
    .update({ trang_thai: body.status })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  /* ── Auto-generate Inventory QR codes when completed ─────────── */
  let generatedQRCodes: string[] = [];

  if (body.status === 'completed') {
    const { data: grItems } = await supabase
      .from('fact_nhap_hang_items')
      .select('ma_hom, so_luong_thuc_nhan')
      .eq('nhap_hang_id', id);

    if (grItems) {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

      const qrInserts = grItems
        .filter((item: Record<string, unknown>) => (item.so_luong_thuc_nhan as number) > 0)
        .map((item: Record<string, unknown>, i: number) => {
          const uniqueId = Math.random().toString(36).substring(2, 6).toUpperCase();
          const qr_code = `INV-${dateStr}-${item.ma_hom}-${uniqueId}-${i}`;
          generatedQRCodes.push(qr_code);
          return {
            qr_code,
            type: 'INVENTORY',
            reference_id: item.ma_hom,
            quantity: item.so_luong_thuc_nhan,
            warehouse: data.kho_id,
            status: 'active',
            created_by: 'system',
          };
        });

      if (qrInserts.length > 0) {
        const { error: qrError } = await supabase.from('qr_codes').insert(qrInserts);
        if (qrError) console.error('[goods-receipt PATCH] QR Insert error:', qrError);
      }

      // Update inventory based on received goods
      try {
        const kho_id = data.kho_id;
        if (kho_id && grItems.length > 0) {
          const maHomList = grItems.map((item: any) => item.ma_hom);
          const { data: homData } = await supabase
            .from('dim_hom')
            .select('id, ma_hom')
            .in('ma_hom', maHomList);

          const homMap = new Map<string, string>();
          if (homData) {
            for (const h of homData) homMap.set(h.ma_hom, h.id);
          }

          const receivedMap = new Map<string, number>();
          for (const item of grItems) {
            const qty = (item.so_luong_thuc_nhan as number) || 0;
            if (qty > 0) {
              receivedMap.set(item.ma_hom as string, (receivedMap.get(item.ma_hom as string) || 0) + qty);
            }
          }

          for (const [maHom, qty] of receivedMap.entries()) {
            const homId = homMap.get(maHom);
            if (!homId) continue;

            const { data: existingInv } = await supabase
              .from('fact_inventory')
              .select('*')
              .eq('Tên hàng hóa', homId)
              .eq('Kho', kho_id);

            if (existingInv && existingInv.length > 0) {
              const invRow = existingInv[0];
              const newQty = (invRow['Số lượng'] || 0) + qty;
              const newKhadung = (invRow['Ghi chú'] || 0) + qty;
              await supabase
                .from('fact_inventory')
                .update({ 'Số lượng': newQty, 'Ghi chú': newKhadung })
                .eq('Mã', invRow['Mã']);
            } else {
              await supabase
                .from('fact_inventory')
                .insert({
                  'Mã': randomUUID(),
                  'Tên hàng hóa': homId,
                  'Kho': kho_id,
                  'Số lượng': qty,
                  'Ghi chú': qty,
                });
            }
          }
        }
      } catch (invErr) {
        console.error('[goods-receipt PATCH] Inventory update error:', invErr);
      }
    }

    // Notify procurement
    try {
      await supabase.from('notifications').insert({
        sender_email: 'kho@blackstones.vn',
        receiver_role: 'procurement',
        title: 'Nhập kho hoàn tất — QR đã sinh',
        message: `Phiếu ${data.ma_phieu_nhap} đã hoàn tất. ${generatedQRCodes.length} mã QR lô hàng đã tạo.`,
        type: 'receipt_alert',
        reference_id: id,
      });
    } catch (e) { console.error(e); }
  }

  return NextResponse.json({ data: { ...data, status: data.trang_thai, gr_code: data.ma_phieu_nhap }, qr_codes: generatedQRCodes });
}
