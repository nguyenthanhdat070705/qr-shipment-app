const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addCols() {
  const sql = `
    ALTER TABLE IF EXISTS dim_ncc ADD COLUMN IF NOT EXISTS ghi_chu text DEFAULT '';
    ALTER TABLE IF EXISTS dim_ncc ADD COLUMN IF NOT EXISTS noi_dung text DEFAULT '';
    ALTER TABLE IF EXISTS dim_ncc ADD COLUMN IF NOT EXISTS thong_tin_lien_he text DEFAULT '';
    ALTER TABLE IF EXISTS dim_ncc ADD COLUMN IF NOT EXISTS thong_tin_hoa_don text DEFAULT '';
  `;
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  console.log('rpc result:', data, 'error:', error);
}

addCols();
