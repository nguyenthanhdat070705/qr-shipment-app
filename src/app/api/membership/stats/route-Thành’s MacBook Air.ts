import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Get stats - use explicit schema
    const { data: allMembers, error } = await supabase
      .from('members')
      .select('id, member_code, full_name, phone, status, registered_date, expiry_date');

    if (error) {
      console.error('Membership stats error detail:', JSON.stringify(error));
      return NextResponse.json({ 
        error: error.message, 
        hint: error.hint,
        details: error.details,
        code: error.code 
      }, { status: 500 });
    }

    const members = allMembers || [];
    const stats = {
      total: members.length,
      active: members.filter(m => m.status === 'active').length,
      pending: members.filter(m => m.status === 'pending').length,
      expired: members.filter(m => m.status === 'expired').length,
    };

    // Recent 5 sorted by most recent
    const recent = [...members].sort((a, b) => 
      (b.registered_date || '').localeCompare(a.registered_date || '')
    ).slice(0, 5);

    return NextResponse.json({ stats, recent });
  } catch (err) {
    console.error('Membership stats catch:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
