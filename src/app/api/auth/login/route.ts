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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Map common Supabase errors to Vietnamese messages
      let message = 'Đăng nhập thất bại.';
      if (error.message.includes('Invalid login credentials')) {
        message = 'Email hoặc mật khẩu không đúng.';
      } else if (error.message.includes('Email not confirmed')) {
        message = 'Email chưa được xác nhận. Vui lòng kiểm tra hộp thư.';
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
  } catch {
    return NextResponse.json(
      { error: 'Lỗi hệ thống. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}
