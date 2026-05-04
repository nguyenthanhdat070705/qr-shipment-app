import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();

    if (!body.member_id) {
      return NextResponse.json({ error: 'Missing member_id' }, { status: 400 });
    }

    const { error } = await supabase.from('care_logs').insert({
      member_id: body.member_id,
      contact_type: body.contact_type || 'call',
      notes: body.notes || '',
      staff_name: body.staff_name || '',
      contact_date: new Date().toISOString().slice(0, 10),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Care log error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
