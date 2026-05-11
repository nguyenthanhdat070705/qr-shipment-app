import { NextResponse } from 'next/server';

const GETFLY_API_KEY = process.env.GETFLY_API_KEY || 'UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1';
const GETFLY_BASE = 'https://blackstonesdvtl.getflycrm.com/api/v3';

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Get single order detail (order 332)
  try {
    const r1 = await fetch(`${GETFLY_BASE}/orders/332`, {
      headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
      cache: 'no-store',
    });
    results['order_detail_332'] = {
      status: r1.status,
      data: await r1.json(),
    };
  } catch (e: any) {
    results['order_detail_332'] = { error: e.message };
  }

  // 2. Get accounts
  try {
    const r2 = await fetch(`${GETFLY_BASE}/accounts?per_page=2`, {
      headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
      cache: 'no-store',
    });
    const d2 = await r2.json();
    const recs = d2.records || d2.data || [];
    results['accounts'] = {
      status: r2.status,
      total: d2.pagination?.total_record,
      fields: recs.length > 0 ? Object.keys(recs[0]) : [],
      first_record: recs[0] || null,
    };
  } catch (e: any) {
    results['accounts'] = { error: e.message };
  }

  // 3. Get custom fields
  try {
    const r3 = await fetch(`${GETFLY_BASE}/custom_fields?per_page=100`, {
      headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
      cache: 'no-store',
    });
    results['custom_fields'] = {
      status: r3.status,
      data: await r3.json(),
    };
  } catch (e: any) {
    results['custom_fields'] = { error: e.message };
  }

  // 4. Check contracts endpoint
  try {
    const r4 = await fetch(`${GETFLY_BASE}/contracts?per_page=2`, {
      headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
      cache: 'no-store',
    });
    results['contracts_endpoint'] = {
      status: r4.status,
      data: await r4.json(),
    };
  } catch (e: any) {
    results['contracts_endpoint'] = { error: e.message };
  }

  // 5. Latest order with most fields
  try {
    const r5 = await fetch(`${GETFLY_BASE}/orders?order_type=2&per_page=1&page=1`, {
      headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
      cache: 'no-store',
    });
    const d5 = await r5.json();
    const rec = (d5.records || d5.data || [])[0];
    if (rec) {
      results['latest_order'] = {
        all_fields: Object.keys(rec),
        image_related_fields: Object.keys(rec).filter((f: string) =>
          /image|anh|hinh|photo|file|url|attach|vneid|scan|front|back|mat_truoc|mat_sau|avatar|custom|upload/i.test(f)
        ),
        record: rec,
      };
    }
  } catch (e: any) {
    results['latest_order'] = { error: e.message };
  }

  return NextResponse.json(results, { status: 200 });
}
