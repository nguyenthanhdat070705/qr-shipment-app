import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email và mật khẩu là bắt buộc.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // ── Step 1: Try to auto-confirm email if user exists ──────
    // This fixes the "Email not confirmed" issue that happens
    // when the user was created in Supabase dashboard without
    // disabling "Confirm email" in Auth settings.
    try {
      const { data: userList } = await supabase.auth.admin.listUsers();
      const existingUser = userList?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );

      if (existingUser && !existingUser.email_confirmed_at) {
        // Auto-confirm the email via admin API
        await supabase.auth.admin.updateUserById(existingUser.id, {
          email_confirm: true,
        });
        console.log(`[auth/login] Auto-confirmed email for: ${email}`);
      }
    } catch (adminErr) {
      // Non-fatal: if admin ops fail, still try to sign in
      console.warn('[auth/login] Admin pre-check failed:', adminErr);
    }

    // ── Step 2: Sign in with email + password ─────────────────
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[auth/login] Supabase error:', error.message);

      // Map common Supabase errors to Vietnamese messages
      let message = `Đăng nhập thất bại: ${error.message}`;
      if (error.message.includes('Invalid login credentials')) {
        message = 'Email hoặc mật khẩu không đúng.';
      } else if (error.message.includes('Email not confirmed')) {
        message = 'Email chưa được xác nhận. Vui lòng liên hệ quản trị viên.';
      }

      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (err) {
    console.error('[auth/login] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Lỗi hệ thống. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}
