export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Ưu tiên fact_dam vì nó chứa đầy đủ 47 cột chi tiết
    const { data: factData, error: factError } = await supabase
      .from('fact_dam')
      .select('*')
      .order('stt', { ascending: false });

    if (!factError && factData && factData.length > 0) {
      // Bổ sung created_at từ dim_dam (nếu có) vì fact_dam không track created_at tốt bằng dim_dam
      const { data: dimData } = await supabase
        .from('dim_dam')
        .select('ma_dam, created_at, updated_at');

      const dimMap: Record<string, any> = {};
      (dimData || []).forEach((d: any) => { dimMap[d.ma_dam] = d; });

      // Merge: fact_dam là nguồn chính, dim_dam chỉ bổ sung metadata
      const merged = factData.map((f: any) => {
        const dim = dimMap[f.ma_dam];
        return {
          ...f,
          // Chỉ lấy created_at/updated_at từ dim nếu fact không có
          created_at: f.created_at || dim?.created_at,
          updated_at: f.updated_at || dim?.updated_at,
        };
      });

      return NextResponse.json({ data: merged }, { status: 200 });
    }

    // Fallback: lấy từ dim_dam nếu fact_dam rỗng
    const { data: dimFallback, error: dimError } = await supabase
      .from('dim_dam')
      .select('*')
      .order('created_at', { ascending: false });

    if (dimError) {
      console.error('[GET /api/funerals] Error fetching dim_dam:', dimError);
      return NextResponse.json({ error: dimError.message }, { status: 500 });
    }

    return NextResponse.json({ data: dimFallback || [] }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
