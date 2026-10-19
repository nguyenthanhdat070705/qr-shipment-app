/**
 * GET /api/cron/sync-1office
 * Được gọi bởi Vercel Cron hằng ngày (xem vercel.json)
 * Bảo vệ bằng CRON_SECRET (Vercel tự inject header Authorization)
 */

import { NextRequest, NextResponse } from 'next/server';
import { runFullSync } from '@/lib/1office/sync';

export async function GET(req: NextRequest) {
  // Chỉ nhận Bearer token. Bí mật không được truyền qua URL vì URL có thể bị ghi log.
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[Cron] CRON_SECRET chưa được cấu hình. Từ chối chạy sync.');
    return NextResponse.json({ error: 'Cron is not configured' }, { status: 503 });
  }

  const isAuthorized = authHeader === `Bearer ${cronSecret}`;

  if (!isAuthorized) {
    console.warn('[Cron] Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Cron] 🕐 Bắt đầu scheduled sync 1Office → Supabase');

  try {
    // This cron is dedicated to coffin catalog and stock sync. Other 1Office
    // datasets are intentionally left to their own pipelines.
    const result = await runFullSync({ tables: ['coffin_catalog', 'coffin_inventory'] });

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
        ok: r.errors === 0 && !r.error_msg,
        ...(r.note ? { note: r.note } : {}),
      })),
    };

    console.log('[Cron] ✅ Sync hoàn thành:', JSON.stringify(summary));
    return NextResponse.json(summary, { status: result.success ? 200 : 207 });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Cron] ❌ Sync thất bại:', msg);
    return NextResponse.json({ error: msg, scheduled_at: new Date().toISOString() }, { status: 500 });
  }
}

// Vercel: cho phép chạy tối đa 5 phút
export const maxDuration = 300;
