import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * GET /api/getfly-accounts?page=1&per_page=20&search=...
 * Returns paginated list of accounts from getfly_accounts table
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') || '20', 10);
    const search = url.searchParams.get('search') || '';
    const filter = url.searchParams.get('filter') || ''; // 'members_only', 'with_cccd', etc.

    let query = supabase
      .from('getfly_accounts')
      .select('*', { count: 'exact' });

    // Search
    if (search) {
      query = query.or(
        `account_name.ilike.%${search}%,phone.ilike.%${search}%,so_cccd.ilike.%${search}%,ma_hoi_vien.ilike.%${search}%,contact_name.ilike.%${search}%`
      );
    }

    // Filters
    if (filter === 'members_only') {
      query = query.not('ma_hoi_vien', 'is', null);
    } else if (filter === 'with_cccd') {
      query = query.not('so_cccd', 'is', null);
    } else if (filter === 'with_docs') {
      query = query.not('gdrive_folder_id', 'is', null);
    }

    // Pagination
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data, count, error } = await query
      .order('synced_at', { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enrich with upload status from raw_data
    const records = (data || []).map((acc: any) => {
      const raw = acc.raw_data || {};
      return {
        ...acc,
        // Remove heavy raw_data from list response
        raw_data: undefined,
        // Upload status flags
        has_vneid_front: !!raw._uploaded_vneid_front_file_id,
        has_vneid_back: !!raw._uploaded_vneid_back_file_id,
        has_contract_scan: !!raw._uploaded_contract_scan_file_id,
        has_membership_form: !!raw._uploaded_membership_form_file_id,
        // Upload URLs
        vneid_front_url: raw._uploaded_vneid_front_url || null,
        vneid_back_url: raw._uploaded_vneid_back_url || null,
        contract_scan_url: raw._uploaded_contract_scan_url || null,
        membership_form_url: raw._uploaded_membership_form_url || null,
      };
    });

    return NextResponse.json({
      records,
      total: count || 0,
      page,
      per_page: perPage,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
