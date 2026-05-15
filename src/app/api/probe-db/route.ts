export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('fact_dam').select('ma_dam, ngay_liem, ngay_di_quan').neq('ngay_liem', '—').neq('ngay_di_quan', '').neq('ngay_di_quan', '—').not('ngay_di_quan', 'is', null).limit(10);
  return NextResponse.json({ data });
}
