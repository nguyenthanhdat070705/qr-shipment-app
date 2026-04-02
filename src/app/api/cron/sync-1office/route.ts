/**
 * GET /api/cron/sync-1office
 * Được gọi bởi Vercel Cron mỗi 3 tiếng (xem vercel.json)
 * Bảo vệ bằng CRON_SECRET (Vercel tự inject header Authorization)
 */

import { NextRequest, NextResponse } from 'next/server';
import { runFullSync } from '@/lib/1office/sync';

export async function GET(req: NextRequest) {
  // Xác thực: chấp nhận cả header Authorization HOẶC query param ?secret=
  const authHeader = req.headers.get('authorization');
  const querySecret = req.nextUrl.searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;

  const isAuthorized = !cronSecret 
    || authHeader === `Bearer ${cronSecret}` 
    || querySecret === cronSecret;

  if (!isAuthorized) {
    console.warn('[Cron] Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Cron] 🕐 Bắt đầu scheduled sync 1Office → Supabase');

  try {
    const result = await runFullSync();

    const summary = {
      scheduled_at: new Date().toISOString(),
      success: result.success,
      duration_sec: Math.round(result.total_duration_ms / 1000),
      total_fetched: result.results.reduce((s, r) => s + r.fetched, 0),
      total_upserted: result.results.reduce((s, r) => s + r.upserted, 0),
      tables: result.results.map(r => ({
        table: r.table,
        fetched: r.fetched,
        upserted: r.upserted,
        ok: !r.error_msg,
      })),
    };

    console.log('[Cron] ✅ Sync hoàn thành:', JSON.stringify(summary));
    return NextResponse.json(summary, { status: 200 });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Cron] ❌ Sync thất bại:', msg);
    return NextResponse.json({ error: msg, scheduled_at: new Date().toISOString() }, { status: 500 });
  }
}

// Vercel: cho phép chạy tối đa 5 phút
export const maxDuration = 300;
