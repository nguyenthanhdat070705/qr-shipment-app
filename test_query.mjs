import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabase
      .from('fact_xuat_hang')
      .select(`
        id,
        ma_phieu_xuat,
        ten_khach,
        ghi_chu,
        trang_thai,
        nguoi_xuat_id,
        created_at,
        dim_kho ( id, ten_kho ),
        dim_account ( ho_ten, email ),
        fact_xuat_hang_items (
          ma_hom,
          ten_hom,
          so_luong,
          ghi_chu
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);

  console.log('Error:', error);
  console.log('Data:', data);
}

test();
