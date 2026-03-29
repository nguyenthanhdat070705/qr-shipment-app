import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

/**
 * GET  /api/goods-receipt     → List all GRPOs from fact_nhap_hang
 * POST /api/goods-receipt     → Create new GRPO in fact_nhap_hang
 */

export async function GET() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('fact_nhap_hang')
    .select('*, items:fact_nhap_hang_items(so_luong_yeu_cau, so_luong_thuc_nhan)')
    .order('created_at', { ascending: false });

  if (error) {
    if (error.message.includes("schema cache")) {
      return NextResponse.json({ data: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Enrich with warehouse & PO info
  const enrichedData = await Promise.all(
    (data || []).map(async (gr: Record<string, unknown>) => {
      let warehouse = null;
      let purchaseOrder = null;

      if (gr.kho_id) {
        const { data: kho } = await supabase
          .from('dim_kho')
          .select('id, ma_kho, ten_kho')
          .eq('id', gr.kho_id as string)
          .single();
        if (kho) warehouse = { id: kho.id, code: kho.ma_kho, name: kho.ten_kho };
      }

      if (gr.don_hang_id) {
        const { data: po } = await supabase
          .from('fact_don_hang')
          .select('id, ma_don_hang, ncc_id')
          .eq('id', gr.don_hang_id as string)
          .single();
        if (po) {
          let supplier = null;
          if (po.ncc_id) {
            const { data: ncc } = await supabase
              .from('dim_ncc')
              .select('id, ten_ncc')
              .eq('id', po.ncc_id)
              .single();
            supplier = ncc ? { name: ncc.ten_ncc } : null;
          }
          purchaseOrder = { po_code: po.ma_don_hang, supplier_id: po.ncc_id, suppliers: supplier };
        }
      }

      // Resolve receiver name
      let receivedByName: string | null = null;
      if (gr.nguoi_nhan_id) {
        const { data: account } = await supabase
          .from('dim_account')
          .select('ho_ten, email')
          .eq('id', gr.nguoi_nhan_id as string)
          .maybeSingle();
        if (account) {
          receivedByName = account.ho_ten || account.email?.split('@')[0] || null;
        }
      }

      const isMissingGoods = Array.isArray(gr.items)
        ? gr.items.some((i: any) => (i.so_luong_thuc_nhan || 0) < (i.so_luong_yeu_cau || 0))
        : false;

      return {
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
        purchase_order: purchaseOrder,
        is_missing_goods: isMissingGoods,
      };
    })
  );

  return NextResponse.json({ data: enrichedData });
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

  // Lookup user UUID
  let nguoiNhanId: string | null = null;
  if (received_by && received_by.includes('@')) {
    const { data: account } = await supabase
      .from('dim_account')
      .select('id')
      .eq('email', received_by)
      .maybeSingle();
    nguoiNhanId = account?.id || null;
  }

  // Generate GR code: GR-YYYYMMDD-XXX
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const { count } = await supabase.from('fact_nhap_hang').select('*', { count: 'exact', head: true });
  const seq = String((count || 0) + 1).padStart(3, '0');
  const ma_phieu_nhap = `GR-${dateStr}-${seq}`;

  const { data: gr, error: grError } = await supabase
    .from('fact_nhap_hang')
    .insert({
      ma_phieu_nhap,
      don_hang_id: po_id || null,
      kho_id: warehouse_id,
      ghi_chu: note ? `${note} | Nhận bởi: ${received_by}` : `Nhận bởi: ${received_by}`,
      nguoi_nhan_id: nguoiNhanId,
      trang_thai: 'completed',
      ngay_nhan: now.toISOString().slice(0, 10),
    })
    .select()
    .single();

  if (grError) {
    return NextResponse.json({ error: grError.message }, { status: 500 });
  }

  // Insert items into fact_nhap_hang_items
  if (items && items.length > 0) {
    const itemRows = items.map((item) => ({
      nhap_hang_id: gr.id,
      ma_hom: item.product_code,
      ten_hom: item.product_name,
      so_luong_yeu_cau: item.expected_qty,
      so_luong_thuc_nhan: item.received_qty,
      ghi_chu: item.note || null,
    }));

    const { error: itemsError } = await supabase.from('fact_nhap_hang_items').insert(itemRows);
    if (itemsError) console.error('[goods-receipt] Items insert error:', itemsError);
  }

  // ── Auto-update linked PO status to 'received' ──
  if (po_id) {
    await supabase.from('fact_don_hang').update({ trang_thai: 'received' }).eq('id', po_id);
  }

  // ── Generate Inventory QR codes ──
  let generatedQRCodes: string[] = [];

  if (items && items.length > 0) {
    const dateStrQR = now.toISOString().slice(0, 10).replace(/-/g, '');

    const qrInserts = items
      .filter((item) => item.received_qty > 0)
      .map((item, i) => {
        const uniqueId = Math.random().toString(36).substring(2, 6).toUpperCase();
        const qr_code = `INV-${dateStrQR}-${item.product_code}-${uniqueId}-${i}`;
        generatedQRCodes.push(qr_code);
        return {
          qr_code,
          type: 'INVENTORY',
          reference_id: item.product_code,
          quantity: item.received_qty,
          warehouse: warehouse_id,
          status: 'active',
          created_by: 'system',
        };
      });

    if (qrInserts.length > 0) {
      const { error: qrError } = await supabase.from('qr_codes').insert(qrInserts);
      if (qrError) console.error('[goods-receipt POST] QR Insert error:', qrError);
    }

    // ── Update inventory ──
    try {
      const maHomList = items.filter(i => i.received_qty > 0).map(i => i.product_code);
      const { data: homData } = await supabase
        .from('dim_hom')
        .select('id, ma_hom')
        .in('ma_hom', maHomList);

      const homMap = new Map<string, string>();
      if (homData) {
        for (const h of homData) homMap.set(h.ma_hom, h.id);
      }

      const receivedMap = new Map<string, number>();
      for (const item of items) {
        if (item.received_qty > 0) {
          receivedMap.set(item.product_code, (receivedMap.get(item.product_code) || 0) + item.received_qty);
        }
      }

      for (const [maHom, qty] of receivedMap.entries()) {
        const homId = homMap.get(maHom);
        if (!homId) continue;

        const { data: existingInv } = await supabase
          .from('fact_inventory')
          .select('*')
          .eq('Tên hàng hóa', homId)
          .eq('Kho', warehouse_id);

        if (existingInv && existingInv.length > 0) {
          const invRow = existingInv[0];
          const newQty = (invRow['Số lượng'] || 0) + qty;
          const newKhadung = (invRow['Ghi chú'] || 0) + qty;
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
            'Kho': warehouse_id,
            'Số lượng': qty,
            'Ghi chú': qty,
          });
        }
      }
    } catch (invErr) {
      console.error('[goods-receipt POST] Inventory update error:', invErr);
    }
  }

  // Send Email Notification
  let ordererEmail = 'phongmuahang@blackstones.vn';
  let poCodeDisplay = 'Không';
  if (po_id) {
    const { data: po } = await supabase.from('fact_don_hang').select('nguoi_tao_id, ma_don_hang').eq('id', po_id).single();
    if (po && po.ma_don_hang) {
      poCodeDisplay = po.ma_don_hang;
      if (po.nguoi_tao_id) {
        const { data: account } = await supabase.from('dim_account').select('email').eq('id', po.nguoi_tao_id).single();
        if (account?.email) ordererEmail = account.email;
      }
    }
  }

  try {
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    await fetch(`${origin}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: ordererEmail,
        subject: `[Thông báo nhập kho] GRPO: ${ma_phieu_nhap}`,
        html: `
          <h3>Thông báo đã nhập hàng kho</h3>
          <p><strong>Mã phiếu nhập:</strong> ${ma_phieu_nhap}</p>
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

  // Send System Notification
  try {
    await supabase.from('notifications').insert({
      sender_email: received_by,
      receiver_role: 'procurement',
      title: 'Nhập kho hoàn tất',
      message: `Phiếu ${ma_phieu_nhap} đã hoàn tất. ${generatedQRCodes.length} mã QR lô hàng đã tạo.`,
      type: 'receipt_alert',
      reference_id: gr.id
    });
  } catch (err) {
    console.error('[goods-receipt] Notification error:', err);
  }

  return NextResponse.json({
    data: { id: gr.id, gr_code: ma_phieu_nhap },
    gr_code: ma_phieu_nhap,
    qr_codes: generatedQRCodes,
  }, { status: 201 });
}
