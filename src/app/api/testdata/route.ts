import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
export async function GET() {
  const sb = getSupabaseAdmin();
  const res1 = await sb.from('export_confirmations').select('*').limit(10);
  const res2 = await sb.from('fact_xuat_hang').select('*, fact_xuat_hang_items(*)').limit(10);
  const res3 = await sb.from('dim_kho').select('*');
  const res4 = await sb.from('dim_account').select('id, email, ho_ten, phong_ban');
  return NextResponse.json({
    export_confirmations: res1.data,
    fact_xuat_hang: res2.data,
    dim_kho: res3.data,
    accounts: res4.data
  });
}
