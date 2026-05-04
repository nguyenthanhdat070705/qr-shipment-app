import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET    /api/stocktake/[id]   → Get stocktake detail with items
 * PUT    /api/stocktake/[id]   → Update stocktake items (save counts)
 * DELETE /api/stocktake/[id]   → Cancel stocktake
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    // Fetch header
    const { data: header, error: headerError } = await supabase
      .from('fact_kiem_kho')
      .select('*')
      .eq('id', id)
      .single();

    if (headerError || !header) {
      return NextResponse.json({ error: 'Không tìm thấy phiếu kiểm kho.' }, { status: 404 });
    }

    // Fetch warehouse name
    let tenKho = '';
    if (header.kho_id) {
      const { data: kho } = await supabase
        .from('dim_kho')
        .select('ten_kho')
        .eq('id', header.kho_id)
        .single();
      tenKho = kho?.ten_kho || '';
    }

    // Fetch items
    const { data: items, error: itemsError } = await supabase
      .from('fact_kiem_kho_items')
      .select('*')
      .eq('kiem_kho_id', id)
      .order('ma_hom', { ascending: true });

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        ...header,
        ten_kho: tenKho,
        items: items || [],
      },
    });
  } catch (err: any) {
    console.error('[stocktake GET detail]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { action, items, note } = body as {
      action?: 'save' | 'complete' | 'adjust';
      items?: { id: string; so_luong_thuc_te: number; ghi_chu?: string; trang_thai?: string }[];
      note?: string;
    };

    // Update items if provided
    if (items && items.length > 0) {
      for (const item of items) {
        const updateData: any = {
          so_luong_thuc_te: item.so_luong_thuc_te,
          trang_thai: item.trang_thai || 'checked',
        };
        if (item.ghi_chu !== undefined) updateData.ghi_chu = item.ghi_chu;

        await supabase
          .from('fact_kiem_kho_items')
          .update(updateData)
          .eq('id', item.id);
      }
    }

    // Recalculate totals
    const { data: allItems } = await supabase
      .from('fact_kiem_kho_items')
      .select('*')
      .eq('kiem_kho_id', id);

    const totalChecked = (allItems || []).filter((i: any) => i.trang_thai !== 'pending').length;
    const totalDiff = (allItems || []).filter(
      (i: any) => i.trang_thai !== 'pending' && i.so_luong_thuc_te !== i.so_luong_he_thong
    ).length;

    const headerUpdate: any = {
      tong_loai_kiem: totalChecked,
      tong_lech: totalDiff,
      updated_at: new Date().toISOString(),
    };
    if (note !== undefined) headerUpdate.ghi_chu = note;

    // Handle action
    if (action === 'complete') {
      headerUpdate.trang_thai = 'completed';
    } else if (action === 'adjust') {
      // Adjust inventory based on stocktake results
      headerUpdate.trang_thai = 'completed';

      // Only adjust items that have been checked and have variance
      const itemsToAdjust = (allItems || []).filter(
        (i: any) => i.trang_thai === 'checked' && i.so_luong_thuc_te !== i.so_luong_he_thong
      );

      const { data: headerData } = await supabase
        .from('fact_kiem_kho')
        .select('kho_id')
        .eq('id', id)
        .single();

      if (headerData?.kho_id && itemsToAdjust.length > 0) {
        for (const item of itemsToAdjust) {
          if (!item.hom_id) continue;

          // Find existing inventory row
          const { data: invData } = await supabase
            .from('fact_inventory')
            .select('*')
            .eq('Tên hàng hóa', item.hom_id)
            .eq('Kho', headerData.kho_id);

          if (invData && invData.length > 0) {
            const invRow = invData[0];
            const diff = item.so_luong_thuc_te - item.so_luong_he_thong;
            const newQty = Math.max(0, (Number(invRow['Số lượng']) || 0) + diff);
            const newKhadung = Math.max(0, (Number(invRow['Ghi chú']) || 0) + diff);

            await supabase.from('fact_inventory').delete().eq('Mã', invRow['Mã']);
            await supabase.from('fact_inventory').insert({
              'Mã': invRow['Mã'],
              'Tên hàng hóa': invRow['Tên hàng hóa'],
              'Kho': invRow['Kho'],
              'Số lượng': newQty,
              'Ghi chú': newKhadung,
              'Loại hàng': invRow['Loại hàng'],
            });
          }

          // Mark item as adjusted
          await supabase
            .from('fact_kiem_kho_items')
            .update({ trang_thai: 'adjusted' })
            .eq('id', item.id);
        }
      }
    }

    await supabase
      .from('fact_kiem_kho')
      .update(headerUpdate)
      .eq('id', id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[stocktake PUT]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    // Soft cancel — don't delete data
    const { error } = await supabase
      .from('fact_kiem_kho')
      .update({ trang_thai: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[stocktake DELETE]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
