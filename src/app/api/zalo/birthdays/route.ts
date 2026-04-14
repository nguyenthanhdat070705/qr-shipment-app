/**
 * GET /api/zalo/birthdays
 * Lấy danh sách hội viên có sinh nhật hôm nay / sắp tới
 * Dùng để Sales xem và chủ động gọi điện
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = req.nextUrl;
    const days = parseInt(searchParams.get('days') || '7'); // Số ngày tới cần kiểm tra

    // Vietnam time (UTC+7)
    const now = new Date();
    const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);

    const { data: members, error } = await supabase
      .from('members')
      .select('id, member_code, full_name, phone, date_of_birth, consultant_name, branch, status')
      .eq('status', 'active')
      .not('date_of_birth', 'is', null);

    if (error) throw error;

    const today: typeof members = [];
    const upcoming: Array<typeof members[0] & { days_until: number; birthday_this_year: string }> = [];

    const year = vn.getUTCFullYear();
    const todayMM = String(vn.getUTCMonth() + 1).padStart(2, '0');
    const todayDD = String(vn.getUTCDate()).padStart(2, '0');

    for (const m of members || []) {
      if (!m.date_of_birth) continue;
      const dob = new Date(m.date_of_birth);
      const dobMM = String(dob.getMonth() + 1).padStart(2, '0');
      const dobDD = String(dob.getDate()).padStart(2, '0');

      // Birthday this year
      let birthdayThisYear = new Date(`${year}-${dobMM}-${dobDD}`);
      // If already passed this year, check next year
      if (birthdayThisYear < vn) {
        birthdayThisYear = new Date(`${year + 1}-${dobMM}-${dobDD}`);
      }

      const daysUntil = Math.round(
        (birthdayThisYear.getTime() - new Date(vn.toDateString()).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntil === 0 && dobMM === todayMM && dobDD === todayDD) {
        today.push(m);
      } else if (daysUntil > 0 && daysUntil <= days) {
        upcoming.push({
          ...m,
          days_until: daysUntil,
          birthday_this_year: `${year}-${dobMM}-${dobDD}`,
        });
      }
    }

    // Sort upcoming by days
    upcoming.sort((a, b) => a.days_until - b.days_until);

    return NextResponse.json({
      today,
      upcoming,
      checked_at: now.toISOString(),
      days_range: days,
    });
  } catch (err) {
    console.error('[Birthdays API] Lỗi:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}
