import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();
    if (typeof refreshToken !== 'string' || !refreshToken) {
      return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ.' }, { status: 401 });
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
    if (!url || !key) return NextResponse.json({ error: 'Không thể làm mới phiên đăng nhập.' }, { status: 503 });
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) return NextResponse.json({ error: 'Phiên đăng nhập đã hết hạn.' }, { status: 401 });
    return NextResponse.json({ token: data.session.access_token, refreshToken: data.session.refresh_token }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Không thể làm mới phiên đăng nhập.' }, { status: 503 });
  }
}
