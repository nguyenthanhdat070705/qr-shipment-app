const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('fact_nhap_hang').select('id, ma_phieu_nhap, trang_thai').then(res => console.log("DATA:", res.data, "ERR:", res.error));
