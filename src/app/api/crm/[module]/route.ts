/**
 * GET /api/crm/[module]
 * Đọc hiện trạng 1 module CRM từ bảng Supabase crm_* (mirror từ Google Sheets).
 * Trả về rows đã "phẳng hoá" (mỗi key của data = 1 field) cho DataTable dùng trực tiếp.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getCrmModule } from '@/config/crmModules';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ module: string }> | { module: string } }
) {
  const { module } = await params;
  const mod = getCrmModule(module);
  if (!mod) {
    return NextResponse.json({ error: `Module không hợp lệ: ${module}` }, { status: 404 });
  }

  const supabase = getSupabaseAdmin();
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 20000, 50000);

  const { data, error, count } = await supabase
    .from(mod.table)
    .select('id, data, change_type, recorded_at, synced_at', { count: 'exact' })
    .order('synced_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = { id: string; data: Record<string, unknown> | null; change_type: string | null; recorded_at: string | null; synced_at: string | null };
  const rows = (data as Row[] ?? []).map((r) => ({
    ...(r.data ?? {}),
    __change_type: r.change_type,
    __recorded_at: r.recorded_at,
    __synced_at: r.synced_at,
  }));

  return NextResponse.json({
    module: mod.key,
    label: mod.label,
    total: count ?? rows.length,
    rows,
  });
}
