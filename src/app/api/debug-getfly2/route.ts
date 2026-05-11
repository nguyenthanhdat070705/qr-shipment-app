import { NextResponse } from 'next/server';

const GETFLY_API_KEY = process.env.GETFLY_API_KEY || 'UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1';
const GETFLY_BASE = 'https://blackstonesdvtl.getflycrm.com/api/v3';

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Get account detail with membership fields
  // Try to find an account that has ma_hoi_vien or goi_dich_vu populated
  try {
    const r1 = await fetch(`${GETFLY_BASE}/accounts?per_page=10&page=1`, {
      headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
      cache: 'no-store',
    });
    const d1 = await r1.json();
    const recs = d1.records || d1.data || [];
    
    // Find accounts with membership data
    const memberships = recs.filter((r: any) => 
      r.ma_hoi_vien || r.goi_dich_vu || r.trang_thai_hoi_vien
    );
    
    results['all_fields_in_account'] = recs.length > 0 ? Object.keys(recs[0]) : [];
    results['total_accounts'] = d1.pagination?.total_record || d1.total_record;
    results['first_10_accounts'] = recs.map((r: any) => ({
      account_id: r.account_id,
      account_name: r.account_name,
      phone: r.phone,
      ma_hoi_vien: r.ma_hoi_vien,
      goi_dich_vu: r.goi_dich_vu,
      trang_thai_hoi_vien: r.trang_thai_hoi_vien,
      so_cccd: r.so_cccd,
    }));
    results['accounts_with_membership'] = memberships.length;
  } catch (e: any) {
    results['accounts'] = { error: e.message };
  }

  // 2. Get single account detail with ID
  try {
    const r2 = await fetch(`${GETFLY_BASE}/accounts/1`, {
      headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
      cache: 'no-store',
    });
    const d2 = await r2.json();
    results['account_detail_1'] = {
      status: r2.status,
      all_fields: d2.records ? Object.keys(d2.records[0] || {}) : Object.keys(d2),
      data: d2,
    };
  } catch (e: any) {
    results['account_detail_1'] = { error: e.message };
  }

  // 3. Search accounts with membership
  try {
    const r3 = await fetch(`${GETFLY_BASE}/accounts?per_page=5&trang_thai_hoi_vien=1`, {
      headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
      cache: 'no-store',
    });
    const d3 = await r3.json();
    const recs3 = d3.records || d3.data || [];
    results['membership_accounts'] = {
      total: d3.pagination?.total_record || d3.total_record,
      count: recs3.length,
      records: recs3.slice(0, 3),
    };
  } catch (e: any) {
    results['membership_accounts'] = { error: e.message };
  }

  // 4. Check order with items / products
  try {
    const r4 = await fetch(`${GETFLY_BASE}/orders/1842`, {
      headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
      cache: 'no-store',
    });
    const d4 = await r4.json();
    results['latest_order_detail'] = d4;
  } catch (e: any) {
    results['latest_order_detail'] = { error: e.message };
  }

  // 5. Check if there's an attachment/file API
  try {
    const r5 = await fetch(`${GETFLY_BASE}/files?per_page=5`, {
      headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
      cache: 'no-store',
    });
    const text5 = await r5.text();
    results['files_endpoint'] = {
      status: r5.status,
      response: text5.substring(0, 500),
    };
  } catch (e: any) {
    results['files_endpoint'] = { error: e.message };
  }

  // 6. Check notes/documents API
  try {
    const r6 = await fetch(`${GETFLY_BASE}/documents?per_page=5`, {
      headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
      cache: 'no-store',
    });
    const text6 = await r6.text();
    results['documents_endpoint'] = {
      status: r6.status,
      response: text6.substring(0, 500),
    };
  } catch (e: any) {
    results['documents_endpoint'] = { error: e.message };
  }

  return NextResponse.json(results, { status: 200 });
}
