import { NextResponse } from 'next/server';

const GETFLY_API_KEY = process.env.GETFLY_API_KEY || '';
const GETFLY_BASE = 'https://blackstonesdvtl.getflycrm.com';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get('path') || '/api/v3/accounts?per_page=1';
  
  const headers = { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' };
  
  try {
    const r = await fetch(`${GETFLY_BASE}${path}`, {
      headers, cache: 'no-store',
    });
    const raw = await r.text();
    
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch {}
    
    return NextResponse.json({
      endpoint: path,
      status: r.status,
      content_type: r.headers.get('content-type'),
      is_json: parsed !== null,
      is_html: raw.includes('<!DOCTYPE') || raw.includes('<html'),
      raw_length: raw.length,
      data: parsed,
      raw_preview: parsed ? undefined : raw.substring(0, 500),
    });
  } catch (e: any) {
    return NextResponse.json({ endpoint: path, error: e.message });
  }
}
