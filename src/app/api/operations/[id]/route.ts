import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * GET   /api/operations/[id]  → Detail with items
 * PATCH /api/operations/[id]  → Update status
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('delivery_orders')
    .select(`
      *,
      warehouse:warehouses(*),
      items:delivery_order_items(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  let body: { status: string; assigned_to?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validStatuses = ['pending', 'assigned', 'in_transit', 'delivered', 'cancelled'];
  if (!validStatuses.includes(body.status)) {
    return NextResponse.json({ error: `Trạng thái không hợp lệ: ${body.status}` }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { status: body.status };
  if (body.assigned_to) updateData.assigned_to = body.assigned_to;

  const { data, error } = await supabase
    .from('delivery_orders')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
