import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('commission_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // Table might not exist yet
      if (error.code === 'PGRST205') {
        return NextResponse.json({ records: [], message: 'commission_records table not created yet' });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ records: data || [] });
  } catch (err) {
    console.error('Commission list error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { id, action } = await req.json();

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
    }

    if (action === 'confirm') {
      const { error } = await supabase
        .from('commission_records')
        .update({ status: 'confirmed', approved_by: 'admin' })
        .eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else if (action === 'pay') {
      const { error } = await supabase
        .from('commission_records')
        .update({ status: 'paid', paid_date: new Date().toISOString().slice(0, 10) })
        .eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Commission update error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
