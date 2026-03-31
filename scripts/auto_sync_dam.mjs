import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cấu hình thời gian: 10 phút
const SYNC_INTERVAL_MS = 10 * 60 * 1000; 

function runSync() {
  console.log(`\n======================================================`);
  console.log(`[${new Date().toLocaleString()}] 🔄 ĐANG BẮT ĐẦU ĐỒNG BỘ...`);
  console.log(`======================================================\n`);
  
  // Gọi file đồng bộ chính
  exec('node sync_gsheet_fact_dam.mjs', { cwd: __dirname }, (error, stdout, stderr) => {
    if (error) {
      console.error(`[${new Date().toLocaleString()}] ❌ LỖI KHI ĐỒNG BỘ:\n${error.message}`);
      return;
    }
    
    // In kết quả từ file gốc ra màn hình
    console.log(stdout);

    if (stderr && !stderr.includes('Debugger')) {
      console.error(`[${new Date().toLocaleString()}] ⚠️ CẢNH BÁO:\n${stderr}`);
    }
    
    console.log(`\n[${new Date().toLocaleString()}] ✅ ĐỒNG BỘ HOÀN TẤT! Chờ 10 phút để chạy lần tiếp theo...`);
  });
}

console.log(`
🎉 ĐÃ KÍCH HOẠT CHẾ ĐỘ TỰ ĐỘNG ĐỒNG BỘ DỮ LIỆU
⏳ Thời gian lặp lại: 10 phút / lần
⚠️  LƯU Ý: Vui lòng GIỮ MỞ CỬA SỔ TERMINAL NÀY để quá trình duy trì liên tục. Mũi tên cứ để đó không sao cả.
`);

// Chạy lần đầu tiên ngay lập tức
runSync();

// Đặt lịch lặp lại sau mỗi 10 phút
setInterval(runSync, SYNC_INTERVAL_MS);
