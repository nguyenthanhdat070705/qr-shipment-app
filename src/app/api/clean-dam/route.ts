import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Missing config' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: allData, error: fetchErr } = await supabase.from('fact_dam').select('ma_dam');
  
  if (fetchErr || !allData) {
     return NextResponse.json({ error: 'Cannot fetch data' });
  }

  // Lấy ra tất cả các mã đám từ cả 2 bảng
  const { data: dimData } = await supabase.from('dim_dam').select('ma_dam');
  const dimBadRows = (dimData || []).filter(r => r.ma_dam && r.ma_dam.length > 30);
  for (const row of dimBadRows) {
     await supabase.from('dim_dam').delete().eq('ma_dam', row.ma_dam);
  }

  return NextResponse.json({
    message: 'Danh sách toàn bộ mã đám trong DB',
    totalCount: allData.length,
    allMaDam: allData.map(r => r.ma_dam),
    dimCleaned: dimBadRows.length,
  });
}
