/**
 * POST /api/crm/sync          → đồng bộ TOÀN BỘ (best-effort trong ngân sách thời gian).
 * POST /api/crm/sync?module=X → đồng bộ 1 module (slug). UI gọi từng module để KHÔNG
 *                               chạm timeout 60s của Vercel khi data lớn (vd Trao Đổi 30k dòng).
 * Đọc Google Sheets V1 → mirror hiện trạng vào Supabase crm_* (service-role, bypass RLS).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { syncAllModules, syncModuleByKey, type ModuleSyncResult } from '@/lib/crmSheetSync';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const started = Date.now();
  const moduleKey = req.nextUrl.searchParams.get('module')?.trim();

  let results: ModuleSyncResult[];
  if (moduleKey) {
    // Đồng bộ 1 module (lỗi cấu hình slug vẫn trả JSON để UI hiển thị, không 500).
    try {
      results = [await syncModuleByKey(supabase, moduleKey)];
    } catch (e) {
      return NextResponse.json(
        { success: false, error: e instanceof Error ? e.message : String(e), synced_at: new Date().toISOString() },
        { status: 400 },
      );
    }
  } else {
    // Đồng bộ toàn bộ — dừng trước timeout (chừa ~5s cho phản hồi).
    results = await syncAllModules(supabase, { budgetMs: 50_000 });
  }

  const failed = results.filter((r) => r.error);
  return NextResponse.json({
    success: failed.length === 0,
    duration_ms: Date.now() - started,
    modules: results.length,
    succeeded: results.length - failed.length,
    failed: failed.length,
    total_records: results.reduce((s, r) => s + r.current, 0),
    synced_at: new Date().toISOString(),
    results,
  });
}
