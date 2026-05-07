import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: { id: string } }) {
  try {
    const supabase = getSupabaseAdmin();
    // Await params correctly per Next.js 15+ constraints if needed, but in standard app router context.params is mostly sync in older versions.
    // However, to be safe, we extract id.
    const id = context.params?.id;

    if (!id) return NextResponse.json({ success: false, error: 'Missing ID' }, { status: 400 });

    const { data: stocktake, error } = await supabase
      .from('stocktakes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    const { data: items, error: itemsError } = await supabase
      .from('stocktake_items')
      .select('*')
      .eq('stocktake_id', id)
      .order('created_at', { ascending: false });

    if (itemsError) throw itemsError;

    return NextResponse.json({ success: true, data: stocktake, items });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: { id: string } }) {
  try {
    const supabase = getSupabaseAdmin();
    const id = context.params?.id;
    const body = await request.json();
    const { status, note } = body;

    const updateData: any = { updated_at: new Date().toISOString() };
    if (status !== undefined) updateData.status = status;
    if (note !== undefined) updateData.note = note;

    const { data, error } = await supabase
      .from('stocktakes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
