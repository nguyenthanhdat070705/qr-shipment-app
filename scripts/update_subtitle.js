const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/products-manage/ProductsManageClient.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `<p className="pm-subtitle">Tạo mã & quản lý danh mục hòm ({products.length} sản phẩm)</p>`;
const replacementStr = `<p className="pm-subtitle">
              <span className="pm-stat-pill pm-stat-total">Tổng sản phẩm: <strong>{products.length}</strong></span>
              <span className="pm-stat-pill pm-stat-active">Đang bán: <strong>{products.filter(p => p.is_active).length}</strong></span>
              <span className="pm-stat-pill pm-stat-inactive">Ngừng bán: <strong>{products.filter(p => !p.is_active).length}</strong></span>
            </p>`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(filePath, content);
  console.log("Successfully replaced subtitle.");
} else {
  console.log("Could not find the target string!");
}
