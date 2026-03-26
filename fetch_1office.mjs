import { writeFileSync } from 'fs';
import path from 'path';

const BASE = 'https://cloud-cloud.1office.vn';
const TOKEN = '84869196569c35038d0514699999665';

async function fetchSafe(endpoint) {
  const allData = [];
  let page = 1;
  const limit = 50; 
  
  console.log(`\nBắt đầu rút data từ: ${endpoint}`);
  
  while (true) {
    try {
      const url = `${BASE}${endpoint}?access_token=${TOKEN}&limit=${limit}&page=${page}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' } 
      });
      const text = await res.text();
      
      let json = null;
      try {
        json = JSON.parse(text);
      } catch (parseErr) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            json = JSON.parse(jsonMatch[0]);
          } catch (e2) {
            console.warn(`⚠️ [Trang ${page}] Dữ liệu lỗi JSON. Dừng rút.`);
            break;
          }
        } else {
          console.warn(`⚠️ [Trang ${page}] Bị chặn. Phản hồi: ${text.substring(0,50)}`);
          break;
        }
      }
      
      if (json.error === true) {
         console.warn(`⚠️ [Trang ${page}] 1Office báo lỗi: ${json.message}`);
         break;
      }
      
      if (!json.data || !Array.isArray(json.data) || json.data.length === 0) {
        console.log(`✅ [Trang ${page}] Hết dữ liệu.`);
        break;
      }
      
      allData.push(...json.data);
      console.log(`  -> Lấy trang ${page} (${json.data.length} bản ghi). Tổng ${allData.length}`);
      
      if (json.data.length < limit) break;
      
      page++;
      await new Promise(r => setTimeout(r, 1000));
      
    } catch (e) {
      console.error(`❌ Lỗi kết nối trang ${page}: ${e.message}`);
      break;
    }
  }
  return allData;
}

async function main() {
  const root = process.cwd();
  console.log('=== KỊCH BẢN RÚT DATA VÀO: ' + root + ' ===');

  const products = await fetchSafe('/api/warehouse/product/gets');
  writeFileSync(path.join(root, '1office_products.json'), JSON.stringify(products, null, 2));

  const receipts = await fetchSafe('/api/warehouse/receipt/gets');
  writeFileSync(path.join(root, '1office_receipts.json'), JSON.stringify(receipts, null, 2));
  
  const contracts = await fetchSafe('/api/sale/contract/gets');
  writeFileSync(path.join(root, '1office_contracts.json'), JSON.stringify(contracts, null, 2));

  console.log(`\n=> Cứu thành công: ${products.length} SP, ${receipts.length} Nhập kho, ${contracts.length} Hợp đồng.`);
}

main().catch(console.error);
