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

  const { ma_hom, quantity = 1 } = body;
  if (!ma_hom) {
    return NextResponse.json({ success: false, error: 'Thiếu ma_hom' }, { status: 400 });
  }

  try {
    // 1. Tìm dim_hom.id từ ma_hom
    const { data: hom, error: homErr } = await supabase
      .from('dim_hom')
      .select('id, ma_hom, ten_hom')
      .eq('ma_hom', ma_hom.trim())
      .single();

    if (homErr || !hom) {
      return NextResponse.json({ success: false, error: `Không tìm thấy sản phẩm mã ${ma_hom}` }, { status: 404 });
    }

    // 2. Lấy TẤT CẢ rows tồn kho của sản phẩm này
    const { data: rows, error: rowsErr } = await supabase
      .from('fact_inventory')
      .select('*')
      .eq('Tên hàng hóa', hom.id);

    if (rowsErr) {
      return NextResponse.json({ success: false, error: 'Lỗi lấy tồn kho: ' + rowsErr.message }, { status: 500 });
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy tồn kho cho sản phẩm này' }, { status: 404 });
    }

    // 3. Tìm row có số lượng cao nhất và > 0
    const validRows = rows
      .map((r: any) => ({ ...r, _qty: Number(r['Số lượng']) || 0 }))
      .filter((r: any) => r._qty > 0)
      .sort((a: any, b: any) => b._qty - a._qty);

    if (validRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Hết hàng trong kho' }, { status: 400 });
    }

    const target = validRows[0] as any;
    const rowId = target['Mã'];
    const currentQty = target._qty;
    const newQty = Math.max(0, currentQty - quantity);

    // 4. Cập nhật trực tiếp bằng primary key "Mã"
    const { error: updateErr } = await supabase
      .from('fact_inventory')
      .update({
        'Số lượng': newQty,
        'Ghi chú': newQty,
      })
      .eq('Mã', rowId);

    if (updateErr) {
      return NextResponse.json({
        success: false,
        error: 'Lỗi cập nhật tồn kho: ' + updateErr.message
      }, { status: 500 });
    }

    // 5. Lấy tên kho để trả về
    let khoName = '—';
    if (target['Kho']) {
      const { data: kho } = await supabase
        .from('dim_kho')
        .select('ten_kho')
        .eq('id', target['Kho'])
        .single();
      if (kho) khoName = kho.ten_kho;
    }

    return NextResponse.json({
      success: true,
      ma_hom: hom.ma_hom,
      ten_hom: hom.ten_hom,
      kho: khoName,
      so_luong_cu: currentQty,
      so_luong_moi: newQty,
    });

  } catch (err: any) {
    console.error('[inventory/deduct]', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi server' }, { status: 500 });
  }
}
