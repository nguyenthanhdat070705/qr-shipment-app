import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zspazvdyrrkdosqigomk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const sql = `
    CREATE TABLE IF NOT EXISTS export_confirmations (
      stt SERIAL PRIMARY KEY,
      ma_san_pham TEXT NOT NULL,
      ho_ten TEXT NOT NULL,
      email TEXT NOT NULL,
      chuc_vu TEXT DEFAULT '',
      ghi_chu TEXT,
      ngay_xuat DATE DEFAULT CURRENT_DATE,
      thoi_gian_xuat TIME DEFAULT CURRENT_TIME,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success:', data);
  }
}

check();
