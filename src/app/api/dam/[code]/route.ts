import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> | { code: string } }
) {
  try {
    const rawParams = await params;
    const { code } = rawParams;
    const decodedCode = decodeURIComponent(code);

    if (!decodedCode) {
      return NextResponse.json({ error: 'Thiếu mã đám' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('dim_dam')
      .select('ma_dam, loai, chi_nhanh, nguoi_mat')
      .eq('ma_dam', decodedCode)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: `Không tìm thấy thông tin cho mã đám: ${decodedCode}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Lỗi khi lấy thông tin đám:', error);
    return NextResponse.json(
      { error: 'Lỗi server khi lấy thông tin đám' },
      { status: 500 }
    );
  }
}
