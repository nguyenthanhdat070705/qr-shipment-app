import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * GET    /api/purchase-orders/[id]   → Detail with items
 * PUT    /api/purchase-orders/[id]   → Update PO
 * PATCH  /api/purchase-orders/[id]   → Update status only
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      supplier:suppliers(*),
      warehouse:warehouses(*),
      items:purchase_order_items(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 });
  }

  return NextResponse.json({ data });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { supplier_id, warehouse_id, note, expected_date } = body;

  const { data, error } = await supabase
    .from('purchase_orders')
    .update({
      supplier_id: supplier_id || null,
      warehouse_id: warehouse_id || null,
      note: note || null,
      expected_date: expected_date || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  let body: { status: string; approved_by?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validStatuses = ['draft', 'submitted', 'approved', 'received', 'closed', 'cancelled'];
  if (!validStatuses.includes(body.status)) {
    return NextResponse.json({ error: `Trạng thái không hợp lệ: ${body.status}` }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { status: body.status };
  if (body.status === 'approved' && body.approved_by) {
    updateData.approved_by = body.approved_by;
  }

  const { data, error } = await supabase
    .from('purchase_orders')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
