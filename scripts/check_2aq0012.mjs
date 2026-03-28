import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: homList } = await s.from('dim_hom').select('id,ma_hom,ten_hom').eq('ma_hom', '2AQ0012');
if (!homList || !homList[0]) { process.stdout.write('Not found\n'); process.exit(0); }

const homId = homList[0].id;
const { data: inv } = await s.from('fact_inventory').select('*').eq('Tén hang hoa', homId);

// Use raw column names
const { data: inv2 } = await s.from('fact_inventory').select('Ma,"So luong","Ghi chu","Kho","Ten hang hoa"').eq('"Ten hang hoa"', homId);

// Try select all
const { data: invAll, error: invErr } = await s.from('fact_inventory').select('*').eq('Tên hàng hóa', homId);

if (invErr) { process.stdout.write('Error: ' + invErr.message + '\n'); process.exit(1); }

const { data: khoList } = await s.from('dim_kho').select('id,ten_kho,ma_kho');
const khoMap = new Map((khoList || []).map(k => [k.id, k.ten_kho + ' (' + k.ma_kho + ')']));

process.stdout.write('2AQ0012 inventory rows: ' + (invAll || []).length + '\n');
for (const row of invAll || []) {
  const khoName = khoMap.get(row['Kho']) || row['Kho'];
  const sl = row['So luong'] || row['Số lượng'] || 0;
  const avail = row['Ghi chu'] || row['Ghi chú'] || 0;
  const id = row['Ma'] || row['Mã'];
  process.stdout.write('  Ma=' + id + ' | Kho=' + khoName + ' | SL=' + sl + ' | KhaDung=' + avail + '\n');
}
