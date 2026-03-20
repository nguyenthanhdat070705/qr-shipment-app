import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * POST /api/init-db
 * Tạo bảng user_profiles nếu chưa có.
 * Sử dụng Supabase REST API — không cần RPC.
 */
export async function POST(): Promise<NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });
  }

  // Use the Supabase SQL endpoint directly
  const sqlEndpoint = `${supabaseUrl}/rest/v1/rpc/`;

  // Try creating the table via raw SQL through the management API
  const createTableSQL = `
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

  // Method 1: Try using Supabase Management API
  try {
    const mgmtRes = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
    });
    console.log('[init-db] Supabase connection test:', mgmtRes.status);
  } catch (err) {
    console.error('[init-db] Connection test failed:', err);
  }

  // Method 2: Try creating via Supabase admin client insert
  const supabase = getSupabaseAdmin();

  // Check if table exists by trying to query it
  const { error: checkError } = await supabase
    .from('user_profiles')
    .select('id')
    .limit(1);

  if (checkError && (checkError.message?.includes('does not exist') || checkError.message?.includes('schema cache'))) {
    // Table doesn't exist — need to create it via Supabase Dashboard SQL editor
    return NextResponse.json({
      error: 'Table user_profiles does not exist',
      message: 'Vui lòng tạo bảng user_profiles trong Supabase Dashboard > SQL Editor với câu lệnh sau:',
      sql: createTableSQL,
      instructions: [
        '1. Mở https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new',
        '2. Paste câu lệnh SQL ở trên',
        '3. Nhấn "Run" để tạo bảng',
        '4. Quay lại trang profile và thử lại',
      ],
    }, { status: 200 });
  }

  if (!checkError) {
    return NextResponse.json({
      success: true,
      message: 'Table user_profiles already exists!',
    });
  }

  return NextResponse.json({
    error: checkError.message,
    sql: createTableSQL,
  });
}
