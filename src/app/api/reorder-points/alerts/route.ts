import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { canManageReorder, getRequestEmail } from '@/lib/reorder/access';
import { evaluateReorderAlerts } from '@/lib/reorder/evaluator';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const email = getRequestEmail(req, req.nextUrl.searchParams.get('email'));
  if (!canManageReorder(email)) {
    return NextResponse.json({ error: 'Chỉ Admin và Thu mua được xem cảnh báo reorder point.' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  try {
    const evaluation = await evaluateReorderAlerts({ supabase, senderEmail: email });
    const { data: sets, error: setError } = await supabase
      .from('reorder_point_sets')
      .select('id, effective_month, source_file_name, uploaded_by, status, row_count, created_at, activated_at')
      .eq('status', 'active')
      .order('activated_at', { ascending: false })
      .limit(1);
    if (setError) throw new Error(setError.message);
    const activeSet = sets?.[0];
    if (!activeSet) return NextResponse.json({ active_set: null, data: [], evaluation });

    const [itemsResult, statesResult, homResult] = await Promise.all([
      supabase.from('reorder_point_items').select('hom_id, ma_hom, reorder_point').eq('set_id', activeSet.id),
      supabase.from('reorder_alert_states').select('*').eq('set_id', activeSet.id).order('status', { ascending: true }).order('available_quantity', { ascending: true }),
      supabase.from('dim_hom').select('id, ma_hom, ten_hom, ten_hom_the_hien').eq('is_active', true),
    ]);
    for (const result of [itemsResult, statesResult, homResult]) {
      if (result.error) throw new Error(result.error.message);
    }

    const homMap = new Map((homResult.data || []).map((hom: Record<string, string>) => [hom.id, hom]));
    const itemMap = new Map((itemsResult.data || []).map((item: Record<string, string | number>) => [item.hom_id, item]));
    const states: Record<string, unknown>[] = (statesResult.data || []).map((state: Record<string, unknown>) => {
      const hom = homMap.get(state.hom_id as string);
      const item = itemMap.get(state.hom_id as string);
      return {
        ...state,
        sku: state.ma_hom || item?.ma_hom || hom?.ma_hom || '—',
        product_name: hom?.ten_hom_the_hien || hom?.ten_hom || state.ma_hom || 'Chưa có tên',
        reorder_point: state.reorder_point ?? item?.reorder_point ?? 0,
      };
    });

    const poIds = [...new Set(states.map(state => state.linked_po_id).filter(Boolean) as string[])];
    const poResult = poIds.length > 0
      ? await supabase.from('fact_don_hang').select('id, ma_don_hang, trang_thai').in('id', poIds)
      : { data: [], error: null };
    if (poResult.error) throw new Error(poResult.error.message);
    const poMap = new Map((poResult.data || []).map((po: Record<string, string>) => [po.id, po]));

    return NextResponse.json({
      active_set: activeSet,
      evaluation,
      data: states.map(state => ({
        ...state,
        po_code: state.linked_po_id ? poMap.get(state.linked_po_id as string)?.ma_don_hang || null : null,
        po_status: state.linked_po_id ? poMap.get(state.linked_po_id as string)?.trang_thai || null : null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

