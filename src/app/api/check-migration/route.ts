import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  const supabase = createClient(supabaseUrl, serviceKey, {
    db: { schema: 'public' }
  });

  // Use the rpc to execute raw SQL via Supabase
  // First, let's try creating the table via REST by doing an insert test
  // If the table doesn't exist, we know we need to run the migration
  
  const { error: checkError } = await supabase
    .from('getfly_accounts')
    .select('id')
    .limit(1);

  if (checkError && checkError.message.includes('does not exist')) {
    // Table doesn't exist — need manual migration
    return NextResponse.json({
      status: 'migration_needed',
      message: 'Bảng getfly_accounts chưa tồn tại. Cần chạy SQL migration trong Supabase SQL Editor.',
      sql: `-- Copy and paste this SQL into Supabase SQL Editor:
-- https://supabase.com/dashboard/project/zspazvdyrrkdosqigomk/sql/new

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
CREATE INDEX IF NOT EXISTS idx_getfly_accounts_synced ON getfly_accounts(synced_at DESC);`,
    });
  }

  if (checkError) {
    return NextResponse.json({
      status: 'error',
      error: checkError.message,
    });
  }

  return NextResponse.json({
    status: 'ready',
    message: 'Bảng getfly_accounts đã tồn tại và sẵn sàng sync.',
  });
}
