const fs = require('fs');
const path = require('path');

const clientFile = path.join(__dirname, '../src/app/products-manage/ProductsManageClient.tsx');
let content = fs.readFileSync(clientFile, 'utf8');

// 1. Interface
content = content.replace('gia_von: number;', 'gia_ban_1: number;');

// 2. EMPTY_FORM
content = content.replace('gia_von: 0,', 'gia_ban_1: 0,');

// 3. Form bindings
content = content.replace(
  `<label>Giá vốn (VNĐ)</label>
                    <input type="number" value={form.gia_ban} onChange={e => handleChange('gia_ban', Number(e.target.value))} placeholder="0" />`,
  `<label>Giá vốn (VNĐ)</label>
                    <input type="number" value={form.gia_ban} onChange={e => handleChange('gia_ban', Number(e.target.value))} placeholder="0" />`
);

content = content.replace(
  `<label>Giá bán (VNĐ)</label>
                    <input type="number" value={form.gia_von} onChange={e => handleChange('gia_von', Number(e.target.value))} placeholder="0" />`,
  `<label>Giá bán (VNĐ)</label>
                    <input type="number" value={form.gia_ban_1} onChange={e => handleChange('gia_ban_1', Number(e.target.value))} placeholder="0" />`
);

// 4. Table display
content = content.replace(
  `<td className="pm-td-price">{(p.gia_von || 0).toLocaleString('vi-VN')}₫</td>`,
  `<td className="pm-td-price">{(p.gia_ban_1 || 0).toLocaleString('vi-VN')}₫</td>`
);

// 5. Detailed view
content = content.replace(
  `<div><strong>Giá vốn:</strong> {(p.gia_von || 0).toLocaleString('vi-VN')}₫</div>`,
  `<div><strong>Giá vốn:</strong> {(p.gia_ban || 0).toLocaleString('vi-VN')}₫</div>`
);

fs.writeFileSync(clientFile, content);
console.log('Successfully updated file.');
