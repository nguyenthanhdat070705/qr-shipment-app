const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://woqtdgzldkxmcgjshthx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcXRkZ3psZGt4bWNnanNodGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgxNjIwNywiZXhwIjoyMDg5MzkyMjA3fQ.jGZlG0GWc1eZRaHd0FtFtGcYiDe18Nu_YoWkAyXiGWM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const dataSheet = [
  // Image 1 (Hàm Long)
  { "ma_hom": "2AQ0172", "kho_ten": "Hàm Long", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0173", "kho_ten": "Hàm Long", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0133", "kho_ten": "Hàm Long", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0128", "kho_ten": "Hàm Long", "so_luong": 6, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0129", "kho_ten": "Hàm Long", "so_luong": 3, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0130", "kho_ten": "Hàm Long", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0118", "kho_ten": "Hàm Long", "so_luong": 2, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0119", "kho_ten": "Hàm Long", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0163", "kho_ten": "Hàm Long", "so_luong": 2, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0002", "kho_ten": "Hàm Long", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0046", "kho_ten": "Hàm Long", "so_luong": 2, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0044", "kho_ten": "Hàm Long", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0039", "kho_ten": "Hàm Long", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0100", "kho_ten": "Hàm Long", "so_luong": 3, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0047", "kho_ten": "Hàm Long", "so_luong": 2, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0023", "kho_ten": "Hàm Long", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0175", "kho_ten": "Hàm Long", "so_luong": 2, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0120", "kho_ten": "Hàm Long", "so_luong": 0, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0116", "kho_ten": "Hàm Long", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0115", "kho_ten": "Hàm Long", "so_luong": 2, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0043", "kho_ten": "Hàm Long", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0110", "kho_ten": "Hàm Long", "so_luong": 2, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0149", "kho_ten": "Hàm Long", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0135", "kho_ten": "Hàm Long", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0171", "kho_ten": "Hàm Long", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0061", "kho_ten": "Hàm Long", "so_luong": 1, "loai_hang": "Ký gửi" },
  { "ma_hom": "2AQ0050", "kho_ten": "Hàm Long", "so_luong": 1, "loai_hang": "Ký gửi" },
  { "ma_hom": "2AQ0104", "kho_ten": "Hàm Long", "so_luong": 1, "loai_hang": "Ký gửi" },
  { "ma_hom": "2AQ0090", "kho_ten": "Hàm Long", "so_luong": 1, "loai_hang": "Ký gửi" },
  { "ma_hom": "2AQ0014", "kho_ten": "Hàm Long", "so_luong": 2, "loai_hang": "Ký gửi" },
  { "ma_hom": "2AQ0015", "kho_ten": "Hàm Long", "so_luong": 2, "loai_hang": "Ký gửi" },
  { "ma_hom": "2AQ0013", "kho_ten": "Hàm Long", "so_luong": 1, "loai_hang": "Ký gửi" },
  { "ma_hom": "2AQ0012", "kho_ten": "Hàm Long", "so_luong": 7, "loai_hang": "Ký gửi" },
  { "ma_hom": "2AQ0011", "kho_ten": "Hàm Long", "so_luong": 2, "loai_hang": "Ký gửi" },
  { "ma_hom": "2AQ0010", "kho_ten": "Hàm Long", "so_luong": 4, "loai_hang": "Ký gửi" },
  { "ma_hom": "2AQ0106", "kho_ten": "Hàm Long", "so_luong": 2, "loai_hang": "Ký gửi" },
  { "ma_hom": "2AQ0107", "kho_ten": "Hàm Long", "so_luong": 1, "loai_hang": "Ký gửi" },
  { "ma_hom": "2AQ0109", "kho_ten": "Hàm Long", "so_luong": 1, "loai_hang": "Ký gửi" },
  
  // Image 2,3 (Kha Vạn Cân)
  { "ma_hom": "2AQ0126", "kho_ten": "Kha Vạn Cân", "so_luong": 0, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0132", "kho_ten": "Kha Vạn Cân", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0133", "kho_ten": "Kha Vạn Cân", "so_luong": 2, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0134", "kho_ten": "Kha Vạn Cân", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0139", "kho_ten": "Kha Vạn Cân", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0131", "kho_ten": "Kha Vạn Cân", "so_luong": 0, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0125", "kho_ten": "Kha Vạn Cân", "so_luong": 0, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0127", "kho_ten": "Kha Vạn Cân", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0104", "kho_ten": "Kha Vạn Cân", "so_luong": 2, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0116", "kho_ten": "Kha Vạn Cân", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0040", "kho_ten": "Kha Vạn Cân", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0135", "kho_ten": "Kha Vạn Cân", "so_luong": 2, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0112", "kho_ten": "Kha Vạn Cân", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0061", "kho_ten": "Kha Vạn Cân", "so_luong": 0, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0136", "kho_ten": "Kha Vạn Cân", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0102", "kho_ten": "Kha Vạn Cân", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0047", "kho_ten": "Kha Vạn Cân", "so_luong": 3, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0148", "kho_ten": "Kha Vạn Cân", "so_luong": 0, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0009", "kho_ten": "Kha Vạn Cân", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0043", "kho_ten": "Kha Vạn Cân", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0046", "kho_ten": "Kha Vạn Cân", "so_luong": 2, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0039", "kho_ten": "Kha Vạn Cân", "so_luong": 2, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0042", "kho_ten": "Kha Vạn Cân", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0041", "kho_ten": "Kha Vạn Cân", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0044", "kho_ten": "Kha Vạn Cân", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0129", "kho_ten": "Kha Vạn Cân", "so_luong": 4, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0128", "kho_ten": "Kha Vạn Cân", "so_luong": 4, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0118", "kho_ten": "Kha Vạn Cân", "so_luong": 0, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0119", "kho_ten": "Kha Vạn Cân", "so_luong": 6, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0137", "kho_ten": "Kha Vạn Cân", "so_luong": 0, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0118", "kho_ten": "Kha Vạn Cân", "so_luong": 0, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0100", "kho_ten": "Kha Vạn Cân", "so_luong": 3, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0064", "kho_ten": "Kha Vạn Cân", "so_luong": 3, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0124", "kho_ten": "Kha Vạn Cân", "so_luong": 0, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0163", "kho_ten": "Kha Vạn Cân", "so_luong": 2, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0165", "kho_ten": "Kha Vạn Cân", "so_luong": 2, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0168", "kho_ten": "Kha Vạn Cân", "so_luong": 4, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0105", "kho_ten": "Kha Vạn Cân", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0075", "kho_ten": "Kha Vạn Cân", "so_luong": 0, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0010", "kho_ten": "Kha Vạn Cân", "so_luong": 4, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0011", "kho_ten": "Kha Vạn Cân", "so_luong": 6, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0012", "kho_ten": "Kha Vạn Cân", "so_luong": 4, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0106", "kho_ten": "Kha Vạn Cân", "so_luong": 3, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0107", "kho_ten": "Kha Vạn Cân", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0108", "kho_ten": "Kha Vạn Cân", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0014", "kho_ten": "Kha Vạn Cân", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0015", "kho_ten": "Kha Vạn Cân", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0172", "kho_ten": "Kha Vạn Cân", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0173", "kho_ten": "Kha Vạn Cân", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0174", "kho_ten": "Kha Vạn Cân", "so_luong": 2, "loai_hang": "Đã mua" },
  
  // Image 3,4 (Kinh Dương Vương)
  { "ma_hom": "2AQ0137", "kho_ten": "Kinh Dương Vương", "so_luong": 0, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0135", "kho_ten": "Kinh Dương Vương", "so_luong": 2, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0105", "kho_ten": "Kinh Dương Vương", "so_luong": 0, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0027", "kho_ten": "Kinh Dương Vương", "so_luong": 0, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0011", "kho_ten": "Kinh Dương Vương", "so_luong": 0, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0124", "kho_ten": "Kinh Dương Vương", "so_luong": 0, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0168", "kho_ten": "Kinh Dương Vương", "so_luong": 2, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0163", "kho_ten": "Kinh Dương Vương", "so_luong": 4, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0119", "kho_ten": "Kinh Dương Vương", "so_luong": 4, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0064", "kho_ten": "Kinh Dương Vương", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0157", "kho_ten": "Kinh Dương Vương", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0133", "kho_ten": "Kinh Dương Vương", "so_luong": 0, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0129", "kho_ten": "Kinh Dương Vương", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0128", "kho_ten": "Kinh Dương Vương", "so_luong": 3, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0118", "kho_ten": "Kinh Dương Vương", "so_luong": 0, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0100", "kho_ten": "Kinh Dương Vương", "so_luong": 2, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0112", "kho_ten": "Kinh Dương Vương", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0111", "kho_ten": "Kinh Dương Vương", "so_luong": 0, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0044", "kho_ten": "Kinh Dương Vương", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0039", "kho_ten": "Kinh Dương Vương", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0043", "kho_ten": "Kinh Dương Vương", "so_luong": 1, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0046", "kho_ten": "Kinh Dương Vương", "so_luong": 2, "loai_hang": "Đã mua" },
  { "ma_hom": "2AQ0012", "kho_ten": "Kinh Dương Vương", "so_luong": 1, "loai_hang": "Ký gửi" },
  { "ma_hom": "2AQ0011", "kho_ten": "Kinh Dương Vương", "so_luong": 1, "loai_hang": "Ký gửi" },
  { "ma_hom": "2AQ0010", "kho_ten": "Kinh Dương Vương", "so_luong": 0, "loai_hang": "Ký gửi" },
  { "ma_hom": "2AQ0106", "kho_ten": "Kinh Dương Vương", "so_luong": 1, "loai_hang": "Ký gửi" }
];

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  CẬP NHẬT TỒN KHO TỪ BẢNG MỚI NHẤT');
  console.log('═══════════════════════════════════════════════════\n');

  // 1. Nhóm và tính tổng quantity nếu có trùng ma_hom, kho_ten, loai_hang
  const groupedDataObj = {};
  for (const item of dataSheet) {
    const key = `${item.ma_hom}_${item.kho_ten}_${item.loai_hang}`;
    if (!groupedDataObj[key]) {
      groupedDataObj[key] = { ...item };
    } else {
      groupedDataObj[key].so_luong += item.so_luong;
    }
  }
  const groupedData = Object.values(groupedDataObj);

  // 2. Fetch dim_hom
  const { data: dimHom, error: errHom } = await supabase.from('dim_hom').select('id, ma_hom, ten_hom');
  if (errHom) {
    console.error("Lỗi lấy dim_hom:", errHom);
    return;
  }
  const homMap = {};
  dimHom.forEach(h => {
    homMap[h.ma_hom.toUpperCase()] = h.id;
  });

  // 3. Fetch dim_kho
  const { data: dimKho, error: errKho } = await supabase.from('dim_kho').select('id, ten_kho');
  if (errKho) {
    console.error("Lỗi lấy dim_kho:", errKho);
    return;
  }
  const khoMap = {};
  dimKho.forEach(k => {
    // Map cả tên đầy đủ và tên ngắn gọn
    khoMap[k.ten_kho] = k.id;
  });

  // 4. Xóa toàn bộ fact_inventory hiện có
  console.log("Xóa fact_inventory cũ...");
  const { error: delErr } = await supabase.from('fact_inventory').delete().neq('Mã', '00000000-0000-0000-0000-000000000000');
  if (delErr) {
    console.error("Lỗi xóa fact_inventory:", delErr);
    return;
  }
  console.log("Đã xóa xong. Chuẩn bị insert mới...");

  // 5. Build dữ liệu mới
  const insertRows = [];
  const notFoundProducts = new Set();
  
  for (const item of groupedData) {
    const homId = homMap[item.ma_hom.toUpperCase()];
    const khoId = khoMap[item.kho_ten] || khoMap['Kho ' + item.kho_ten]; // hỗ trợ nếu map bằng "Hàm Long" hoặc "Kho Hàm Long"
    
    if (!homId) {
      notFoundProducts.add(item.ma_hom);
      continue;
    }
    
    if (!khoId) {
      console.log(`Kho không hợp lệ: ${item.kho_ten}`);
      continue;
    }
    
    insertRows.push({
      "Tên hàng hóa": homId,
      "Kho": khoId,
      "Số lượng": item.so_luong,
      "Ghi chú": item.so_luong, // Khả dụng = Tổng
      "Loại hàng": item.loai_hang
    });
  }

  if (notFoundProducts.size > 0) {
    console.log("\n⚠️ Các mã không tìm thấy trong danh mục (dim_hom) và sẽ bị bỏ qua:");
    console.log(Array.from(notFoundProducts).join(', '));
  }

  if (insertRows.length === 0) {
    console.log("Không có dòng nào hợp lệ để thêm!");
    return;
  }

  // Chia nhỏ ra insert nếu nhiều
  const BATCH_SIZE = 50;
  for (let i = 0; i < insertRows.length; i += BATCH_SIZE) {
    const chunk = insertRows.slice(i, i + BATCH_SIZE);
    const { error: insErr } = await supabase.from('fact_inventory').insert(chunk);
    if (insErr) {
      console.error(`Lỗi insert batch ${i}:`, insErr);
    } else {
      console.log(`Đã insert batch từ ${i} đến ${i + chunk.length - 1}...`);
    }
  }

  console.log(`\n✅ Hoàn tất! Đã cập nhật ${insertRows.length} mục vào kho.`);
}

main();
