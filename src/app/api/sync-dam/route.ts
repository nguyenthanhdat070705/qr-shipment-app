/**
 * POST /api/sync-dam — Manual sync trigger
 * Cho phép admin/user chủ động sync dữ liệu Đám từ Google Sheets.
 * Gọi nội bộ tới /api/cron/sync-dam (reuse toàn bộ logic).
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Xây dựng URL tới cron endpoint
    const baseUrl = request.nextUrl.origin;
    const cronSecret = process.env.CRON_SECRET;

    const cronUrl = new URL('/api/cron/sync-dam', baseUrl);
    // Truyền secret qua query param (cron endpoint chấp nhận cả hai cách)
    if (cronSecret) {
      cronUrl.searchParams.set('secret', cronSecret);
    }

    console.log('[Manual sync-dam] 🔄 Bắt đầu sync thủ công...');

    const res = await fetch(cronUrl.toString(), {
      method: 'GET',
      headers: {
        ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
      },
    });

    const result = await res.json();

    if (!res.ok) {
      console.error('[Manual sync-dam] ❌ Sync thất bại:', result);
      return NextResponse.json(
        { error: result.error || 'Sync thất bại', details: result },
        { status: res.status }
      );
    }

    console.log('[Manual sync-dam] ✅ Sync thành công:', JSON.stringify(result));
    return NextResponse.json({
      ...result,
      triggered_by: 'manual',
      triggered_at: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Manual sync-dam] ❌ Error:', err.message);
    return NextResponse.json(
      { error: `Lỗi khi sync: ${err.message}` },
      { status: 500 }
    );
  }
}
