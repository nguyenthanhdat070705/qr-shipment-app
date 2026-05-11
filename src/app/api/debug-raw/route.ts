import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('getfly_contracts')
    .select('raw_data')
    .limit(3);

  if (error) {
    return NextResponse.json({ error });
  }

  return NextResponse.json(data);
}
