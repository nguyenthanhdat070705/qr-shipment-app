import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * POST /api/accounts/reset-defaults
 * Reset all system accounts back to their default passwords.
 */

const DEFAULT_PASSWORDS: { email: string; password: string }[] = [
  { email: 'admin@blackstone.com.vn',        password: 'admin123' },
  { email: 'kho1@blackstone.com.vn',         password: '123456@' },
  { email: 'kho2@blackstone.com.vn',         password: '123456@' },
  { email: 'kho3@blackstone.com.vn',         password: '123456@' },
  { email: 'bophanthumua@blackstone.com.vn', password: '123456@' },
  { email: 'bophanvanhanh@blackstone.com.vn',password: '123456@' },
];

export async function POST() {
  try {
    const supabase = getSupabaseAdmin();

    // Fetch all users once
    const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      return NextResponse.json({ error: 'Lỗi khi lấy danh sách user.' }, { status: 500 });
    }

    const results: { email: string; status: string }[] = [];

    for (const account of DEFAULT_PASSWORDS) {
      const user = userList?.users?.find(
        (u) => u.email?.toLowerCase() === account.email.toLowerCase()
      );

      if (!user) {
        results.push({ email: account.email, status: 'not_found' });
        continue;
      }

      const { error } = await supabase.auth.admin.updateUserById(user.id, {
        password: account.password,
        email_confirm: true,
      });

      results.push({
        email: account.email,
        status: error ? `error: ${error.message}` : 'reset_ok',
      });
    }

    const successCount = results.filter((r) => r.status === 'reset_ok').length;
    console.log('[reset-defaults] Results:', results);

    return NextResponse.json({
      success: true,
      message: `Đã reset ${successCount}/${DEFAULT_PASSWORDS.length} tài khoản về mật khẩu mặc định.`,
      details: results,
    });
  } catch (err) {
    console.error('[reset-defaults] Unexpected error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
