import { NextRequest, NextResponse } from 'next/server';

/**
 * Gửi email giao dịch qua Resend REST API — KHÔNG cần thêm dependency.
 *
 * ENV cần đặt để gửi thật:
 *   RESEND_API_KEY  — API key từ https://resend.com
 *   EMAIL_FROM      — vd: 'Blackstones <no-reply@blackstones.vn>' (domain đã verify)
 *
 * Nếu thiếu RESEND_API_KEY → ghi log (chế độ dev) và trả về { mock: true }.
 * Trước đây route này luôn console.log rồi trả success:true (email không bao giờ được gửi) — đã sửa.
 */
export async function POST(req: NextRequest) {
  try {
    const { to, subject, html, text } = await req.json();

    if (!to || !subject) {
      return NextResponse.json(
        { success: false, error: 'Thiếu tham số "to" hoặc "subject".' },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM || 'Blackstones <onboarding@resend.dev>';

    // Chưa cấu hình nhà cung cấp → log để không chặn luồng nghiệp vụ, nhưng báo rõ là mock.
    if (!apiKey) {
      console.warn(
        `[send-email] Thiếu RESEND_API_KEY — email CHƯA được gửi (chế độ log). ` +
        `To: ${Array.isArray(to) ? to.join(', ') : to} | Subject: ${subject}`
      );
      return NextResponse.json({
        success: true,
        mock: true,
        message: 'Chưa cấu hình RESEND_API_KEY nên email chỉ được ghi log, chưa gửi thật.',
      });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html: html ?? undefined,
        text: text ?? (html ? undefined : subject),
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('[send-email] Resend trả lỗi:', res.status, data);
      return NextResponse.json(
        { success: false, error: data?.message || 'Gửi email thất bại', status: res.status },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (error) {
    console.error('[send-email] Lỗi:', error);
    return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
  }
}
