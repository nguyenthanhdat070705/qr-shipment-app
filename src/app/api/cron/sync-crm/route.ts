/**
 * GET /api/cron/sync-crm
 * Cron (Vercel) — đồng bộ định kỳ 14 Google Sheets → Supabase crm_*.
 * Bảo vệ bằng CRON_SECRET (Authorization: Bearer … hoặc ?secret=…).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { syncAllModules } from '@/lib/crmSheetSync';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const querySecret = request.nextUrl.searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;
  const authorized =
    !cronSecret || authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret;
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const started = Date.now();
  const results = await syncAllModules(supabase);
  const failed = results.filter((r) => r.error);

  return NextResponse.json({
    success: failed.length === 0,
    duration_ms: Date.now() - started,
    total_records: results.reduce((s, r) => s + r.current, 0),
    results,
  });
}
