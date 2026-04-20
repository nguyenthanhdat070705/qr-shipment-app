/**
 * GET /api/membership/expiring
 * Lấy danh sách hội viên có hợp đồng sắp hết hạn
 *
 * Query params:
 *   days = số ngày tới cần kiểm tra (default 30)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = req.nextUrl;
    const days = parseInt(searchParams.get('days') || '30');

    // Giờ Việt Nam (UTC+7)
    const now   = new Date();
    const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);

    // Ngày hôm nay và ngày giới hạn
    const todayStr  = vnNow.toISOString().slice(0, 10);
    const limitDate = new Date(vnNow.getTime() + days * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);

    const { data: members, error } = await supabase
      .from('members')
      .select('id, member_code, full_name, phone, expiry_date, registered_date, consultant_name, branch')
      .eq('status', 'active')
      .not('phone', 'is', null)
      .not('expiry_date', 'is', null)
      .gte('expiry_date', todayStr)   // Chưa hết hạn
      .lte('expiry_date', limitDate)  // Trong vòng N ngày
      .order('expiry_date', { ascending: true });

    if (error) throw error;

    // Thêm trường days_remaining
    const membersWithDays = (members || []).map(m => {
      const expiryMs = new Date(m.expiry_date).getTime();
      const todayMs  = new Date(todayStr).getTime();
      const daysRemaining = Math.ceil((expiryMs - todayMs) / (1000 * 60 * 60 * 24));
      return {
        ...m,
        days_remaining: daysRemaining,
      };
    });

    return NextResponse.json({
      members:   membersWithDays,
      total:     membersWithDays.length,
      days_range: days,
      checked_at: now.toISOString(),
    });
  } catch (err) {
    console.error('[Expiring Members] Lỗi:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error' },
      { status: 500 }
    );
  }
}
