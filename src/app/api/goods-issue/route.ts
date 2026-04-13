import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * POST /api/goods-issue
 * Deducts inventory and records the goods issue.
 * 
 * fact_inventory uses older Vietnamese column names:
 *   "Mã"           → record id
 *   "Tên hàng hóa" → dim_hom.id (uuid)
 *   "Kho"          → dim_kho.id (uuid)
 *   "Số lượng"     → total quantity
 *   "Ghi chú"      → available (khả dụng) quantity
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
    quantity = 1,
    ma_dam,
    nguoi_nhan,
    note,
    created_by,
    // Legacy fields (kept for backwards compatibility)
    customer_name,
    customer_phone,
    customer_address,
  } = body;

  if (!inventory_id) {
    return NextResponse.json({ error: 'Thiếu dữ liệu: Lô hàng tồn kho.' }, { status: 400 });
  }

  // Kiểm tra mã đám đã xuất chưa (mỗi đám chỉ xuất 1 lần)
  if (ma_dam && ma_dam.trim()) {
    const { data: existingExport } = await supabase
      .from('fact_xuat_hang')
      .select('id, ma_phieu_xuat')
      .ilike('ghi_chu', `%${ma_dam.trim()}%`)
      .limit(1);

    if (existingExport && existingExport.length > 0) {
      return NextResponse.json(
        { error: `Mã đám "${ma_dam.trim()}" đã được xuất hàng trước đó (Phiếu: ${existingExport[0].ma_phieu_xuat}). Mỗi đám chỉ được xuất 1 lần.` },
        { status: 400 }
      );
    }
  }

  try {
    // 1. Verify inventory row
    const { data: invRow, error: invErr } = await supabase
      .from('fact_inventory')
      .select('*')
      .eq('Mã', inventory_id)
      .single();

    if (invErr || !invRow) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin tồn kho hợp lệ.' }, { status: 404 });
    }

    const totalQty = Number(invRow['Số lượng'] || 0);

    if (totalQty < quantity) {
      return NextResponse.json(
        { error: `Số lượng trong kho không đủ (Kho chỉ còn: ${totalQty})` },
        { status: 400 }
      );
    }

    // 2. Map product info from dim_hom
    const { data: homData } = await supabase
      .from('dim_hom')
      .select('id, ma_hom, ten_hom')
      .eq('id', invRow['Tên hàng hóa'])
      .maybeSingle();

    const maHom = homData?.ma_hom || 'N/A';
    const tenHom = homData?.ten_hom || 'Không xác định';
    const khoId = invRow['Kho'];

    // 3. Deduct from fact_inventory — always update both columns to same value
    const newQty = Math.max(0, totalQty - quantity);

    const { error: updateInvErr } = await supabase
      .from('fact_inventory')
      .update({ 'Số lượng': newQty, 'Ghi chú': newQty })
      .eq('Mã', inventory_id);

    if (updateInvErr) {
      throw new Error('Lỗi trừ tồn kho: ' + updateInvErr.message);
    }

    console.log(`[goods-issue] ✅ Trừ kho: ${inventory_id} | SL: ${totalQty} → ${newQty}`);

    // 4. Resolve creator UUID from dim_account
    let nguoiXuatId: string | null = null;
    if (created_by && created_by.includes('@')) {
      const { data: account } = await supabase
        .from('dim_account')
        .select('id')
        .eq('email', created_by)
        .maybeSingle();
      nguoiXuatId = account?.id || null;
    }

    // 5. Generate export code
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(Math.random() * 9000 + 1000);
    const do_code = `DO-${dateStr}-${randSuffix}`;

    // 6. Try to record in fact_xuat_hang — skip gracefully if table schema mismatch
    let doId: string | null = null;
    try {
      const { data: doData, error: doErr } = await supabase
        .from('fact_xuat_hang')
        .insert({
          ma_phieu_xuat: do_code,
          kho_id: khoId,
          trang_thai: 'pending',
          ten_khach: nguoi_nhan || customer_name || 'Khách vãng lai',
          sdt_khach: customer_phone || null,
          dia_chi_giao: customer_address || null,
          ghi_chu: ma_dam ? `Mã Đám: ${ma_dam}${note ? ' | ' + note : ''}` : (note || null),
          nguoi_xuat_id: nguoiXuatId,
        })
        .select('id')
        .single();

      if (!doErr && doData) {
        doId = doData.id;

        if (homData) {
          const { error: itemsErr } = await supabase.from('fact_xuat_hang_items').insert({
            xuat_hang_id: doId,
            hom_id: homData.id,
            ma_hom: maHom,
            ten_hom: tenHom,
            so_luong: quantity,
            inventory_id: null,
            ghi_chu: note || 'Xuất từ hệ thống SCM',
          });
          if (itemsErr) throw new Error('Lỗi thêm items xuất hàng: ' + itemsErr.message);
        }
      } else if (doErr) {
        throw new Error('Lỗi thêm phiếu xuất hàng: ' + doErr.message);
      }
    } catch (e: any) {
      throw new Error('Không thể ghi phiếu xuất: ' + e.message);
    }

    // 7. Notify operations (optional)
    try {
      await supabase.from('notifications').insert({
        sender_email: created_by,
        receiver_role: 'operations',
        title: 'Đơn giao hàng mới',
        message: `Kho xuất ${maHom} (${tenHom}) — Phiếu: ${do_code}. Vui lòng tiếp nhận.`,
        type: 'export_alert',
        reference_id: doId,
      });
    } catch (e: any) {
      console.warn('[goods-issue] notification skipped:', e.message);
    }

    return NextResponse.json(
      {
        success: true,
        do_code,
        ma_hom: maHom,
        ten_hom: tenHom,
        so_luong_con_lai: newQty,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[goods-issue POST]', err);
    return NextResponse.json({ error: err.message || 'Lỗi xử lý server.' }, { status: 500 });
  }
}
