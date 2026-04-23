const fs = require('fs');
const path = require('path');

const clientFile = path.join(__dirname, '../src/app/products-manage/ProductsManageClient.tsx');
let content = fs.readFileSync(clientFile, 'utf8');

// 1. Interface
content = content.replace('gia_von: number;', 'gia_ban_1: number;');

// 2. EMPTY_FORM
content = content.replace('gia_von: 0,', 'gia_ban_1: 0,');

// 3. SetForm when editing
// wait, we don't explicitly list fields there, it uses setForm(product) except we spread it.

// 4. Form bindings
content = content.replace(
  `<label>Giá bán (VNĐ)</label>
                    <input type="number" value={form.gia_ban} onChange={e => handleChange('gia_ban', Number(e.target.value))} placeholder="0" />`,
  `<label>Giá bán (VNĐ)</label>
                    <input type="number" value={form.gia_ban_1} onChange={e => handleChange('gia_ban_1', Number(e.target.value))} placeholder="0" />`
);

content = content.replace(
  `<label>Giá vốn (VNĐ)</label>
                    <input type="number" value={form.gia_von} onChange={e => handleChange('gia_von', Number(e.target.value))} placeholder="0" />`,
  `<label>Giá vốn (VNĐ)</label>
                    <input type="number" value={form.gia_ban} onChange={e => handleChange('gia_ban', Number(e.target.value))} placeholder="0" />`
);

// 5. Table display (Giá bán mapped to gia_ban_1)
content = content.replace(
  `<td className="pm-td-price">{(p.gia_von || 0).toLocaleString('vi-VN')}₫</td>`,
  `<td className="pm-td-price">{(p.gia_ban_1 || 0).toLocaleString('vi-VN')}₫</td>`
);

content = content.replace(
  `<td className="pm-td-price">{(p.gia_ban || 0).toLocaleString('vi-VN')}₫</td>`,
  `<td className="pm-td-price">{(p.gia_ban_1 || 0).toLocaleString('vi-VN')}₫</td>`
);

// 6. Detailed view (Giá vốn mapped to gia_ban)
content = content.replace(
  `<div><strong>Giá vốn:</strong> {(p.gia_ban || 0).toLocaleString('vi-VN')}₫</div>`,
  `<div><strong>Giá vốn:</strong> {(p.gia_ban || 0).toLocaleString('vi-VN')}₫</div>`
);
content = content.replace(
  `<div><strong>Giá vốn:</strong> {(p.gia_von || 0).toLocaleString('vi-VN')}₫</div>`,
  `<div><strong>Giá vốn:</strong> {(p.gia_ban || 0).toLocaleString('vi-VN')}₫</div>`
);

fs.writeFileSync(clientFile, content);
console.log('Updated ProductsManageClient.tsx');


const apiFile = path.join(__dirname, '../src/app/api/products/route.ts');
let apiContent = fs.readFileSync(apiFile, 'utf8');

apiContent = apiContent.replace('gia_ban: gia_ban || 0,', 'gia_ban: gia_ban || 0,\n    gia_ban_1: body.gia_ban_1 || 0,');
// Remove old gia_von insert
apiContent = apiContent.replace('gia_von: gia_von || 0,\n', '');
fs.writeFileSync(apiFile, apiContent);
console.log('Updated route.ts');

