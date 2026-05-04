import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // Get member
    const { data: member, error: mErr } = await supabase
      .from('members').select('*').eq('id', id).single();
    if (mErr) return NextResponse.json({ error: mErr.message }, { status: 404 });

    // Get beneficiaries
    const { data: beneficiaries } = await supabase
      .from('beneficiaries').select('*').eq('member_id', id);

    // Get care logs
    const { data: care_logs } = await supabase
      .from('care_logs').select('*').eq('member_id', id).order('contact_date', { ascending: false });

    return NextResponse.json({ member, beneficiaries: beneficiaries || [], care_logs: care_logs || [] });
  } catch (err) {
    console.error('Member detail error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { id, updates } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // Only allow updating specific fields
    const allowed = ['full_name', 'phone', 'email', 'id_number', 'address', 'status', 'notes', 'consultant_name', 'branch', 'service_package', 'contract_number', 'payment_method'];
    const clean: Record<string, string> = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) clean[key] = updates[key];
    }
    clean.updated_at = new Date().toISOString();

    const { error } = await supabase.from('members').update(clean).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Member update error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
