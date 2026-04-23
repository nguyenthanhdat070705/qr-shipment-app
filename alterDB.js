const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function alter() {
  const query = \
    ALTER TABLE IF EXISTS dim_hom
    ADD COLUMN IF NOT EXISTS loai_hom text,
    ADD COLUMN IF NOT EXISTS kich_thuoc text,
    ADD COLUMN IF NOT EXISTS thong_so_khac text,
    ADD COLUMN IF NOT EXISTS do_day_thanh text,
    ADD COLUMN IF NOT EXISTS tinh_chat text,
    ADD COLUMN IF NOT EXISTS muc_dich_su_dung text;
  \;
  // We'll use the rpc call to execute raw sql, but if we don't have a pg_exec or query function, we can't do it via client.
  console.log('Use Supabase SQL editor to run this, or I can create an RPC to execute it, or use pg client.');
}
alter();
