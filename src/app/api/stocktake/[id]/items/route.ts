import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/stocktake/[id]/items
 * Quick-update a single item count (for scan-and-count workflow)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { ma_hom, so_luong_thuc_te, ghi_chu, mode } = body as {
      ma_hom: string;
      so_luong_thuc_te?: number;
      ghi_chu?: string;
      mode?: 'set' | 'increment'; // 'set' = replace, 'increment' = add to current
    };

    if (!ma_hom) {
      return NextResponse.json({ error: 'ma_hom là bắt buộc.' }, { status: 400 });
    }

    // Verify stocktake session exists and is in_progress
    const { data: header } = await supabase
      .from('fact_kiem_kho')
      .select('id, trang_thai')
      .eq('id', id)
      .single();

    if (!header) {
      return NextResponse.json({ error: 'Phiếu kiểm kho không tồn tại.' }, { status: 404 });
    }
    if (header.trang_thai !== 'in_progress') {
      return NextResponse.json({ error: 'Phiếu kiểm kho đã hoàn thành hoặc bị hủy.' }, { status: 400 });
    }

    // Find the item in this stocktake
    const { data: item } = await supabase
      .from('fact_kiem_kho_items')
      .select('*')
      .eq('kiem_kho_id', id)
      .eq('ma_hom', ma_hom)
      .maybeSingle();

    if (!item) {
      return NextResponse.json({ error: `Không tìm thấy mã hòm "${ma_hom}" trong phiếu kiểm kho.` }, { status: 404 });
    }

    // Calculate new quantity
    let newQty = so_luong_thuc_te ?? 0;
    if (mode === 'increment') {
      newQty = (item.trang_thai === 'pending' ? 0 : Number(item.so_luong_thuc_te || 0)) + (so_luong_thuc_te ?? 1);
    }

    const updateData: any = {
      so_luong_thuc_te: Math.max(0, newQty),
      trang_thai: 'checked',
    };
    if (ghi_chu !== undefined) updateData.ghi_chu = ghi_chu;

    const { error: updateErr } = await supabase
      .from('fact_kiem_kho_items')
      .update(updateData)
      .eq('id', item.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Return updated item
    const { data: updated } = await supabase
      .from('fact_kiem_kho_items')
      .select('*')
      .eq('id', item.id)
      .single();

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (err: any) {
    console.error('[stocktake PATCH item]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
