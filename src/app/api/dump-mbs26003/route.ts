export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('getfly_contracts')
      .select('contract_name, raw_data')
      .ilike('contract_name', '%MBS26003%')
      .limit(1);

    const dumpPath = path.join(process.cwd(), 'scratch', 'mbs26003_raw.json');
    fs.writeFileSync(dumpPath, JSON.stringify({ data, error }, null, 2));

    return NextResponse.json({ success: true, data, error });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
