import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const perPage = parseInt(req.nextUrl.searchParams.get('per_page') || '20');
    const search = req.nextUrl.searchParams.get('search') || '';
    const status = req.nextUrl.searchParams.get('status') || '';

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
      .from('getfly_contracts')
      .select('*', { count: 'exact' })
      .order('synced_at', { ascending: false })
      .range(from, to);

    // Search filter
    if (search) {
      query = query.or(
        `contract_name.ilike.%${search}%,contract_code.ilike.%${search}%,customer_name.ilike.%${search}%,beneficiary_name_1.ilike.%${search}%,beneficiary_name_2.ilike.%${search}%`
      );
    }

    // Status filter
    if (status && status !== 'all') {
      query = query.eq('contract_status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('getfly-contracts error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      records: data || [],
      total: count || 0,
      page,
      per_page: perPage,
    });
  } catch (err) {
    console.error('getfly-contracts error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
