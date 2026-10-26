import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { canManageReorder, getRequestEmail } from '@/lib/reorder/access';
import { evaluateReorderAlerts } from '@/lib/reorder/evaluator';
import { hashRows, normalizeEffectiveMonth, validateReorderRows } from '@/lib/reorder/validation';
import type { ReorderImportRow } from '@/lib/reorder/types';

export const dynamic = 'force-dynamic';

interface ImportBody {
  action?: 'validate' | 'activate';
  email?: string;
  source_file_name?: string;
  effective_month?: string;
  rows?: ReorderImportRow[];
}

export async function POST(req: NextRequest) {
  let body: ImportBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const email = getRequestEmail(req, body.email);
  if (!canManageReorder(email)) {
    return NextResponse.json({ error: 'Chỉ Admin và Thu mua được import reorder point.' }, { status: 403 });
  }

  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: 'File không có dòng dữ liệu reorder point.' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: catalog, error: catalogError } = await supabase
    .from('dim_hom')
    .select('id, ma_hom, ten_hom, ten_hom_the_hien')
    .eq('is_active', true);

  if (catalogError) return NextResponse.json({ error: catalogError.message }, { status: 500 });

  const validation = validateReorderRows(body.rows, catalog || []);
  const response = {
    ...validation,
    source_file_name: body.source_file_name || 'reorder-point.xlsx',
    effective_month: normalizeEffectiveMonth(body.effective_month),
  };

  if (body.action !== 'activate') {
    return NextResponse.json(response);
  }

  if (!validation.valid) {
    return NextResponse.json({ error: 'File chưa hợp lệ, chưa thể activate.', validation: response }, { status: 422 });
  }

  const canonicalRows = hashRows(validation.rows);
  const sourceHash = crypto.createHash('sha256').update(canonicalRows).digest('hex');
  const { data: newSet, error: setError } = await supabase
    .from('reorder_point_sets')
    .insert({
      effective_month: response.effective_month,
      source_file_name: response.source_file_name,
      uploaded_by: email,
      status: 'draft',
      row_count: validation.rows.length,
      source_hash: sourceHash,
      source_rows: body.rows,
    })
    .select('id')
    .single();

  if (setError || !newSet) {
    return NextResponse.json({ error: setError?.message || 'Không tạo được bộ reorder point.' }, { status: 500 });
  }

  const itemRows = validation.rows.map(row => ({
    set_id: newSet.id,
    hom_id: row.hom_id,
    ma_hom: row.ma_hom,
    safety_stock: row.safety_stock,
    movement: row.movement,
    reorder_point: row.reorder_point,
    description_snapshot: row.description,
    source_row: row.source_row,
  }));

  const { error: itemError } = await supabase.from('reorder_point_items').insert(itemRows);
  if (itemError) {
    await supabase.from('reorder_point_sets').delete().eq('id', newSet.id);
    return NextResponse.json({ error: itemError.message }, { status: 500 });
  }

  const { error: supersedeError } = await supabase
    .from('reorder_point_sets')
    .update({ status: 'superseded' })
    .eq('status', 'active');
  if (supersedeError) {
    await supabase.from('reorder_point_sets').delete().eq('id', newSet.id);
    return NextResponse.json({ error: supersedeError.message }, { status: 500 });
  }

  await supabase
    .from('reorder_alert_states')
    .update({ status: 'superseded', resolved_at: new Date().toISOString() })
    .eq('status', 'open');
  await supabase
    .from('reorder_alert_states')
    .update({ status: 'superseded', resolved_at: new Date().toISOString() })
    .eq('status', 'po_pending');

  const { error: activateError } = await supabase
    .from('reorder_point_sets')
    .update({ status: 'active', activated_at: new Date().toISOString() })
    .eq('id', newSet.id);
  if (activateError) {
    return NextResponse.json({ error: activateError.message }, { status: 500 });
  }

  let evaluation;
  try {
    evaluation = await evaluateReorderAlerts({ supabase, senderEmail: email });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: true,
      warning: `Đã activate file nhưng chưa chạy được đánh giá tồn kho: ${message}`,
      validation: response,
      set_id: newSet.id,
    });
  }

  return NextResponse.json({ success: true, validation: response, set_id: newSet.id, evaluation });
}

