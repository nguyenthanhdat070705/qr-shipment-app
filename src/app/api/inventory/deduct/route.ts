import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * POST /api/inventory/deduct
 * Trừ 1 đơn vị tồn kho cho mã hòm nhất định.
 * Body: { ma_hom: string, quantity?: number }
 */
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'JSON không hợp lệ' }, { status: 400 });
  }

  const { inventory_id, quantity = 1 } = body;
  if (!inventory_id) {
    return NextResponse.json({ success: false, error: 'Thiếu inventory_id (Mã lô kho)' }, { status: 400 });
  }

  // Auth
  const authHeader = req.headers.get('Authorization');
  let email = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (!authErr && user?.email) {
      email = user.email;
    }
  }

  if (!email) {
    return NextResponse.json({ success: false, error: 'Vui lòng đăng nhập.' }, { status: 401 });
  }

  try {
    // 1. Kiểm tra quyền của người dùng với Kho tương ứng (Server-side check)
    const { data: invRow } = await supabase
      .from('fact_inventory')
      .select('Kho')
      .eq('Mã', inventory_id)
      .single();

    if (!invRow) {
       return NextResponse.json({ success: false, error: 'Lô kho không tồn tại.' }, { status: 404 });
    }

    const { data: khoData } = await supabase
      .from('dim_kho')
      .select('ten_kho')
      .eq('id', invRow['Kho'])
      .eq('is_active', true)
      .maybeSingle();
    if (!khoData) {
      return NextResponse.json({ success: false, error: 'Kho của lô hàng đã ngừng hoạt động, không thể trừ tồn mới.' }, { status: 409 });
    }

    const { data: account } = await supabase
      .from('dim_account')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    const { getWarehouseFilter } = await import('@/config/roles.config');
    const allowedWarehouse = getWarehouseFilter(email, account?.ho_ten || account?.hoten || '');
    if (allowedWarehouse) {
      const khoName = (khoData.ten_kho || '').toLowerCase();
      const allowedLower = allowedWarehouse.toLowerCase();
      if (!khoName.includes(allowedLower) && !allowedLower.includes(khoName)) {
        return NextResponse.json(
          { error: `Tài khoản của bạn chỉ được thao tác tại ${allowedWarehouse}. Kho được chọn là ${khoData.ten_kho}.` },
          { status: 403 }
        );
      }
    }

    // 2. Gọi RPC trừ kho
    const { data: rpcResult, error: rpcErr } = await supabase.rpc('adjust_inventory', {
      p_inventory_id: inventory_id,
      p_delta: -Math.abs(quantity), // Luôn trừ
      p_loai_hang: 'Đã mua'
    });

    if (rpcErr || !rpcResult?.success) {
      return NextResponse.json({
        success: false,
        error: 'Lỗi cập nhật tồn kho (Database): ' + (rpcErr?.message || 'Lỗi không xác định')
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      so_luong_cu: rpcResult.old_qty,
      so_luong_moi: rpcResult.new_qty,
    });

  } catch (err: any) {
    console.error('[inventory/deduct]', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi server' }, { status: 500 });
  }
}
