import { NextRequest, NextResponse } from 'next/server';

const GETFLY_API_KEY = process.env.GETFLY_API_KEY || 'UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1';
const GETFLY_BASE = 'https://blackstonesdvtl.getflycrm.com/api/v3';

export async function GET(req: NextRequest) {
  try {
    const url1 = `${GETFLY_BASE}/contracts?page=1&per_page=10`;
    const res1 = await fetch(url1, {
      headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
    });
    const contractsList = await res1.json();

    const url2 = `${GETFLY_BASE}/custom-fields/order`;
    const res2 = await fetch(url2, {
      headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
    });
    const customFields = await res2.json();
    
    return NextResponse.json({ success: true, contractsList, customFields });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
