import { NextResponse } from 'next/server';

const GETFLY_API_KEY = process.env.GETFLY_API_KEY || '';
const GETFLY_BASE = 'https://blackstonesdvtl.getflycrm.com';

export async function GET() {
  const results: Record<string, unknown> = {};
  const headers = { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' };

  // Probe endpoints individually with raw text capture
  const probes = [
    { name: 'comments_10', url: '/api/v3/accounts/10/comments?per_page=2' },
    { name: 'notes_10', url: '/api/v3/accounts/10/notes?per_page=2' },
    { name: 'activities_10', url: '/api/v3/accounts/10/activities?per_page=2' },
    { name: 'attachments_10', url: '/api/v3/accounts/10/attachments?per_page=2' },
    { name: 'custom_fields', url: '/api/v3/accounts/custom_fields?per_page=50' },
    { name: 'account_detail_10', url: '/api/v3/accounts/10' },
    { name: 'order_contracts', url: '/api/v3/order_contracts?per_page=2' },
  ];

  for (const p of probes) {
    try {
      const r = await fetch(`${GETFLY_BASE}${p.url}`, {
        headers, cache: 'no-store',
      });
      const raw = await r.text();
      const isJson = raw.trim().startsWith('{') || raw.trim().startsWith('[');
      results[p.name] = {
        status: r.status,
        content_type: r.headers.get('content-type'),
        is_json: isJson,
        raw_length: raw.length,
        raw_preview: raw.substring(0, 1500),
      };
      if (isJson) {
        try {
          results[p.name + '_parsed'] = JSON.parse(raw);
        } catch {}
      }
    } catch (e: any) {
      results[p.name] = { error: e.message };
    }
  }

  return NextResponse.json(results, { status: 200 });
}
