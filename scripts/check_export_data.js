/**
 * Script kiểm tra dữ liệu xuất hàng test trước khi clean
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://woqtdgzldkxmcgjshthx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcXRkZ3psZGt4bWNnanNodGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgxNjIwNywiZXhwIjoyMDg5MzkyMjA3fQ.jGZlG0GWc1eZRaHd0FtFtGcYiDe18Nu_YoWkAyXiGWM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  KIỂM TRA DỮ LIỆU XUẤT HÀNG TEST');
  console.log('═══════════════════════════════════════════\n');

  // 1. export_confirmations
  const { data: exports, error: e1 } = await supabase
    .from('export_confirmations')
    .select('*')
    .order('stt', { ascending: true });
  
  if (e1) {
    console.log('[export_confirmations] Lỗi hoặc không tồn tại:', e1.message);
  } else {
    console.log(`[export_confirmations] Có ${exports?.length || 0} bản ghi:`);
    exports?.forEach(r => {
      console.log(`  STT=${r.stt} | SP=${r.ma_san_pham} | ${r.ho_ten} | ${r.ngay_xuat} | Ghi chú: ${r.ghi_chu}`);
    });
  }

  // 2. fact_xuat_hang
  const { data: xuat, error: e2 } = await supabase
    .from('fact_xuat_hang')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (e2) {
    console.log('\n[fact_xuat_hang] Lỗi:', e2.message);
  } else {
    console.log(`\n[fact_xuat_hang] Có ${xuat?.length || 0} phiếu xuất:`);
    xuat?.forEach(r => {
      console.log(`  ID=${r.id} | Mã=${r.ma_phieu_xuat} | Trạng thái=${r.trang_thai} | Khách=${r.ten_khach} | Ghi chú=${r.ghi_chu}`);
    });
  }

  // 3. fact_xuat_hang_items
  const { data: xuatItems, error: e3 } = await supabase
    .from('fact_xuat_hang_items')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (e3) {
    console.log('\n[fact_xuat_hang_items] Lỗi:', e3.message);
  } else {
    console.log(`\n[fact_xuat_hang_items] Có ${xuatItems?.length || 0} chi tiết xuất:`);
    xuatItems?.forEach(r => {
      console.log(`  ID=${r.id} | Mã Hòm=${r.ma_hom} | Tên=${r.ten_hom} | SL=${r.so_luong}`);
    });
  }

  // 4. fact_inventory - các dòng có số lượng = 0 hoặc bị trừ
  const { data: inv, error: e4 } = await supabase
    .from('fact_inventory')
    .select('*')
    .order('Mã', { ascending: true });
  
  if (e4) {
    console.log('\n[fact_inventory] Lỗi:', e4.message);
  } else {
    const zeroStock = inv?.filter(r => Number(r['Số lượng']) === 0) || [];
    console.log(`\n[fact_inventory] Tổng: ${inv?.length || 0} bản ghi, trong đó ${zeroStock.length} dòng SL = 0:`);
    zeroStock.forEach(r => {
      console.log(`  Mã=${r['Mã']} | Hàng hóa=${r['Tên hàng hóa']} | SL=${r['Số lượng']} | KhảDụng=${r['Ghi chú']}`);
    });
  }

  // 5. notifications liên quan xuất kho
  const { data: notifs, error: e5 } = await supabase
    .from('notifications')
    .select('*')
    .eq('type', 'export_alert');
  
  if (e5) {
    console.log('\n[notifications] Lỗi:', e5.message);
  } else {
    console.log(`\n[notifications] Có ${notifs?.length || 0} thông báo xuất kho`);
  }

  // 6. product_logs
  const { data: logs, error: e6 } = await supabase
    .from('product_logs')
    .select('*')
    .eq('action_type', 'confirmed_export');
  
  if (e6) {
    console.log('\n[product_logs] Lỗi hoặc không tồn tại:', e6.message);
  } else {
    console.log(`\n[product_logs] Có ${logs?.length || 0} log xuất kho`);
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('  HOÀN TẤT KIỂM TRA');
  console.log('═══════════════════════════════════════════');
}

main().catch(console.error);
