import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zspazvdyrrkdosqigomk.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  console.log('Đang chờ bảng sale_contracts được tạo...');
  while (true) {
    const { error } = await supabase.from('sale_contracts').select('id').limit(1);
    if (!error || !error.message.includes('does not exist')) {
      console.log('✅ Bảng sale_contracts đã sẵn sàng!');
      break;
    }
    await new Promise(r => setTimeout(r, 3000));
  }
}

check();
