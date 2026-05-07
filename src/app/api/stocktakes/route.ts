import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const warehouseFilter = searchParams.get('warehouse');

    let query = supabase
      .from('stocktakes')
      .select('*')
      .order('created_at', { ascending: false });

    if (warehouseFilter) {
      query = query.ilike('warehouse_name', `%${warehouseFilter}%`);
    }

    const { data, error } = await query;

    if (error) {
      // If table doesn't exist in schema cache, return empty data gracefully
      if (error.message.includes('schema cache') || error.message.includes('relation') || error.code === '42P01') {
        console.warn('[stocktakes GET] Table not found, returning empty:', error.message);
        return NextResponse.json({ success: true, data: [] });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { warehouse_name, created_by, note } = body;

    // Generate unique stocktake code: ST-YYMMDD-HHMM
    const now = new Date();
    const code = `ST-${now.getFullYear().toString().slice(-2)}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}-${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`;

    const { data, error } = await supabase
      .from('stocktakes')
      .insert({
        stocktake_code: code,
        warehouse_name,
        created_by,
        note,
        status: 'pending',
        stocktake_date: now.toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes('schema cache') || error.message.includes('relation') || error.code === '42P01') {
        return NextResponse.json({ 
          success: false, 
          error: 'Bảng stocktakes chưa được tạo trong cơ sở dữ liệu. Vui lòng chạy migration trước.' 
        }, { status: 500 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
