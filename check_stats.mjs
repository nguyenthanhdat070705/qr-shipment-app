import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const [invRes, khoRes] = await Promise.all([
     supabase.from('fact_inventory').select('*'),
     supabase.from('dim_kho').select('id, ma_kho, ten_kho'),
  ]);
  const inventory = invRes.data || [];
  const khoMap = new Map();
  for (const k of (khoRes.data || [])) {
    khoMap.set(k.id, k);
  }

  const groupMapFilter = new Map();
  const groupMapAll = new Map();

  const warehouseFilter = 'Kho Hàm Long';

  for (const row of inventory) {
    const homId = row['Tên hàng hóa'];
    const khoId = row['Kho'] || 'unknown';
    const kho = khoMap.get(khoId);

    // All
    const key = `${homId}_${khoId}`;
    if (groupMapAll.has(key)) {
       groupMapAll.get(key).qty += Number(row['Số lượng'] || 0);
    } else {
       groupMapAll.set(key, { qty: Number(row['Số lượng'] || 0) });
    }

    // Filter
    const khoName = kho?.ten_kho || '';
    if (!khoName.toLowerCase().includes(warehouseFilter.toLowerCase())) continue;

    if (groupMapFilter.has(key)) {
       groupMapFilter.get(key).qty += Number(row['Số lượng'] || 0);
    } else {
       groupMapFilter.set(key, { qty: Number(row['Số lượng'] || 0) });
    }
  }

  console.log("Total groups ALL:", groupMapAll.size);
  console.log(`Total groups ${warehouseFilter}:`, groupMapFilter.size);
}
check();
