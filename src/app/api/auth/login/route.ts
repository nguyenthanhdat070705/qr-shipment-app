import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getUserRole, ROLE_CONFIGS } from '@/config/roles.config';

const LOCAL_DEFAULT_ACCOUNTS: Record<string, { password: string; name: string; department: string }> = {
  'quantri@blackstone.com.vn': { password: '123456@', name: 'Quản trị viên VIP', department: 'Quản trị' },
  'admin@blackstone.com.vn': { password: 'admin123', name: 'Quản trị viên', department: 'Quản trị' },
  'kho1@blackstone.com.vn': { password: '123456@', name: 'Kho 1', department: 'Kho' },
  'kho2@blackstone.com.vn': { password: '123456@', name: 'Kho 2', department: 'Kho' },
  'kho3@blackstone.com.vn': { password: '123456@', name: 'Kho 3', department: 'Kho' },
  'bophanthumua@blackstone.com.vn': { password: '123456@', name: 'Bộ phận Thu mua', department: 'Thu mua' },
  'bophanvanhanh@blackstone.com.vn': { password: '123456@', name: 'Bộ phận Vận hành', department: 'Vận hành' },
  'bophanbanhang@blackstone.com.vn': { password: '123456A', name: 'Bộ phận Bán hàng', department: 'Bán hàng' },
  'bophanpttt@blackstone.com.vn': { password: '123456@', name: 'Bộ phận PTTT', department: 'Bán hàng' },
};

function canUseLocalAuth() {
  return process.env.NODE_ENV !== 'production'
    && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function localLogin(email: string, password: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const account = LOCAL_DEFAULT_ACCOUNTS[normalizedEmail];

  if (!account || account.password !== password) {
    return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng.' }, { status: 401 });
  }

  const role = getUserRole(normalizedEmail);
  const roleConfig = ROLE_CONFIGS[role];

  return NextResponse.json({
    token: `local-dev-token:${normalizedEmail}`,
    user: {
      id: `local:${normalizedEmail}`,
      email: normalizedEmail,
      role,
      roleLabel: roleConfig.label,
      permissions: roleConfig.permissions,
      ho_ten: account.name,
      phong_ban: account.department,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email và mật khẩu là bắt buộc.' },
        { status: 400 }
      );
    }

    if (canUseLocalAuth()) {
      return localLogin(email, password);
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

    // ── Step 3: Determine user role & fetch account info ─────────────
    const role = getUserRole(data.user.email || email);
    const roleConfig = ROLE_CONFIGS[role];

    const { data: accountInfo } = await supabase
      .from('dim_account')
      .select('ho_ten, phong_ban')
      .eq('email', email)
      .single();

    return NextResponse.json({
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: role,
        roleLabel: roleConfig.label,
        permissions: roleConfig.permissions,
        ho_ten: accountInfo?.ho_ten || '',
        phong_ban: accountInfo?.phong_ban || '',
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
