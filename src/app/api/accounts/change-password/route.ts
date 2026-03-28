import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * POST /api/accounts/change-password
 * Admin-only: change a system account's password via Supabase Admin API
 */
export async function POST(request: NextRequest) {
  try {
    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email và mật khẩu là bắt buộc.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Find the user by email
    const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('[change-password] listUsers error:', listError);
      return NextResponse.json({ error: 'Không thể lấy danh sách người dùng.' }, { status: 500 });
    }

    const targetUser = userList?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase().trim()
    );

    if (!targetUser) {
      return NextResponse.json(
        { error: `Không tìm thấy tài khoản: ${email}` },
        { status: 404 }
      );
    }

    // Update password via admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(targetUser.id, {
      password: newPassword,
    });

    if (updateError) {
      console.error('[change-password] updateUserById error:', updateError);
      return NextResponse.json({ error: `Lỗi cập nhật: ${updateError.message}` }, { status: 500 });
    }

    console.log(`[change-password] Password updated for: ${email}`);
    return NextResponse.json({ success: true, message: `Đã đổi mật khẩu cho ${email}` });
  } catch (err) {
    console.error('[change-password] Unexpected error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
