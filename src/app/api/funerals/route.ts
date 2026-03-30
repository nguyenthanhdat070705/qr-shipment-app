import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Thử lấy từ fact_dam trước
    const { data: factData, error: factError } = await supabase
      .from('fact_dam')
      .select('*')
      .order('ma_dam', { ascending: false });

    if (!factError && factData && factData.length > 0) {
      return NextResponse.json({ data: factData }, { status: 200 });
    }

    // Fallback: lấy từ dim_dam nếu fact_dam lỗi hoặc rỗng
    const { data: dimData, error: dimError } = await supabase
      .from('dim_dam')
      .select('*')
      .order('ma_dam', { ascending: false });

    if (dimError) {
      console.error('[GET /api/funerals] Error fetching dim_dam:', dimError);
      return NextResponse.json({ error: dimError.message }, { status: 500 });
    }

    return NextResponse.json({ data: dimData || [] }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
