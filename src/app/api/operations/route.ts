import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * GET  /api/operations     → List delivery orders
 * POST /api/operations     → Create delivery order
 */

export async function GET() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('delivery_orders')
    .select(`
      *,
      warehouse:warehouses(*),
      items:delivery_order_items(*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { warehouse_id, customer_name, customer_phone, customer_address, note, delivery_date, created_by, items } = body as {
    warehouse_id?: string;
    customer_name?: string;
    customer_phone?: string;
    customer_address?: string;
    note?: string;
    delivery_date?: string;
    created_by: string;
    items?: { product_code: string; product_name: string; quantity: number; note?: string }[];
  };

  if (!created_by) {
    return NextResponse.json({ error: 'created_by là bắt buộc.' }, { status: 400 });
  }

  // Generate DO code
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const { count } = await supabase.from('delivery_orders').select('*', { count: 'exact', head: true });
  const seq = String((count || 0) + 1).padStart(3, '0');
  const do_code = `DO-${dateStr}-${seq}`;

  const { data: order, error: orderError } = await supabase
    .from('delivery_orders')
    .insert({
      do_code,
      warehouse_id: warehouse_id || null,
      customer_name: customer_name || null,
      customer_phone: customer_phone || null,
      customer_address: customer_address || null,
      note: note || null,
      delivery_date: delivery_date || null,
      created_by,
      status: 'pending',
    })
    .select()
    .single();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  if (items && items.length > 0) {
    const itemRows = items.map((item) => ({
      do_id: order.id,
      product_code: item.product_code,
      product_name: item.product_name,
      quantity: item.quantity,
      note: item.note || null,
    }));

    const { error: itemsError } = await supabase.from('delivery_order_items').insert(itemRows);
    if (itemsError) console.error('[operations] Items insert error:', itemsError);
  }

  return NextResponse.json({ data: order, do_code }, { status: 201 });
}
