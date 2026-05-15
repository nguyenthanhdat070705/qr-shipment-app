export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('getfly_accounts')
    .select('account_code, account_name, raw_data')
    .eq('account_code', 'KH12119')
    .limit(1);
    
  const dumpPath = path.join(process.cwd(), 'scratch', 'probe_account.json');
  fs.writeFileSync(dumpPath, JSON.stringify(data, null, 2));

  return NextResponse.json({ data });
}
