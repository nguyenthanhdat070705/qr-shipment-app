import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * POST /api/accounts/reset-defaults
 * Reset all system accounts back to their default passwords.
 */

const DEFAULT_PASSWORDS: { email: string; password: string }[] = [
  { email: 'quantri@blackstone.com.vn',      password: '123456@' },  // VIP Admin
  { email: 'admin@blackstone.com.vn',        password: 'admin123' },
  { email: 'kho1@blackstone.com.vn',         password: '123456@' },
  { email: 'kho2@blackstone.com.vn',         password: '123456@' },
  { email: 'kho3@blackstone.com.vn',         password: '123456@' },
  { email: 'bophanthumua@blackstone.com.vn', password: '123456@' },
  { email: 'bophanvanhanh@blackstone.com.vn',password: '123456@' },
  { email: 'bophanbanhang@blackstone.com.vn',password: '123456@' },
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
        // Tự động tạo user nếu chưa có
        const { error: createError } = await supabase.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
        });

        // Tạo profile cơ bản trong dim_account (bỏ qua lỗi vì có thể bảng có column yêu cầu khác)
        if (!createError) {
          const ho_ten_map: Record<string, string> = {
            'quantri@blackstone.com.vn': 'Quản trị viên VIP',
            'admin@blackstone.com.vn': 'Quản trị viên',
            'kho1@blackstone.com.vn': 'Kho 1',
            'kho2@blackstone.com.vn': 'Kho 2',
            'kho3@blackstone.com.vn': 'Kho 3',
            'bophanthumua@blackstone.com.vn': 'Bộ phận Thu mua',
            'bophanvanhanh@blackstone.com.vn': 'Bộ phận Vận hành',
            'bophanbanhang@blackstone.com.vn': 'Bộ phận Bán hàng'
          };
          
          await supabase.from('dim_account').upsert(
            { email: account.email, ho_ten: ho_ten_map[account.email.toLowerCase()] || 'Nhân viên' },
            { onConflict: 'email' }
          );
        }

        results.push({ 
          email: account.email, 
          status: createError ? `create_error: ${createError.message}` : 'created_ok' 
        });
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
