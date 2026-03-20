import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getUserRole, ROLE_CONFIGS } from '@/config/roles.config';

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
    try {
      const { data: userList } = await supabase.auth.admin.listUsers();
      const existingUser = userList?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );

      if (existingUser && !existingUser.email_confirmed_at) {
        await supabase.auth.admin.updateUserById(existingUser.id, {
          email_confirm: true,
        });
        console.log(`[auth/login] Auto-confirmed email for: ${email}`);
      }
    } catch (adminErr) {
      console.warn('[auth/login] Admin pre-check failed:', adminErr);
    }

    // ── Step 2: Sign in with email + password ─────────────────
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[auth/login] Supabase error:', error.message);

      let message = `Đăng nhập thất bại: ${error.message}`;
      if (error.message.includes('Invalid login credentials')) {
        message = 'Email hoặc mật khẩu không đúng.';
      } else if (error.message.includes('Email not confirmed')) {
        message = 'Email chưa được xác nhận. Vui lòng liên hệ quản trị viên.';
      }

      return NextResponse.json({ error: message }, { status: 401 });
    }

    // ── Step 3: Determine user role ───────────────────────────
    const role = getUserRole(data.user.email || email);
    const roleConfig = ROLE_CONFIGS[role];

    return NextResponse.json({
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: role,
        roleLabel: roleConfig.label,
        permissions: roleConfig.permissions,
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
