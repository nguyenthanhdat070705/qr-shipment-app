import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

const GETFLY_API_KEY = 'UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1';
const GETFLY_BASE = 'https://blackstonesdvtl.getflycrm.com/api/v3';

async function fetchAllAccounts(): Promise<Record<string, unknown>[]> {
  const allRecords: Record<string, unknown>[] = [];
  let page = 1;
  const perPage = 50;

  while (true) {
    const url = new URL(`${GETFLY_BASE}/accounts`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(perPage));

    const res = await fetch(url.toString(), {
      headers: { 'X-API-KEY': GETFLY_API_KEY },
      cache: 'no-store',
    });
    const data = await res.json();
    const records: Record<string, unknown>[] = data.records || [];

    // Log tiến trình
    const total = data.total_record ? parseInt(String(data.total_record), 10) : '?';
    console.log(`[Sync GetFly] Page ${page}: got ${records.length} records | Total so far: ${allRecords.length + records.length} / ${total}`);

    if (records.length === 0) break;
    allRecords.push(...records);

    // Đã lấy đủ theo tổng từ API
    if (data.total_record && allRecords.length >= parseInt(String(data.total_record), 10)) break;

    // Trang cuối (ít hơn perPage)
    if (records.length < perPage) break;

    // Hard safety: 200 trang = tối đa 10,000 bản ghi
    if (page >= 200) {
      console.warn('[Sync GetFly] Hit 200-page safety limit, stopping.');
      break;
    }

    page++;
  }

  return allRecords;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    console.log('[Sync GetFly] Fetching all accounts...');
    const accounts = await fetchAllAccounts();
    console.log(`[Sync GetFly] Fetched ${accounts.length} accounts from GetFly`);

    if (accounts.length === 0) {
      return NextResponse.json({ success: true, synced: 0, message: 'No accounts found in GetFly' });
    }

    // Map GetFly accounts to our table structure
    const rows = accounts.map((a) => ({
      getfly_id: String(a.account_id),
      account_name: (a.account_name as string) || null,
      phone: (a.phone as string) || null,
      email: (a.email as string) || null,
      address: (a.address as string) || null,
      province_name: (a.province_name as string) || null,
      account_type: (a.account_type as string) || null,
      account_source: (a.account_source as string) || null,
      relation_name: (a.relation_name as string) || null,
      manager_user_name: (a.manager_user_name as string) || null,
      revenue: (a.revenue as string) || null,
      ma_hoi_vien: (a.ma_hoi_vien as string) || null,
      goi_dich_vu: (a.goi_dich_vu as string) || null,
      getfly_created_at: (a.created_at as string) || null,
      synced_at: new Date().toISOString(),
    }));

    // Batch upsert in chunks of 200 to avoid payload limits
    const chunkSize = 200;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase
        .from('getfly_customers')
        .upsert(chunk, { onConflict: 'getfly_id', ignoreDuplicates: false });

      if (error) {
        console.error('[Sync GetFly] Upsert error at chunk', i, error);
        return NextResponse.json({ error: error.message, hint: error.hint }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      synced: rows.length,
      message: `Đã sync ${rows.length} khách hàng từ GetFly vào hệ thống`,
    });
  } catch (err) {
    console.error('[Sync GetFly] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error, count } = await supabase
      .from('getfly_customers')
      .select('*', { count: 'exact' })
      .order('synced_at', { ascending: false })
      .limit(1);

    if (error) {
      return NextResponse.json({ synced: 0, last_sync: null, error: error.message });
    }

    return NextResponse.json({
      synced_count: count || 0,
      last_sync: data?.[0]?.synced_at || null,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
