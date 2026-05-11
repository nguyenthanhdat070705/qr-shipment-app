import { NextResponse } from 'next/server';

// This route uses Supabase Management API to run SQL
export async function POST() {
  const projectRef = 'zspazvdyrrkdosqigomk';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  const sql = `
    CREATE TABLE IF NOT EXISTS getfly_accounts (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      getfly_account_id TEXT UNIQUE NOT NULL,
      account_code TEXT,
      account_name TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      description TEXT,
      account_type TEXT,
      account_source TEXT,
      relation_name TEXT,
      industry_name TEXT,
      manager_email TEXT,
      manager_user_name TEXT,
      ma_hoi_vien TEXT,
      goi_dich_vu TEXT,
      trang_thai_hoi_vien TEXT,
      ngay_tham_gia TEXT,
      ho_ten_nguoi_mat TEXT,
      ngay_mat TEXT,
      thoi_gian_to_chuc_dam TEXT,
      dia_chi_chon_cat TEXT,
      dia_chi_lien_he TEXT,
      so_cccd TEXT,
      so_tk_ngan_hang TEXT,
      ten_ngan_hang TEXT,
      contact_name TEXT,
      contact_phone TEXT,
      province_name TEXT,
      revenue NUMERIC DEFAULT 0,
      gdrive_folder_id TEXT,
      gdrive_folder_url TEXT,
      getfly_created_at TEXT,
      synced_at TIMESTAMPTZ DEFAULT NOW(),
      raw_data JSONB
    );

    CREATE INDEX IF NOT EXISTS idx_getfly_accounts_name ON getfly_accounts(account_name);
    CREATE INDEX IF NOT EXISTS idx_getfly_accounts_phone ON getfly_accounts(phone);
    CREATE INDEX IF NOT EXISTS idx_getfly_accounts_code ON getfly_accounts(account_code);
    CREATE INDEX IF NOT EXISTS idx_getfly_accounts_type ON getfly_accounts(account_type);
    CREATE INDEX IF NOT EXISTS idx_getfly_accounts_relation ON getfly_accounts(relation_name);
    CREATE INDEX IF NOT EXISTS idx_getfly_accounts_hoi_vien ON getfly_accounts(ma_hoi_vien);
    CREATE INDEX IF NOT EXISTS idx_getfly_accounts_cccd ON getfly_accounts(so_cccd);
    CREATE INDEX IF NOT EXISTS idx_getfly_accounts_synced ON getfly_accounts(synced_at DESC);
  `;

  // Use Supabase postgres REST endpoint to execute SQL
  try {
    const res = await fetch(`https://${projectRef}.supabase.co/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    // If rpc doesn't work, try the pg_query approach
    if (!res.ok) {
      // Alternative: Use the database connection directly via psql-like endpoint
      // Try via Supabase's built-in SQL execution
      const pgRes = await fetch(`https://${projectRef}.supabase.co/pg`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: sql }),
      });

      if (!pgRes.ok) {
        // Last resort: provide the SQL for manual execution
        return NextResponse.json({
          status: 'manual_required',
          message: 'Không thể tự chạy SQL migration. Vui lòng copy SQL bên dưới và chạy trong Supabase SQL Editor.',
          sql_editor_url: `https://supabase.com/dashboard/project/${projectRef}/sql/new`,
          sql: sql.trim(),
        });
      }

      const pgData = await pgRes.json();
      return NextResponse.json({ status: 'success_pg', data: pgData });
    }

    const data = await res.json();
    return NextResponse.json({ status: 'success_rpc', data });
  } catch (err) {
    return NextResponse.json({
      status: 'manual_required',
      message: 'Lỗi khi chạy migration. Vui lòng chạy SQL migration thủ công.',
      error: String(err),
      sql_editor_url: `https://supabase.com/dashboard/project/${projectRef}/sql/new`,
      sql: sql.trim(),
    });
  }
}
