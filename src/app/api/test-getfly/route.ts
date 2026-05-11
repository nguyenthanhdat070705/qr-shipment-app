import { NextRequest, NextResponse } from 'next/server';

const GETFLY_API_KEY = process.env.GETFLY_API_KEY || 'UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1';
const GETFLY_BASE = 'https://blackstonesdvtl.getflycrm.com/api/v3';

export async function GET(req: NextRequest) {
  try {
    const orderId = '1832';
    const res = await fetch(`${GETFLY_BASE}/orders/${orderId}`, {
      headers: {
        'X-API-KEY': GETFLY_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      cache: 'no-store'
    });
    
    if (!res.ok) {
      return NextResponse.json({ error: await res.text() });
    }
    
    const data = await res.json();
    return NextResponse.json({ detail: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
