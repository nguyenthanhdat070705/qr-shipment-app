import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * GET   /api/goods-receipt/[id]  → Detail with items
 * PATCH /api/goods-receipt/[id]  → Cancel GRPO only
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

  // Fetch receiver name from dim_account
  let receivedByName: string | null = null;
  if (gr.nguoi_nhan_id) {
    const { data: account } = await supabase
      .from('dim_account')
      .select('ho_ten, email')
      .eq('id', gr.nguoi_nhan_id)
      .maybeSingle();
    if (account) {
      receivedByName = account.ho_ten || account.email?.split('@')[0] || null;
    }
  }

  return NextResponse.json({
    data: {
      id: gr.id,
      gr_code: gr.ma_phieu_nhap,
      po_id: gr.don_hang_id,
      warehouse_id: gr.kho_id,
      status: gr.trang_thai || 'completed',
      note: gr.ghi_chu,
      received_by: receivedByName || gr.nguoi_nhan_id,
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

  let body: { status?: string; cancelled_by?: string; link_po_id?: string; confirm_receipt?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Check current GRPO
  const { data: currentGr } = await supabase
    .from('fact_nhap_hang')
    .select('trang_thai, kho_id, ma_phieu_nhap')
    .eq('id', id)
    .single();

  if (!currentGr) {
    return NextResponse.json({ error: 'Không tìm thấy phiếu nhập.' }, { status: 404 });
  }

  // ══════════════════════════════════════════════
  // ACTION: Link PO to temporary receipt
  // ══════════════════════════════════════════════
  if (body.link_po_id) {
    if (currentGr.trang_thai !== 'pending_po') {
      return NextResponse.json({ error: 'Chỉ có thể liên kết PO khi phiếu đang ở trạng thái "Chờ PO".' }, { status: 400 });
    }

    // Verify PO exists
    const { data: po } = await supabase
      .from('fact_don_hang')
      .select('id, ma_don_hang')
      .eq('id', body.link_po_id)
      .single();

    if (!po) {
      return NextResponse.json({ error: 'Không tìm thấy PO.' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('fact_nhap_hang')
      .update({ 
        don_hang_id: body.link_po_id, 
        trang_thai: 'pending_confirm',
        ghi_chu: (currentGr as any).ghi_chu ? `${(currentGr as any).ghi_chu} | PO: ${po.ma_don_hang}` : `PO: ${po.ma_don_hang}`,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Notify warehouse that PO has been linked
    try {
      await supabase.from('notifications').insert({
        sender_email: 'system',
        receiver_role: 'warehouse',
        title: '✅ PO đã liên kết - Cần xác nhận nhập kho',
        message: `Phiếu ${currentGr.ma_phieu_nhap} đã được liên kết PO ${po.ma_don_hang}. Vui lòng xác nhận để nhập kho chính thức.`,
        type: 'po_linked',
        reference_id: id,
      });
    } catch (err) {
      console.error('[goods-receipt PATCH] Notification error:', err);
    }

    return NextResponse.json({ 
      data: { ...data, status: data.trang_thai, gr_code: data.ma_phieu_nhap },
      message: `Đã liên kết PO ${po.ma_don_hang} thành công.`,
    });
  }

  // ══════════════════════════════════════════════
  // ACTION: Confirm receipt (final step for temporary)
  // ══════════════════════════════════════════════
  if (body.confirm_receipt) {
    if (currentGr.trang_thai !== 'pending_confirm') {
      return NextResponse.json({ error: 'Chỉ có thể xác nhận khi phiếu đang ở trạng thái "Chờ xác nhận".' }, { status: 400 });
    }

    // Get items for this GRPO
    const { data: grItems } = await supabase
      .from('fact_nhap_hang_items')
      .select('ma_hom, ten_hom, so_luong_thuc_nhan')
      .eq('nhap_hang_id', id);

    // Update inventory
    if (grItems && grItems.length > 0) {
      try {
        const maHomList = grItems.filter((i: any) => (i.so_luong_thuc_nhan || 0) > 0).map((i: any) => i.ma_hom);
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
          const qty = Number(item.so_luong_thuc_nhan || 0);
          if (qty > 0) {
            receivedMap.set(item.ma_hom, (receivedMap.get(item.ma_hom) || 0) + qty);
          }
        }

        const { randomUUID } = await import('crypto');

        for (const [maHom, qty] of receivedMap.entries()) {
          const homId = homMap.get(maHom);
          if (!homId) continue;

          const { data: existingInv } = await supabase
            .from('fact_inventory')
            .select('*')
            .eq('Tên hàng hóa', homId)
            .eq('Kho', currentGr.kho_id);

          if (existingInv && existingInv.length > 0) {
            const invRow = existingInv[0] as any;
            const newQty = (Number(invRow['Số lượng']) || 0) + qty;
            const newKhadung = (Number(invRow['Ghi chú']) || 0) + qty;
            await supabase.from('fact_inventory').delete().eq('Mã', invRow['Mã']);
            await supabase.from('fact_inventory').insert({
              'Mã': invRow['Mã'],
              'Tên hàng hóa': invRow['Tên hàng hóa'],
              'Kho': invRow['Kho'],
              'Số lượng': newQty,
              'Ghi chú': newKhadung,
              'Loại hàng': invRow['Loại hàng'],
            });
          } else {
            await supabase.from('fact_inventory').insert({
              'Mã': randomUUID(),
              'Tên hàng hóa': homId,
              'Kho': currentGr.kho_id,
              'Số lượng': qty,
              'Ghi chú': qty,
            });
          }
        }
      } catch (invErr) {
        console.error('[goods-receipt CONFIRM] Inventory update error:', invErr);
      }

      // Generate QR codes
      try {
        const now = new Date();
        const dateStrQR = now.toISOString().slice(0, 10).replace(/-/g, '');
        const qrInserts = grItems
          .filter((item: any) => (item.so_luong_thuc_nhan || 0) > 0)
          .map((item: any, i: number) => {
            const uniqueId = Math.random().toString(36).substring(2, 6).toUpperCase();
            return {
              qr_code: `INV-${dateStrQR}-${item.ma_hom}-${uniqueId}-${i}`,
              type: 'INVENTORY',
              reference_id: item.ma_hom,
              quantity: item.so_luong_thuc_nhan,
              warehouse: currentGr.kho_id,
              status: 'active',
              created_by: 'system',
            };
          });

        if (qrInserts.length > 0) {
          await supabase.from('qr_codes').insert(qrInserts);
        }
      } catch (qrErr) {
        console.error('[goods-receipt CONFIRM] QR error:', qrErr);
      }
    }

    // Update PO status to 'received'
    const { data: grFull } = await supabase
      .from('fact_nhap_hang')
      .select('don_hang_id')
      .eq('id', id)
      .single();

    if (grFull?.don_hang_id) {
      await supabase.from('fact_don_hang').update({ trang_thai: 'received' }).eq('id', grFull.don_hang_id);
    }

    // Update status to completed
    const { data, error } = await supabase
      .from('fact_nhap_hang')
      .update({ trang_thai: 'completed' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send notification
    try {
      await supabase.from('notifications').insert({
        sender_email: 'system',
        receiver_role: 'procurement',
        title: '✅ Nhập kho chính thức hoàn tất',
        message: `Phiếu ${currentGr.ma_phieu_nhap} đã được xác nhận nhập kho chính thức. Tồn kho đã cập nhật.`,
        type: 'receipt_confirmed',
        reference_id: id,
      });
    } catch (err) {
      console.error('[goods-receipt CONFIRM] Notification error:', err);
    }

    return NextResponse.json({ 
      data: { ...data, status: data.trang_thai, gr_code: data.ma_phieu_nhap },
      message: 'Xác nhận nhập kho chính thức thành công! Tồn kho đã cập nhật.',
    });
  }

  // ══════════════════════════════════════════════
  // ACTION: Change status (cancel, etc.)
  // ══════════════════════════════════════════════
  if (!body.status) {
    return NextResponse.json({ error: 'Thiếu status.' }, { status: 400 });
  }

  const validStatuses = ['completed', 'cancelled'];
  if (!validStatuses.includes(body.status)) {
    return NextResponse.json({ error: `Trạng thái không hợp lệ: ${body.status}` }, { status: 400 });
  }

  if (currentGr.trang_thai === 'cancelled') {
    return NextResponse.json({ error: 'Phiếu này đã bị hủy trước đó.' }, { status: 400 });
  }

  // If cancelling → deduct inventory (only for completed receipts)
  if (body.status === 'cancelled' && currentGr.trang_thai === 'completed') {
    const { data: grItems } = await supabase
      .from('fact_nhap_hang_items')
      .select('ma_hom, so_luong_thuc_nhan')
      .eq('nhap_hang_id', id);

    if (grItems && grItems.length > 0) {
      for (const item of grItems) {
        const qty = Number(item.so_luong_thuc_nhan || 0);
        if (qty <= 0 || !item.ma_hom) continue;

        const { data: hom } = await supabase
          .from('dim_hom')
          .select('id')
          .eq('ma_hom', item.ma_hom)
          .maybeSingle();

        if (!hom) continue;

        const { data: invRows } = await supabase
          .from('fact_inventory')
          .select('Mã, Số lượng, Ghi chú')
          .eq('Tên hàng hóa', hom.id)
          .eq('Kho', currentGr.kho_id);

        if (invRows && invRows.length > 0) {
          const invRow = invRows[0] as any;
          const currentQty = Number(invRow['Số lượng'] || 0);
          const newQty = Math.max(0, currentQty - qty);

          await supabase
            .from('fact_inventory')
            .update({ 'Số lượng': newQty, 'Ghi chú': newQty })
            .eq('Mã', invRow['Mã']);

          console.log(`[GRPO Cancel] Deducted ${qty} from inventory: ${item.ma_hom} (${currentQty} → ${newQty})`);
        }
      }
    }
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

  return NextResponse.json({ data: { ...data, status: data.trang_thai, gr_code: data.ma_phieu_nhap } });
}
