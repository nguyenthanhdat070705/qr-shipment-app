import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { syncKhttOrders } from '@/lib/khtt-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// ═══════════════════════════════════════════════════════
// POST: Đồng bộ đơn KHTT (Chờ duyệt) từ GetFly → Supabase
//        Dùng cho nút "Đồng bộ GetFly" và cron-job.org.
// ═══════════════════════════════════════════════════════
export async function POST() {
  try {
    const supabase = getSupabaseAdmin();
    const result = await syncKhttOrders(supabase);
    return NextResponse.json({
      success: true,
      ...result,
      message: `Đã đồng bộ ${result.synced} hợp đồng Trăm Tuổi (Chờ duyệt)` +
        (result.removed ? `, gỡ ${result.removed} đơn đã duyệt/huỷ` : '') +
        ` — quét ${result.scanned} đơn bán.`,
    });
  } catch (err) {
    console.error('[Sync KHTT] Error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

// GET: cho cron-job.org (một số dịch vụ cron chỉ gọi GET).
export async function GET() {
  return POST();
}
