import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { canManageReorder, getRequestEmail } from '@/lib/reorder/access';
import { evaluateReorderAlerts } from '@/lib/reorder/evaluator';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const email = getRequestEmail(req, req.nextUrl.searchParams.get('email'));
  if (!canManageReorder(email)) {
    return NextResponse.json({ error: 'Chỉ Admin và Thu mua được xem quản lý reorder point.' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('reorder_point_sets')
    .select('id, effective_month, source_file_name, uploaded_by, status, row_count, source_hash, source_rows, created_at, activated_at')
    .order('created_at', { ascending: false })
    .limit(24);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data || [] });
}

export async function POST(req: NextRequest) {
  const email = getRequestEmail(req);
  if (!canManageReorder(email)) {
    return NextResponse.json({ error: 'Chỉ Admin và Thu mua được chạy đánh giá reorder point.' }, { status: 403 });
  }

  try {
    const summary = await evaluateReorderAlerts({ senderEmail: email || 'system' });
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

