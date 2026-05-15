import { NextRequest, NextResponse } from 'next/server';

const GETFLY_API_KEY = process.env.GETFLY_API_KEY || 'UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1';
const GETFLY_BASE = 'https://blackstonesdvtl.getflycrm.com/api/v3';

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get('q') || 'MBS2602';
    
    // Test with order_type=1 and order_type=2
    const url1 = `${GETFLY_BASE}/orders?search=${search}&order_type=1`;
    const res1 = await fetch(url1, {
      headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
    });
    const data1 = await res1.json();

    const url2 = `${GETFLY_BASE}/orders?search=${search}&order_type=2`;
    const res2 = await fetch(url2, {
      headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
    });
    const data2 = await res2.json();
    
    return NextResponse.json({ success: true, search, type1: data1, type2: data2 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
