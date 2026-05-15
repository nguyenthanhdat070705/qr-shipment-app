import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const GETFLY_API_KEY = process.env.GETFLY_API_KEY || 'UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1';
const GETFLY_BASE_V6 = 'https://blackstonesdvtl.getflycrm.com/api/v6.1';

export async function GET(req: NextRequest) {
  try {
    const url = `${GETFLY_BASE_V6}/sale_contracts`;
    const res = await fetch(url, {
      headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
    });
    
    let data;
    if (res.ok) {
      data = await res.json();
    } else {
      data = { status: res.status, error: await res.text() };
    }
    
    const dumpPath = path.join(process.cwd(), 'scratch', 'probe_v61_contracts.json');
    fs.writeFileSync(dumpPath, JSON.stringify(data, null, 2));
    
    return NextResponse.json({ success: true, savedTo: dumpPath });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
