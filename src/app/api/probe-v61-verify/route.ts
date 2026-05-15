import { NextRequest, NextResponse } from 'next/server';

const GETFLY_API_KEY = process.env.GETFLY_API_KEY || 'UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1';

export async function GET(req: NextRequest) {
  try {
    const urls = [
      'https://blackstonesdvtl.getflycrm.com/api/v3/accounts',
      'https://blackstonesdvtl.getflycrm.com/api/v6.1/accounts',
    ];
    
    const results = await Promise.all(urls.map(async url => {
      const res = await fetch(url, {
        headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
      });
      return { url, status: res.status, ok: res.ok };
    }));
    
    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
