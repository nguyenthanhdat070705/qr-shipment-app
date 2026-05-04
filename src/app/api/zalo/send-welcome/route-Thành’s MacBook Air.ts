/**
 * POST /api/zalo/send-welcome
 * Gửi tin nhắn Zalo ZNS chào mừng hội viên mới
 * Được gọi tự động sau khi đăng ký thành công
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { sendZNSWelcome } from '@/lib/zalo/zns';

export async function POST(req: NextRequest) {
  try {
    const { member_id, member_code, full_name, phone } = await req.json();

    if (!phone || !member_code || !full_name) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const contractLink = `${process.env.NEXT_PUBLIC_APP_URL}/membership/${member_code}`;

    // Gửi ZNS Welcome
    const result = await sendZNSWelcome({
      phone,
      full_name,
      member_code,
      contract_link: contractLink,
    });

    // Ghi log vào Supabase
    const supabase = getSupabaseAdmin();
    await supabase.from('zns_log').insert({
      member_id: member_id || null,
      member_code,
      phone,
      message_type: 'welcome',
      status: result.success ? 'sent' : 'failed',
      message_id: result.message_id || null,
      error_message: result.error || null,
      sent_at: new Date().toISOString(),
    }).then(({ error }) => {
      if (error) console.warn('[ZNS Log] Không thể ghi log (bảng chưa tồn tại?):', error.message);
    });

    if (result.success) {
      console.log(`[ZNS Welcome] ✅ Đã gửi tới ${phone} (${member_code})`);
      return NextResponse.json({
        success: true,
        message_id: result.message_id,
        message: `Đã gửi tin nhắn Zalo chào mừng tới ${phone}`,
      });
    } else {
      console.warn(`[ZNS Welcome] ⚠️ Gửi thất bại: ${result.error}`);
      return NextResponse.json({
        success: false,
        error: result.error,
        hint: 'Kiểm tra ZALO_OA_ACCESS_TOKEN và ZALO_ZNS_TEMPLATE_WELCOME trong .env',
      }, { status: 200 }); // 200 để front-end không crash
    }
  } catch (err) {
    console.error('[ZNS Welcome] Lỗi:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
