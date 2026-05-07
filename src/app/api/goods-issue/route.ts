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
    // Legacy fields (kept for backwards compatibility)
    customer_name,
    customer_phone,
    customer_address,
  } = body;

  if (!inventory_id) {
    return NextResponse.json({ error: 'Thiếu dữ liệu: Lô hàng tồn kho.' }, { status: 400 });
  }

  // App hiện tại đang lưu session tự chế trên localStorage nên không có token Supabase Auth thật
  let email = body.created_by;
  
  if (!email || email === 'unknown') {
     return NextResponse.json({ error: 'Yêu cầu đăng nhập hoặc không xác định người dùng.' }, { status: 401 });
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
    // 1. Resolve creator UUID from dim_account and check warehouse permission
    let nguoiXuatId: string | null = null;
    let nguoiXuatName = '';
    const { data: account } = await supabase
      .from('dim_account')
      .select('id, hoten')
      .eq('email', email)
      .maybeSingle();
    nguoiXuatId = account?.id || null;
    nguoiXuatName = account?.hoten || '';

    // Server-side lock check
    const { getWarehouseFilter } = await import('@/config/roles.config');
    const allowedWarehouse = getWarehouseFilter(email, nguoiXuatName);
    
    if (allowedWarehouse) {
       // Chúng ta cần lấy tên kho của lô hàng đang muốn xuất
       const { data: invRow } = await supabase
        .from('fact_inventory')
        .select('Kho')
        .eq('Mã', inventory_id)
        .single();

       if (invRow) {
         const { data: khoData } = await supabase
          .from('dim_kho')
          .select('ten_kho')
          .eq('id', invRow['Kho'])
          .maybeSingle();
          
        if (khoData) {
          const khoName = (khoData.ten_kho || '').toLowerCase();
          const allowedLower = allowedWarehouse.toLowerCase();
          
          if (!khoName.includes(allowedLower) && !allowedLower.includes(khoName)) {
             return NextResponse.json(
              { error: `Tài khoản của bạn chỉ được thao tác tại ${allowedWarehouse}. Kho được chọn là ${khoData.ten_kho}.` },
              { status: 403 }
            );
          }
        }
       }
    }

    // 2. Generate export code
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(Math.random() * 9000 + 1000);
    const do_code = `DO-${dateStr}-${randSuffix}`;

    // 3. Gọi Postgres Transaction RPC để nguyên khối hóa: Trừ kho + Tạo Phiếu
    const tenKhach = nguoi_nhan || customer_name || 'Khách vãng lai';
    const ghiChu = ma_dam ? `Mã Đám: ${ma_dam}${note ? ' | ' + note : ''}` : (note || null);
    
    const { data: rpcResult, error: rpcErr } = await supabase.rpc('process_goods_issue', {
      p_inventory_id: inventory_id,
      p_quantity: quantity,
      p_ma_phieu_xuat: do_code,
      p_ten_khach: tenKhach,
      p_sdt_khach: customer_phone || null,
      p_dia_chi_giao: customer_address || null,
      p_ghi_chu: ghiChu,
      p_nguoi_xuat_id: nguoiXuatId,
      p_item_ghi_chu: note || 'Xuất từ hệ thống SCM'
    });

    if (rpcErr || !rpcResult?.success) {
      console.error('[goods-issue RPC Error]', rpcErr || rpcResult);
      return NextResponse.json({ error: (rpcErr?.message || rpcResult?.error) || 'Lỗi giao dịch kho (Database).' }, { status: 400 });
    }

    // 4. Notify operations (optional)
    try {
      await supabase.from('notifications').insert({
        sender_email: email,
        receiver_role: 'operations',
        title: 'Đơn giao hàng mới',
        message: `Kho xuất ${rpcResult.ma_hom} (${rpcResult.ten_hom}) — Phiếu: ${do_code}. Vui lòng tiếp nhận.`,
        type: 'export_alert',
        reference_id: rpcResult.do_id,
      });
    } catch (e: any) {
      console.warn('[goods-issue] notification skipped:', e.message);
    }

    return NextResponse.json(
      {
        success: true,
        do_code,
        ma_hom: rpcResult.ma_hom,
        ten_hom: rpcResult.ten_hom,
        so_luong_con_lai: rpcResult.so_luong_con_lai,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[goods-issue POST]', err);
    return NextResponse.json({ error: err.message || 'Lỗi xử lý server.' }, { status: 500 });
  }
}
