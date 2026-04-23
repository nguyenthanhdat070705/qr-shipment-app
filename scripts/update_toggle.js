const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/products-manage/ProductsManageClient.tsx');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

const newLines = [];
let i = 0;
while (i < lines.length) {
  const line = lines[i];

  // 1. Insert toggleActive before handleEdit
  if (line.includes('const handleEdit = (product: Product) => {')) {
    newLines.push(`  const toggleActive = async (p: Product) => {`);
    newLines.push(`    // Optimistic UI update`);
    newLines.push(`    setProducts(prev => prev.map(item => item.id === p.id ? { ...item, is_active: !p.is_active } : item));`);
    newLines.push(`    try {`);
    newLines.push(`      const res = await fetch('/api/products', {`);
    newLines.push(`        method: 'PUT',`);
    newLines.push(`        headers: { 'Content-Type': 'application/json' },`);
    newLines.push(`        body: JSON.stringify({ id: p.id, updated_by: userEmail, is_active: !p.is_active }),`);
    newLines.push(`      });`);
    newLines.push(`      if (!res.ok) {`);
    newLines.push(`        setProducts(prev => prev.map(item => item.id === p.id ? { ...item, is_active: !p.is_active } : item));`);
    newLines.push(`      }`);
    newLines.push(`    } catch {`);
    newLines.push(`      setProducts(prev => prev.map(item => item.id === p.id ? { ...item, is_active: !p.is_active } : item));`);
    newLines.push(`    }`);
    newLines.push(`  };`);
    newLines.push(``);
    newLines.push(line);
  }
  // 2. Insert <th> in header
  else if (line.includes('<th>Ảnh</th>') && lines[i-1].includes('<tr>') && lines[i-3].includes('<thead>')) {
    newLines.push(`                <th style={{ width: 60, padding: '0 10px', textAlign: 'center' }}></th>`);
    newLines.push(line);
  }
  // 3. Insert toggle in body inside <tr>
  else if (line.includes('ExpandedRow === p.id') || line.includes('<tr key={p.id} className={expandedRow === p.id')) {
    // Add opacity to the <tr> line itself
    const trLine = line.replace('>', '} style={{ opacity: p.is_active ? 1 : 0.6 }}>');
    newLines.push(trLine);
    
    // Add the toggle <td> directly after <tr>
    newLines.push(`                    <td>`);
    newLines.push(`                      <div className="pm-toggle-wrap" onClick={(e) => e.stopPropagation()}>`);
    newLines.push(`                        <label className="pm-toggle-switch" title={p.is_active ? 'Đang bán' : 'Ngừng bán'}>`);
    newLines.push(`                          <input`);
    newLines.push(`                            type="checkbox"`);
    newLines.push(`                            checked={!!p.is_active}`);
    newLines.push(`                            onChange={() => toggleActive(p)}`);
    newLines.push(`                          />`);
    newLines.push(`                          <span className="pm-toggle-slider"></span>`);
    newLines.push(`                        </label>`);
    newLines.push(`                      </div>`);
    newLines.push(`                    </td>`);
  }
  // 4. Update the image opacity wrapper
  else if (line.includes('<img src={p.hinh_anh} alt={p.ma_hom} />')) {
    newLines.push(line.replace('<img src={p.hinh_anh} alt={p.ma_hom} />', '<img src={p.hinh_anh} alt={p.ma_hom} style={{ filter: p.is_active ? \'none\' : \'grayscale(100%)\' }} />'));
  }
  else {
    newLines.push(line);
  }
  
  i++;
}

fs.writeFileSync(filePath, newLines.join('\n'));
console.log('Successfully injected toggle code without truncating.');
