import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const GETFLY_API_KEY = process.env.GETFLY_API_KEY || 'UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1';
const GETFLY_BASE = 'https://blackstonesdvtl.getflycrm.com/api/v3';

export async function GET(req: NextRequest) {
  const tryEndpoint = async (endpoint: string) => {
    try {
      const res = await fetch(`${GETFLY_BASE}${endpoint}`, {
        headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
      });
      if (res.ok) {
        return { endpoint, status: res.status, data: await res.json() };
      }
      return { endpoint, status: res.status, error: await res.text().then(t => t.substring(0, 100)) };
    } catch (err) {
      return { endpoint, error: String(err) };
    }
  };

  const results = await Promise.all([
    tryEndpoint('/contract'),
    tryEndpoint('/contract/1850'),
    tryEndpoint('/contract/MBS26003'),
    tryEndpoint('/contracts'),
    tryEndpoint('/custom-fields'),
    tryEndpoint('/custom_field'),
    tryEndpoint('/orders/1850/custom-fields'),
  ]);
  
  const dumpPath = path.join(process.cwd(), 'scratch', 'probe_multiple.json');
  fs.writeFileSync(dumpPath, JSON.stringify(results, null, 2));
  
  return NextResponse.json({ success: true, savedTo: dumpPath });
}
