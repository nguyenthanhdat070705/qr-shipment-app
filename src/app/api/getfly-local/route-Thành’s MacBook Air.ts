import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const perPage = parseInt(req.nextUrl.searchParams.get('per_page') || '20');
    const search = req.nextUrl.searchParams.get('search') || '';

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
      .from('getfly_customers')
      .select('*', { count: 'exact' })
      .order('synced_at', { ascending: false })
      .range(from, to);

    if (search) {
      query = query.or(
        `account_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('getfly-local error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      records: data || [],
      total: count || 0,
      page,
      per_page: perPage,
    });
  } catch (err) {
    console.error('getfly-local error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
