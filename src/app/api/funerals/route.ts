import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Ưu tiên dim_dam vì nó được sync đầy đủ nhất (có created_at, upsert by ma_dam)
    const { data: dimData, error: dimError } = await supabase
      .from('dim_dam')
      .select('*')
      .order('created_at', { ascending: false });

    if (!dimError && dimData && dimData.length > 0) {
      // Lấy thêm chi tiết từ fact_dam theo ma_dam
      const maDamList = dimData.map((r: any) => r.ma_dam).filter(Boolean);
      const { data: factData } = await supabase
        .from('fact_dam')
        .select('*')
        .in('ma_dam', maDamList);

      // Merge: dùng fact_dam để bổ sung các field chi tiết vào dim_dam
      const factMap: Record<string, any> = {};
      (factData || []).forEach((f: any) => { factMap[f.ma_dam] = f; });

      const merged = dimData.map((d: any) => ({
        ...(factMap[d.ma_dam] || {}),
        ...d, // dim_dam fields override (ngay, created_at, etc.)
      }));

      return NextResponse.json({ data: merged }, { status: 200 });
    }

    // Fallback: lấy từ fact_dam nếu dim_dam rỗng
    const { data: factData2, error: factError2 } = await supabase
      .from('fact_dam')
      .select('*')
      .order('stt', { ascending: false });

    if (factError2) {
      console.error('[GET /api/funerals] Error fetching fact_dam:', factError2);
      return NextResponse.json({ error: factError2.message }, { status: 500 });
    }

    return NextResponse.json({ data: factData2 || [] }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
