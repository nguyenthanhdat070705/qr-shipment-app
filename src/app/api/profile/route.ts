import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * GET /api/profile?email=xxx
 * Lấy thông tin người dùng + lịch sử xuất hàng
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // 1. Lấy profile từ bảng user_profiles (tạo nếu chưa có)
  let profile: Record<string, unknown> | null = null;

  const { data: existingProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (profileError && profileError.code === 'PGRST116') {
    // Profile not found → create one
    const { data: newProfile } = await supabase
      .from('user_profiles')
      .insert({
        email,
        ho_ten: email.split('@')[0],
        chuc_vu: '',
        so_dien_thoai: '',
        phong_ban: '',
        ghi_chu: '',
      })
      .select('*')
      .single();
    profile = newProfile as Record<string, unknown> | null;
  } else if (profileError && profileError.code === '42P01') {
    // Table doesn't exist → create it
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS user_profiles (
          id SERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          ho_ten TEXT DEFAULT '',
          chuc_vu TEXT DEFAULT '',
          so_dien_thoai TEXT DEFAULT '',
          phong_ban TEXT DEFAULT '',
          ghi_chu TEXT DEFAULT '',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `,
    });

    const { data: newProfile } = await supabase
      .from('user_profiles')
      .insert({
        email,
        ho_ten: email.split('@')[0],
        chuc_vu: '',
        so_dien_thoai: '',
        phong_ban: '',
        ghi_chu: '',
      })
      .select('*')
      .single();
    profile = newProfile as Record<string, unknown> | null;
  } else {
    profile = existingProfile as Record<string, unknown> | null;
  }

  // If profile still null, return a fallback
  if (!profile) {
    profile = {
      email,
      ho_ten: email.split('@')[0],
      chuc_vu: '',
      so_dien_thoai: '',
      phong_ban: '',
      ghi_chu: '',
    };
  }

  // 2. Lấy lịch sử xuất hàng
  let exportHistory: Record<string, unknown>[] = [];
  const { data: exports, error: exportsError } = await supabase
    .from('export_confirmations')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: false });

  if (!exportsError && exports) {
    exportHistory = exports as Record<string, unknown>[];
  }

  return NextResponse.json({
    profile,
    exportHistory,
    totalExports: exportHistory.length,
  });
}

/**
 * PUT /api/profile
 * Cập nhật thông tin người dùng
 */
export async function PUT(req: NextRequest): Promise<NextResponse> {
  const supabase = getSupabaseAdmin();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { email, ho_ten, chuc_vu, so_dien_thoai, phong_ban, ghi_chu } = body;

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // Try to upsert
  const { data: updated, error: updateError } = await supabase
    .from('user_profiles')
    .upsert(
      {
        email,
        ho_ten: ho_ten || '',
        chuc_vu: chuc_vu || '',
        so_dien_thoai: so_dien_thoai || '',
        phong_ban: phong_ban || '',
        ghi_chu: ghi_chu || '',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    )
    .select('*')
    .single();

  if (updateError) {
    // If table doesn't exist, try creating it
    if (updateError.code === '42P01' || updateError.message?.includes('does not exist')) {
      await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS user_profiles (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            ho_ten TEXT DEFAULT '',
            chuc_vu TEXT DEFAULT '',
            so_dien_thoai TEXT DEFAULT '',
            phong_ban TEXT DEFAULT '',
            ghi_chu TEXT DEFAULT '',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `,
      });

      // Retry
      const { data: retryData, error: retryError } = await supabase
        .from('user_profiles')
        .upsert(
          {
            email,
            ho_ten: ho_ten || '',
            chuc_vu: chuc_vu || '',
            so_dien_thoai: so_dien_thoai || '',
            phong_ban: phong_ban || '',
            ghi_chu: ghi_chu || '',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'email' }
        )
        .select('*')
        .single();

      if (retryError) {
        return NextResponse.json({ error: retryError.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, profile: retryData });
    }

    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, profile: updated });
}
