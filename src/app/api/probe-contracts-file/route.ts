import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const GETFLY_API_KEY = process.env.GETFLY_API_KEY || 'UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1';
const GETFLY_BASE = 'https://blackstonesdvtl.getflycrm.com/api/v3';

export async function GET(req: NextRequest) {
  try {
    const url = `${GETFLY_BASE}/contracts?page=1&per_page=10`;
    const res = await fetch(url, {
      headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
    });
    
    // Check if response is JSON
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: "Not JSON", text: text.substring(0, 500) };
    }
    
    const dumpPath = path.join(process.cwd(), 'scratch', 'probe_contracts.json');
    fs.writeFileSync(dumpPath, JSON.stringify(data, null, 2));
    
    return NextResponse.json({ success: true, savedTo: dumpPath });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
