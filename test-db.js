const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://zspazvdyrrkdosqigomk.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY');
async function run() {
  const { data, error } = await supabase.from('fact_dam').select('ma_dam, nguoi_mat, ngay_liem, tg_liem, ngay_di_quan, tg_di_quan').limit(5);
  console.log(data, error);
}
run();
