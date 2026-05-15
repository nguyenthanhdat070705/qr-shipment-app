import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const GETFLY_API_KEY = process.env.GETFLY_API_KEY || 'UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1';
const GETFLY_BASE = 'https://blackstonesdvtl.getflycrm.com/api/v3';

export async function GET(req: NextRequest) {
  try {
    const url = `${GETFLY_BASE}/orders/MBS26003`;
    const res = await fetch(url, {
      headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
    });
    
    const data = await res.json();
    const dumpPath = path.join(process.cwd(), 'scratch', 'order_MBS26003.json');
    fs.writeFileSync(dumpPath, JSON.stringify(data, null, 2));
    
    return NextResponse.json({ success: true, savedTo: dumpPath });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
