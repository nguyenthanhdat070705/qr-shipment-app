// Try creating tables via Supabase SQL query API (/pg/query endpoint)
const SUPABASE_URL = 'https://zspazvdyrrkdosqigomk.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY';

const fullSQL = `
CREATE TABLE IF NOT EXISTS fact_kiem_kho (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ma_phieu_kiem VARCHAR(50) NOT NULL UNIQUE,
  kho_id UUID,
  trang_thai VARCHAR(30) DEFAULT 'in_progress',
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
  ten_hom VARCHAR(500),
  so_luong_he_thong INT DEFAULT 0,
  so_luong_thuc_te INT DEFAULT 0,
  chenh_lech INT GENERATED ALWAYS AS (so_luong_thuc_te - so_luong_he_thong) STORED,
  ghi_chu TEXT,
  trang_thai VARCHAR(30) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE fact_kiem_kho ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_kiem_kho_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fact_kiem_kho' AND policyname='allow_all_kiem_kho') THEN
    CREATE POLICY allow_all_kiem_kho ON fact_kiem_kho FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fact_kiem_kho_items' AND policyname='allow_all_kiem_kho_items') THEN
    CREATE POLICY allow_all_kiem_kho_items ON fact_kiem_kho_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`;

async function main() {
  // Supabase project ref
  const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];
  console.log('Project ref:', projectRef);

  // Try various endpoints
  const endpoints = [
    { url: `${SUPABASE_URL}/pg/query`, body: { query: fullSQL } },
    { url: `https://api.supabase.com/v1/projects/${projectRef}/database/query`, body: { query: fullSQL } },
  ];

  for (const ep of endpoints) {
    console.log(`\nTrying: ${ep.url}`);
    try {
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify(ep.body),
      });
      const text = await res.text();
      console.log(`Status: ${res.status}`);
      console.log(`Response: ${text.substring(0, 300)}`);
      if (res.ok) {
        console.log('✅ Success!');
        break;
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }

  // Verify
  console.log('\n=== Verify ===');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/fact_kiem_kho?select=id&limit=1`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
  });
  console.log(`fact_kiem_kho: ${res.status} - ${(await res.text()).substring(0, 200)}`);
}

main().catch(console.error);
