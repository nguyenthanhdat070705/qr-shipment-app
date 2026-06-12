/**
 * POST /api/crm/sync
 * Nút "Sync ngay" — đọc 14 Google Sheets → mirror hiện trạng vào Supabase crm_*.
 * Dùng service-role (RLS bypass). Trả về thống kê từng module.
 */
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { syncAllModules } from '@/lib/crmSheetSync';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

export async function POST() {
  const supabase = getSupabaseAdmin();
  const started = Date.now();
  const results = await syncAllModules(supabase);

  const failed = results.filter((r) => r.error);
  const totalRecords = results.reduce((s, r) => s + r.current, 0);

  return NextResponse.json({
    success: failed.length === 0,
    duration_ms: Date.now() - started,
    modules: results.length,
    succeeded: results.length - failed.length,
    failed: failed.length,
    total_records: totalRecords,
    synced_at: new Date().toISOString(),
    results,
  });
}
