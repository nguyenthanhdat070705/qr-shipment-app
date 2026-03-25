import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * GET  /api/purchase-orders         → List all POs
 * POST /api/purchase-orders         → Create new PO
 */

export async function GET() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      supplier:suppliers(*),
      warehouse:warehouses(*)
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

  const { supplier_id, warehouse_id, note, created_by, expected_date, items } = body as {
    supplier_id?: string;
    warehouse_id?: string;
    note?: string;
    created_by: string;
    expected_date?: string;
    items?: { product_code: string; product_name: string; quantity: number; unit_price: number; note?: string }[];
  };

  if (!created_by) {
    return NextResponse.json({ error: 'created_by là bắt buộc.' }, { status: 400 });
  }

  // Generate PO code: PO-YYYYMMDD-XXX
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const { count } = await supabase.from('purchase_orders').select('*', { count: 'exact', head: true });
  const seq = String((count || 0) + 1).padStart(3, '0');
  const po_code = `PO-${dateStr}-${seq}`;

  // Calculate total
  const totalAmount = (items || []).reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  // Insert PO
  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .insert({
      po_code,
      supplier_id: supplier_id || null,
      warehouse_id: warehouse_id || null,
      note: note || null,
      created_by,
      expected_date: expected_date || null,
      total_amount: totalAmount,
      status: 'draft',
    })
    .select()
    .single();

  if (poError) {
    return NextResponse.json({ error: poError.message }, { status: 500 });
  }

  // Insert items
  if (items && items.length > 0) {
    const itemRows = items.map((item) => ({
      po_id: po.id,
      product_code: item.product_code,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      note: item.note || null,
    }));

    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .insert(itemRows);

    if (itemsError) {
      console.error('[purchase-orders] Items insert error:', itemsError);
    }
  }

  return NextResponse.json({ data: po, po_code }, { status: 201 });
}
