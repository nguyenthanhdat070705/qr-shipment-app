/**
 * ═══════════════════════════════════════════════════════════════
 * CLEAN TOÀN BỘ DỮ LIỆU XUẤT HÀNG TEST
 * Script này xóa tất cả dữ liệu xuất kho test để bắt đầu
 * sử dụng cho doanh nghiệp thực tế.
 * ═══════════════════════════════════════════════════════════════
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://woqtdgzldkxmcgjshthx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcXRkZ3psZGt4bWNnanNodGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgxNjIwNywiZXhwIjoyMDg5MzkyMjA3fQ.jGZlG0GWc1eZRaHd0FtFtGcYiDe18Nu_YoWkAyXiGWM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  🧹 CLEAN DỮ LIỆU XUẤT HÀNG TEST');
  console.log('  Bắt đầu sử dụng cho doanh nghiệp');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  let totalCleaned = 0;

  // ─── 1. Xóa toàn bộ export_confirmations ───────────────────
  console.log('📋 [1/5] Xóa export_confirmations...');
  try {
    // Xóa tất cả bản ghi (dùng RPC exec_sql vì bảng dùng raw SQL tạo)
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `DELETE FROM export_confirmations; ALTER SEQUENCE export_confirmations_stt_seq RESTART WITH 1;`
    });
    if (error) {
      // Thử fallback nếu RPC không work
      console.log('   ⚠️ RPC failed, thử SDK delete...');
      const { error: e2 } = await supabase
        .from('export_confirmations')
        .delete()
        .gte('stt', 0);
      if (e2) {
        console.log('   ❌ Lỗi:', e2.message);
      } else {
        console.log('   ✅ Đã xóa (SDK), nhưng không reset sequence');
        totalCleaned++;
      }
    } else {
      console.log('   ✅ Đã xóa toàn bộ và reset STT về 1');
      totalCleaned++;
    }
  } catch (err) {
    console.log('   ❌ Exception:', err.message);
  }

  // ─── 2. Xóa fact_xuat_hang_items (phải xóa trước parent) ──
  console.log('\n📦 [2/5] Xóa fact_xuat_hang_items...');
  try {
    const { data: items } = await supabase
      .from('fact_xuat_hang_items')
      .select('id');
    
    if (items && items.length > 0) {
      const { error } = await supabase
        .from('fact_xuat_hang_items')
        .delete()
        .in('id', items.map(i => i.id));
      if (error) {
        console.log('   ❌ Lỗi:', error.message);
      } else {
        console.log(`   ✅ Đã xóa ${items.length} chi tiết xuất`);
        totalCleaned++;
      }
    } else {
      console.log('   ℹ️ Không có dữ liệu (đã sạch)');
    }
  } catch (err) {
    console.log('   ❌ Exception:', err.message);
  }

  // ─── 3. Xóa fact_xuat_hang ────────────────────────────────
  console.log('\n📄 [3/5] Xóa fact_xuat_hang...');
  try {
    const { data: xuatHang } = await supabase
      .from('fact_xuat_hang')
      .select('id');
    
    if (xuatHang && xuatHang.length > 0) {
      const { error } = await supabase
        .from('fact_xuat_hang')
        .delete()
        .in('id', xuatHang.map(i => i.id));
      if (error) {
        console.log('   ❌ Lỗi:', error.message);
      } else {
        console.log(`   ✅ Đã xóa ${xuatHang.length} phiếu xuất`);
        totalCleaned++;
      }
    } else {
      console.log('   ℹ️ Không có dữ liệu (đã sạch)');
    }
  } catch (err) {
    console.log('   ❌ Exception:', err.message);
  }

  // ─── 4. Xóa product_logs loại confirmed_export ────────────
  console.log('\n📝 [4/5] Xóa product_logs (confirmed_export)...');
  try {
    const { data: logs } = await supabase
      .from('product_logs')
      .select('id')
      .eq('action_type', 'confirmed_export');
    
    if (logs && logs.length > 0) {
      const { error } = await supabase
        .from('product_logs')
        .delete()
        .eq('action_type', 'confirmed_export');
      if (error) {
        console.log('   ❌ Lỗi:', error.message);
      } else {
        console.log(`   ✅ Đã xóa ${logs.length} log xuất kho`);
        totalCleaned++;
      }
    } else {
      console.log('   ℹ️ Không có log (đã sạch)');
    }
  } catch (err) {
    console.log('   ❌ Exception:', err.message);
  }

  // ─── 5. Xóa notifications loại export_alert ───────────────
  console.log('\n🔔 [5/5] Xóa notifications (export_alert)...');
  try {
    const { data: notifs } = await supabase
      .from('notifications')
      .select('id')
      .eq('type', 'export_alert');
    
    if (notifs && notifs.length > 0) {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('type', 'export_alert');
      if (error) {
        console.log('   ❌ Lỗi:', error.message);
      } else {
        console.log(`   ✅ Đã xóa ${notifs.length} thông báo xuất kho`);
        totalCleaned++;
      }
    } else {
      console.log('   ℹ️ Không có thông báo (đã sạch)');
    }
  } catch (err) {
    console.log('   ❌ Exception:', err.message);
  }

  // ─── KẾT QUẢ ──────────────────────────────────────────────
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  ✅ HOÀN TẤT — ${totalCleaned}/5 bước thành công`);
  console.log('');
  console.log('  Dữ liệu đã clean:');
  console.log('  • export_confirmations → Xóa sạch, STT reset về 1');
  console.log('  • fact_xuat_hang + items → Xóa sạch');
  console.log('  • product_logs (confirmed_export) → Xóa sạch');
  console.log('  • notifications (export_alert) → Xóa sạch');
  console.log('');
  console.log('  ⚠️  Lưu ý: Tồn kho (fact_inventory) KHÔNG bị thay đổi.');
  console.log('  Nếu cần điều chỉnh tồn kho, hãy thao tác trong trang');
  console.log('  Kho hàng của hệ thống.');
  console.log('═══════════════════════════════════════════════════');
}

main().catch(console.error);
