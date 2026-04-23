import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://woqtdgzldkxmcgjshthx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcXRkZ3psZGt4bWNnanNodGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgxNjIwNywiZXhwIjoyMDg5MzkyMjA3fQ.jGZlG0GWc1eZRaHd0FtFtGcYiDe18Nu_YoWkAyXiGWM';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data, error } = await supabase.from('fact_inventory').select('*');
  if (error) { console.error(error); return; }
  
  let totalQty = 0;
  let kyGuiQty = 0;
  let daMuaQty = 0;
  
  for(const row of data) {
    const qty = Number(row['Số lượng']) || 0;
    totalQty += qty;
    if (row['Loại hàng'] === 'Ký gửi') kyGuiQty += qty;
    else daMuaQty += qty;
  }
  
  console.log(`Total rows: ${data.length}`);
  console.log(`Total So luong: ${totalQty}`);
  console.log(` - Ký gửi: ${kyGuiQty}`);
  console.log(` - Đã mua / Khác: ${daMuaQty}`);
  
  // also check duplicate items in same warehouse?
}

main();
