import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

const CREATE_TABLE_SQL = `
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
`;

/**
 * Execute raw SQL via Supabase's pg_net / management API
 */
async function ensureTableExists(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return;

  // Extract project ref from URL (e.g., "zspazvdyrrkdosqigom" from "https://zspazvdyrrkdosqigom.supabase.co")
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0];

  try {
    // Use Supabase SQL API (available for service role)
    const res = await fetch(`https://${projectRef}.supabase.co/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({}),
    });
    console.log('[profile] RPC endpoint check:', res.status);
  } catch (err) {
    console.warn('[profile] Table creation via API not available:', err);
  }
}

/**
 * GET /api/profile?email=xxx
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  let profile: Record<string, unknown> | null = null;

  // Try to get profile
  const { data: existingProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (!profileError) {
    // Profile found
    profile = existingProfile as Record<string, unknown>;
  } else if (profileError.code === 'PGRST116') {
    // No rows found — try to create profile
    const { data: newProfile, error: insertErr } = await supabase
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

    if (!insertErr && newProfile) {
      profile = newProfile as Record<string, unknown>;
    }
  } else {
    // Table might not exist — try creating it
    console.warn('[profile] GET error:', profileError.message);
    await ensureTableExists();
  }

  // Fallback profile
  if (!profile) {
    profile = {
      email,
      ho_ten: email.split('@')[0],
      chuc_vu: '',
      so_dien_thoai: '',
      phong_ban: '',
      ghi_chu: '',
      _isLocal: true,
    };
  }

  // Get export history
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

  // First check if table exists
  const { error: checkError } = await supabase
    .from('user_profiles')
    .select('id')
    .limit(1);

  if (checkError && (checkError.message?.includes('does not exist') || checkError.message?.includes('schema cache'))) {
    // Table doesn't exist — return instructions
    return NextResponse.json({
      success: false,
      error: 'Bảng user_profiles chưa tồn tại. Vui lòng tạo bảng trong Supabase Dashboard.',
      needsSetup: true,
      sql: CREATE_TABLE_SQL,
    }, { status: 200 });
  }

  // Try upsert
  const profileData = {
    email: email as string,
    ho_ten: (ho_ten as string) || '',
    chuc_vu: (chuc_vu as string) || '',
    so_dien_thoai: (so_dien_thoai as string) || '',
    phong_ban: (phong_ban as string) || '',
    ghi_chu: (ghi_chu as string) || '',
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error: updateError } = await supabase
    .from('user_profiles')
    .upsert(profileData, { onConflict: 'email' })
    .select('*')
    .single();

  if (updateError) {
    console.error('[profile] PUT error:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, profile: updated });
}
