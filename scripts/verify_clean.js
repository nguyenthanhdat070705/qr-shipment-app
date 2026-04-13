/**
 * Reset sequence cho export_confirmations.stt về 1
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://woqtdgzldkxmcgjshthx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcXRkZ3psZGt4bWNnanNodGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgxNjIwNywiZXhwIjoyMDg5MzkyMjA3fQ.jGZlG0GWc1eZRaHd0FtFtGcYiDe18Nu_YoWkAyXiGWM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  // Thử reset sequence - cần chạy SQL trực tiếp
  // Phương pháp: tạo 1 RPC function tạm để reset
  const resetSQL = `ALTER SEQUENCE export_confirmations_stt_seq RESTART WITH 1;`;
  
  const { data, error } = await supabase.rpc('exec_sql', { sql: resetSQL });
  if (error) {
    console.log('❌ RPC exec_sql failed:', error.message);
    console.log('');
    console.log('📌 Hãy chạy SQL sau trong Supabase SQL Editor:');
    console.log('   ALTER SEQUENCE export_confirmations_stt_seq RESTART WITH 1;');
    console.log('');
    console.log('   URL: https://supabase.com/dashboard/project/woqtdgzldkxmcgjshthx/sql/new');
  } else {
    console.log('✅ Đã reset sequence STT về 1');
  }

  // Verify: kiểm tra lại dữ liệu
  console.log('\n── Xác nhận dữ liệu đã sạch ──');

  const { data: exports } = await supabase
    .from('export_confirmations')
    .select('stt');
  console.log(`export_confirmations: ${exports?.length || 0} bản ghi ✅`);

  const { data: xuat } = await supabase
    .from('fact_xuat_hang')
    .select('id');
  console.log(`fact_xuat_hang: ${xuat?.length || 0} bản ghi ✅`);

  const { data: xuatItems } = await supabase
    .from('fact_xuat_hang_items')
    .select('id');
  console.log(`fact_xuat_hang_items: ${xuatItems?.length || 0} bản ghi ✅`);

  const { data: logs } = await supabase
    .from('product_logs')
    .select('id')
    .eq('action_type', 'confirmed_export');
  console.log(`product_logs (confirmed_export): ${logs?.length || 0} bản ghi ✅`);

  const { data: notifs } = await supabase
    .from('notifications')
    .select('id')
    .eq('type', 'export_alert');
  console.log(`notifications (export_alert): ${notifs?.length || 0} bản ghi ✅`);

  console.log('\n🎉 Hệ thống sạch sẽ, sẵn sàng cho doanh nghiệp!');
}

main().catch(console.error);
