/**
 * GET /api/cron/birthday-zns
 * Chạy hàng ngày lúc 8:00 SA (ICT) = 1:00 UTC
 * 1. Quét hội viên có sinh nhật hôm nay → gửi ZNS thiệp chúc mừng
 * 2. Quét sinh nhật trong 3 ngày tới → tạo task nhắc sales gọi điện
 * Bảo vệ bằng CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { sendZNSBirthday } from '@/lib/zalo/zns';

export const maxDuration = 120;

export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────
  const authHeader = req.headers.get('authorization');
  const querySecret = req.nextUrl.searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;

  const isAuthorized =
    !cronSecret ||
    authHeader === `Bearer ${cronSecret}` ||
    querySecret === cronSecret;

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const now = new Date();
  // Convert to Vietnam time (UTC+7)
  const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const todayMM = String(vn.getUTCMonth() + 1).padStart(2, '0');
  const todayDD = String(vn.getUTCDate()).padStart(2, '0');

  // Dates for "upcoming" reminder (3 days ahead)
  const upcoming: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(vn.getTime() + i * 24 * 60 * 60 * 1000);
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    upcoming.push(`${mm}-${dd}`);
  }

  console.log(`[BirthdayZNS] 🎂 Quét ngày ${todayDD}/${todayMM} | Upcoming: ${upcoming.join(', ')}`);

  // ── Fetch members có ngày sinh ──────────────────────────
  const { data: members, error } = await supabase
    .from('members')
    .select('id, member_code, full_name, phone, date_of_birth, consultant_name, status')
    .eq('status', 'active')
    .not('date_of_birth', 'is', null)
    .not('phone', 'is', null);

  if (error) {
    console.error('[BirthdayZNS] Lỗi fetch members:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = {
    scanned: members?.length || 0,
    birthday_today: [] as string[],
    birthday_upcoming: [] as { member_code: string; days_until: number }[],
    zns_sent: 0,
    zns_failed: 0,
    reminders_created: 0,
    errors: [] as string[],
  };

  for (const member of members || []) {
    if (!member.date_of_birth) continue;

    const dob = new Date(member.date_of_birth);
    const dobMM = String(dob.getMonth() + 1).padStart(2, '0');
    const dobDD = String(dob.getDate()).padStart(2, '0');
    const dobMMDD = `${dobMM}-${dobDD}`;

    // ── SINH NHẬT HÔM NAY → gửi ZNS + log ──────────────
    if (dobMM === todayMM && dobDD === todayDD) {
      results.birthday_today.push(member.member_code);

      // Kiểm tra đã gửi năm nay chưa
      const year = vn.getUTCFullYear();
      const { data: existing } = await supabase
        .from('zns_log')
        .select('id')
        .eq('member_code', member.member_code)
        .eq('message_type', 'birthday')
        .gte('sent_at', `${year}-01-01`)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`[BirthdayZNS] Skip ${member.member_code} — đã gửi năm ${year}`);
        continue;
      }

      // Gửi ZNS
      const znsResult = await sendZNSBirthday({
        phone: member.phone,
        full_name: member.full_name,
        member_code: member.member_code,
      });

      // Ghi log
      await supabase.from('zns_log').insert({
        member_id: member.id,
        member_code: member.member_code,
        phone: member.phone,
        message_type: 'birthday',
        status: znsResult.success ? 'sent' : 'failed',
        message_id: znsResult.message_id || null,
        error_message: znsResult.error || null,
        sent_at: new Date().toISOString(),
      });

      if (znsResult.success) {
        results.zns_sent++;
        console.log(`[BirthdayZNS] ✅ Thiệp gửi OK → ${member.full_name} (${member.phone})`);
      } else {
        results.zns_failed++;
        results.errors.push(`${member.member_code}: ${znsResult.error}`);
        console.warn(`[BirthdayZNS] ⚠️ Gửi thất bại: ${member.member_code} — ${znsResult.error}`);
      }
    }

    // ── SINH NHẬT SẮP TỚI (1-3 ngày) → tạo reminder ──────
    const upcomingIdx = upcoming.indexOf(dobMMDD);
    if (upcomingIdx !== -1) {
      const daysUntil = upcomingIdx + 1;
      results.birthday_upcoming.push({ member_code: member.member_code, days_until: daysUntil });

      // Ghi vào bảng birthday_reminders để sales xem
      const { error: reminderErr } = await supabase.from('birthday_reminders').upsert({
        member_id: member.id,
        member_code: member.member_code,
        member_name: member.full_name,
        phone: member.phone,
        consultant_name: member.consultant_name || null,
        date_of_birth: member.date_of_birth,
        birthday_date: `${vn.getUTCFullYear()}-${dobMM}-${dobDD}`,
        days_until: daysUntil,
        status: 'pending',
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'member_code,birthday_date',
        ignoreDuplicates: true,
      });

      if (!reminderErr) {
        results.reminders_created++;
        console.log(`[BirthdayZNS] 📅 Reminder tạo: ${member.member_code} — còn ${daysUntil} ngày`);
      }
    }
  }

  console.log('[BirthdayZNS] ✅ Hoàn thành:', JSON.stringify(results));
  return NextResponse.json({
    success: true,
    run_at: now.toISOString(),
    ...results,
  });
}
