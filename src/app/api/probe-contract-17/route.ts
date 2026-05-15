import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const GETFLY_API_KEY = process.env.GETFLY_API_KEY || 'UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1';
const GETFLY_BASE = 'https://blackstonesdvtl.getflycrm.com/api/v3';

export async function GET(req: NextRequest) {
  const tryEndpoint = async (url: string) => {
    try {
      const res = await fetch(url, {
        headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
      });
      if (res.ok) {
        return { url, status: res.status, data: await res.json().catch(() => 'Not JSON') };
      }
      return { url, status: res.status, error: await res.text().then(t => t.substring(0, 100)) };
    } catch (err) {
      return { url, error: String(err) };
    }
  };

  const results = await Promise.all([
    tryEndpoint(`${GETFLY_BASE}/contracts/17`),
    tryEndpoint(`${GETFLY_BASE}/contract/17`),
    tryEndpoint(`https://blackstonesdvtl.getflycrm.com/crm/contract/detail?contract_id=17`),
    tryEndpoint(`${GETFLY_BASE}/orders?contract_id=17`),
  ]);
  
  const dumpPath = path.join(process.cwd(), 'scratch', 'probe_contract_17.json');
  fs.writeFileSync(dumpPath, JSON.stringify(results, null, 2));
  
  return NextResponse.json({ success: true, savedTo: dumpPath });
}
