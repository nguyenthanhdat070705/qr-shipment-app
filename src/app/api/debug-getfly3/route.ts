import { NextResponse } from 'next/server';

const GETFLY_API_KEY = process.env.GETFLY_API_KEY || '';
const GETFLY_BASE = 'https://blackstonesdvtl.getflycrm.com';

export async function GET() {
  const results: Record<string, unknown> = {};
  const headers = { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' };

  // 1. API v6 - Custom fields definition (what fields exist including image type)
  try {
    const r1 = await fetch(`${GETFLY_BASE}/api/v6/accounts/custom_fields`, {
      headers, cache: 'no-store',
    });
    const d1 = await r1.json();
    results['v6_custom_fields'] = { status: r1.status, data: d1 };
  } catch (e: any) { results['v6_custom_fields'] = { error: e.message }; }

  // 2. API v6 - Account detail (with custom_fields)
  try {
    const r2 = await fetch(`${GETFLY_BASE}/api/v6/accounts/10?fields=account_name,custom_fields,phone,email`, {
      headers, cache: 'no-store',
    });
    const d2 = await r2.json();
    results['v6_account_detail_10'] = { status: r2.status, data: d2 };
  } catch (e: any) { results['v6_account_detail_10'] = { error: e.message }; }

  // 3. API v6 - Account comments (where files are likely attached)
  try {
    const r3 = await fetch(`${GETFLY_BASE}/api/v6/accounts/10/comments?limit=5`, {
      headers, cache: 'no-store',
    });
    const d3 = await r3.json();
    results['v6_account_10_comments'] = { status: r3.status, data: d3 };
  } catch (e: any) { results['v6_account_10_comments'] = { error: e.message }; }

  // 4. API v6 - Order contracts list
  try {
    const r4 = await fetch(`${GETFLY_BASE}/api/v6/order_contracts?limit=3`, {
      headers, cache: 'no-store',
    });
    const d4 = await r4.json();
    results['v6_order_contracts'] = { status: r4.status, data: d4 };
  } catch (e: any) { results['v6_order_contracts'] = { error: e.message }; }

  // 5. Try to find an account with membership data by checking recent accounts
  try {
    const r5 = await fetch(`${GETFLY_BASE}/api/v6/accounts?limit=5&offset=0&sorting[created_at]=desc`, {
      headers, cache: 'no-store',
    });
    const d5 = await r5.json();
    results['v6_latest_accounts'] = { status: r5.status, data: d5 };
  } catch (e: any) { results['v6_latest_accounts'] = { error: e.message }; }

  // 6. API v6 - Account detail for a recent one (likely to have uploads)
  try {
    const r6 = await fetch(`${GETFLY_BASE}/api/v6/accounts/17223`, {
      headers, cache: 'no-store',
    });
    const d6 = await r6.json();
    results['v6_account_17223_full'] = { status: r6.status, data: d6 };
  } catch (e: any) { results['v6_account_17223_full'] = { error: e.message }; }

  // 7. Check account comments for a recent account
  try {
    const r7 = await fetch(`${GETFLY_BASE}/api/v6/accounts/17223/comments?limit=10`, {
      headers, cache: 'no-store',
    });
    const d7 = await r7.json();
    results['v6_account_17223_comments'] = { status: r7.status, data: d7 };
  } catch (e: any) { results['v6_account_17223_comments'] = { error: e.message }; }

  return NextResponse.json(results, { status: 200 });
}
