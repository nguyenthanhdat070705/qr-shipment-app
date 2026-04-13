const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://woqtdgzldkxmcgjshthx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcXRkZ3psZGt4bWNnanNodGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgxNjIwNywiZXhwIjoyMDg5MzkyMjA3fQ.jGZlG0GWc1eZRaHd0FtFtGcYiDe18Nu_YoWkAyXiGWM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  const { data: inv, error } = await supabase
    .from('fact_inventory')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  if (inv && inv.length > 0) {
    console.log("Columns in fact_inventory:");
    console.log(Object.keys(inv[0]));
    console.log("First row:", inv[0]);
  } else {
    console.log("fact_inventory is empty");
  }
  
  const { data: kho } = await supabase.from('dim_kho').select('*');
  console.log("Dim Kho:");
  kho?.forEach(k => console.log(k.id, k.ten_kho));
}

main();
