// Script to create stocktake tables via Supabase Management API
const SUPABASE_URL = 'https://zspazvdyrrkdosqigomk.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY';

const sql1 = `CREATE TABLE IF NOT EXISTS fact_kiem_kho (
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
)`;

const sql2 = `CREATE TABLE IF NOT EXISTS fact_kiem_kho_items (
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
)`;

const sql3 = `CREATE INDEX IF NOT EXISTS idx_kiem_kho_kho_id ON fact_kiem_kho(kho_id)`;
const sql4 = `CREATE INDEX IF NOT EXISTS idx_kiem_kho_items_kiem_kho_id ON fact_kiem_kho_items(kiem_kho_id)`;
const sql5 = `ALTER TABLE fact_kiem_kho ENABLE ROW LEVEL SECURITY`;
const sql6 = `ALTER TABLE fact_kiem_kho_items ENABLE ROW LEVEL SECURITY`;

async function runSQL(sql, label) {
  try {
    // Try exec_sql first
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ sql }),
    });
    const text = await res.text();
    console.log(`[${label}] Status: ${res.status} - ${text.substring(0, 100)}`);
    return res.ok;
  } catch (e) {
    console.log(`[${label}] Error: ${e.message}`);
    return false;
  }
}

async function testTable() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/fact_kiem_kho?select=id&limit=1`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
    });
    const text = await res.text();
    console.log(`\n[TEST] fact_kiem_kho query: Status ${res.status} - ${text.substring(0, 200)}`);
    return res.ok;
  } catch (e) {
    console.log(`[TEST] Error: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('=== Testing if tables already exist ===');
  const exists = await testTable();
  if (exists) {
    console.log('\n✅ Tables already exist! No migration needed.');
    return;
  }

  console.log('\n=== Attempting to create tables via RPC ===');
  for (const [sql, label] of [[sql1, 'fact_kiem_kho'], [sql2, 'fact_kiem_kho_items'], [sql3, 'idx_kho'], [sql4, 'idx_items'], [sql5, 'rls_kho'], [sql6, 'rls_items']]) {
    await runSQL(sql, label);
  }

  console.log('\n=== Verifying... ===');
  const ok = await testTable();
  if (ok) {
    console.log('\n✅ Migration successful!');
  } else {
    console.log('\n❌ Migration failed. Please run SQL manually in Supabase Dashboard > SQL Editor.');
    console.log('\nSQL to run:\n');
    console.log([sql1, sql2, sql3, sql4, sql5, sql6].join(';\n\n') + ';');
  }
}

main();
