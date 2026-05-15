export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');
    
  const dumpPath = path.join(process.cwd(), 'scratch', 'tables.json');
  fs.writeFileSync(dumpPath, JSON.stringify(data, null, 2));

  return NextResponse.json({ data });
}
