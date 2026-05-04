const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://zspazvdyrrkdosqigomk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY'
);

async function createTables() {
  console.log('Creating fact_kiem_kho table...');
  
  // Test insert into fact_kiem_kho - if table doesn't exist, create via a workaround
  // Since Supabase REST API doesn't support DDL, let's try using the SQL via fetch to the management API
  
  const projectRef = 'zspazvdyrrkdosqigomk';
  const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY';
  
  const sql = `
    CREATE TABLE IF NOT EXISTS fact_kiem_kho (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      ma_phieu_kiem VARCHAR(50) NOT NULL UNIQUE,
      kho_id UUID,
      trang_thai VARCHAR(30) DEFAULT 'draft',
      nguoi_kiem_id UUID,
      nguoi_kiem_email VARCHAR(255),
      ngay_kiem DATE DEFAULT CURRENT_DATE,
      ghi_chu TEXT,
      tong_loai_kiem INT DEFAULT 0,
      tong_lech INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS fact_kiem_kho_items (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      kiem_kho_id UUID NOT NULL REFERENCES fact_kiem_kho(id) ON DELETE CASCADE,
      hom_id UUID,
      ma_hom VARCHAR(50) NOT NULL,
      ten_hom VARCHAR(255),
      so_luong_he_thong INT DEFAULT 0,
      so_luong_thuc_te INT DEFAULT 0,
      chenh_lech INT GENERATED ALWAYS AS (so_luong_thuc_te - so_luong_he_thong) STORED,
      ghi_chu TEXT,
      trang_thai VARCHAR(30) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_kiem_kho_kho ON fact_kiem_kho(kho_id);
    CREATE INDEX IF NOT EXISTS idx_kiem_kho_status ON fact_kiem_kho(trang_thai);
    CREATE INDEX IF NOT EXISTS idx_kiem_kho_items_header ON fact_kiem_kho_items(kiem_kho_id);
    CREATE INDEX IF NOT EXISTS idx_kiem_kho_items_hom ON fact_kiem_kho_items(ma_hom);
  `;

  // Try via Supabase HTTP SQL endpoint
  const dbUrl = `https://${projectRef}.supabase.co/sql`;
  try {
    const response = await fetch(dbUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });
    const status = response.status;
    const text = await response.text();
    console.log(`SQL endpoint: Status ${status}`);
    console.log('Response:', text.substring(0, 500));
  } catch (e) {
    console.log('SQL endpoint error:', e.message);
  }

  // Verify
  const { error: testErr } = await supabase.from('fact_kiem_kho').select('id').limit(1);
  if (!testErr) {
    console.log('\n✅ Tables created successfully!');
  } else {
    console.log('\n❌ Tables still not found:', testErr.message);
    console.log('\nPlease run the SQL from sql/migration_kiem_kho.sql in the Supabase Dashboard > SQL Editor.');
  }
}

createTables();
