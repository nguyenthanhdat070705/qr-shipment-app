const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/products-manage/ProductsManageClient.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update Product interface
content = content.replace(
  /interface Product \{[\s\S]*?\}/,
`interface Product {
  id: string;
  ma_hom: string;
  ten_hom: string;
  gia_ban: number;
  gia_von: number;
  loai_hom: string;
  hinh_anh: string;
  kich_thuoc: string;
  thong_so_khac: string;
  don_vi_tinh: string;
  so_luong: number;
  is_active: boolean;
  created_at: string;
  Thanh: string;
  dac_diem: string;
  Muc_dich: string;
  ten_mkt: string;
  ten_hom_the_hien: string;
  ten_ky_thuat: string;
  ten_chuan_hoa: string;
  loai_go: string;
  Goi_dich_vu: string;
  Mau_sac: string;
  nhom_hang_hoa: string;
  loai_san_pham: string;
  Ton_giao: string;
  nap: string;
  Nguon_goc: string;
  Liet: string;
  be_mat: string;
}`
);

// 2. Update EMPTY_FORM
content = content.replace(
  /const EMPTY_FORM = \{[\s\S]*?\};/,
`const EMPTY_FORM = {
  ma_hom: '',
  ten_hom: '',
  gia_ban: 0,
  gia_von: 0,
  loai_hom: '',
  hinh_anh: '',
  kich_thuoc: '',
  thong_so_khac: '',
  don_vi_tinh: 'Cái',
  Thanh: '',
  dac_diem: '',
  Muc_dich: '',
  ten_mkt: '',
  ten_hom_the_hien: '',
  ten_ky_thuat: '',
  ten_chuan_hoa: '',
  loai_go: '',
  Goi_dich_vu: '',
  Mau_sac: '',
  nhom_hang_hoa: '',
  loai_san_pham: '',
  Ton_giao: '',
  nap: '',
  Nguon_goc: '',
  Liet: '',
  be_mat: '',
};`
);

// 3. Update handleEdit
content = content.replace(
  /const handleEdit = \(product: Product\) => \{[\s\S]*?setShowForm\(true\);\r?\n  \};/,
`const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      ma_hom: product.ma_hom || '',
      ten_hom: product.ten_hom || '',
      gia_ban: product.gia_ban || 0,
      gia_von: product.gia_von || 0,
      loai_hom: product.loai_hom || '',
      hinh_anh: product.hinh_anh || '',
      kich_thuoc: product.kich_thuoc || '',
      thong_so_khac: product.thong_so_khac || '',
      don_vi_tinh: product.don_vi_tinh || 'Cái',
      Thanh: product.Thanh || '',
      dac_diem: product.dac_diem || '',
      Muc_dich: product.Muc_dich || '',
      ten_mkt: product.ten_mkt || '',
      ten_hom_the_hien: product.ten_hom_the_hien || '',
      ten_ky_thuat: product.ten_ky_thuat || '',
      ten_chuan_hoa: product.ten_chuan_hoa || '',
      loai_go: product.loai_go || '',
      Goi_dich_vu: product.Goi_dich_vu || '',
      Mau_sac: product.Mau_sac || '',
      nhom_hang_hoa: product.nhom_hang_hoa || '',
      loai_san_pham: product.loai_san_pham || '',
      Ton_giao: product.Ton_giao || '',
      nap: product.nap || '',
      Nguon_goc: product.Nguon_goc || '',
      Liet: product.Liet || '',
      be_mat: product.be_mat || '',
    });
    setShowForm(true);
  };`
);

// 4. Update the filter
content = content.replace(
  /(p\.NCC \|\| '')\.toLowerCase\(\)\.includes\(q\)/,
  `(p.Nguon_goc || '').toLowerCase().includes(q)`
);

// 5. Update Table Header
content = content.replace(
  /<th>Tính chất<\/th>[\s\S]*?<th>ĐVT<\/th>[\s\S]*?<th>NCC<\/th>/,
  `<th>Đặc điểm</th>\n                <th>ĐVT</th>\n                <th>Nguồn gốc</th>`
);

// 6. Update Table Body cells
content = content.replace(
  /<td className="pm-td-text">\{p\.tinh_chat || '—'\}<\/td>[\s\S]*?<td>\{p\.don_vi_tinh\}<\/td>[\s\S]*?<td>\{p\.NCC || '—'\}<\/td>/,
  `<td className="pm-td-text">{p.dac_diem || '—'}</td>\n                    <td>{p.don_vi_tinh}</td>\n                    <td>{p.Nguon_goc || '—'}</td>`
);

// 7. Update JSX form grid completely
const newFormContent = `
              <div className="pm-form-section">
                <h3 className="pm-form-section-title">Thông tin cơ bản</h3>
                <div className="pm-form-grid">
                  <div className="pm-field">
                    <label>Mã hòm <span className="pm-required">*</span></label>
                    <input type="text" value={form.ma_hom} onChange={e => handleChange('ma_hom', e.target.value.toUpperCase())} placeholder="VD: 2AQ0012" disabled={!!editingId} required />
                  </div>
                  <div className="pm-field">
                    <label>Tên hòm <span className="pm-required">*</span></label>
                    <input type="text" value={form.ten_hom} onChange={e => handleChange('ten_hom', e.target.value)} placeholder="VD: Hòm Anh Quốc 12" required />
                  </div>
                  <div className="pm-field">
                    <label>Nguồn gốc</label>
                    <input type="text" value={form.Nguon_goc} onChange={e => handleChange('Nguon_goc', e.target.value)} placeholder="VD: Nhập khẩu..." />
                  </div>
                  <div className="pm-field">
                    <label>Nhóm hàng hóa</label>
                    <input type="text" value={form.nhom_hang_hoa} onChange={e => handleChange('nhom_hang_hoa', e.target.value)} placeholder="VD: Quan tài..." />
                  </div>
                  <div className="pm-field">
                    <label>Loại sản phẩm</label>
                    <input type="text" value={form.loai_san_pham} onChange={e => handleChange('loai_san_pham', e.target.value)} placeholder="VD: SP Tiêu chuẩn..." />
                  </div>
                  <div className="pm-field">
                    <label>Loại hòm</label>
                    <input type="text" value={form.loai_hom} onChange={e => handleChange('loai_hom', e.target.value)} placeholder="VD: Hòm gỗ..." />
                  </div>
                </div>
              </div>

              <div className="pm-form-section">
                <h3 className="pm-form-section-title">Tên gọi mở rộng & Dịch vụ</h3>
                <div className="pm-form-grid">
                  <div className="pm-field">
                    <label>Tên Marketing</label>
                    <input type="text" value={form.ten_mkt} onChange={e => handleChange('ten_mkt', e.target.value)} placeholder="..." />
                  </div>
                  <div className="pm-field">
                    <label>Tên hòm thể hiện</label>
                    <input type="text" value={form.ten_hom_the_hien} onChange={e => handleChange('ten_hom_the_hien', e.target.value)} placeholder="..." />
                  </div>
                  <div className="pm-field">
                    <label>Tên kỹ thuật</label>
                    <input type="text" value={form.ten_ky_thuat} onChange={e => handleChange('ten_ky_thuat', e.target.value)} placeholder="..." />
                  </div>
                  <div className="pm-field">
                    <label>Tên chuẩn hóa</label>
                    <input type="text" value={form.ten_chuan_hoa} onChange={e => handleChange('ten_chuan_hoa', e.target.value)} placeholder="..." />
                  </div>
                  <div className="pm-field">
                    <label>Gói dịch vụ</label>
                    <input type="text" value={form.Goi_dich_vu} onChange={e => handleChange('Goi_dich_vu', e.target.value)} placeholder="VD: Tiêu chuẩn, Cao cấp..." />
                  </div>
                  <div className="pm-field">
                    <label>Tôn giáo</label>
                    <input type="text" value={form.Ton_giao} onChange={e => handleChange('Ton_giao', e.target.value)} placeholder="VD: Phật giáo, Công giáo..." />
                  </div>
                </div>
              </div>

              <div className="pm-form-section">
                <h3 className="pm-form-section-title">Thông số kỹ thuật</h3>
                <div className="pm-form-grid">
                  <div className="pm-field">
                    <label>Kích thước</label>
                    <input type="text" value={form.kich_thuoc} onChange={e => handleChange('kich_thuoc', e.target.value)} placeholder="VD: 200x60x50 cm" />
                  </div>
                  <div className="pm-field">
                    <label>Độ dày thành (Thành)</label>
                    <input type="text" value={form.Thanh} onChange={e => handleChange('Thanh', e.target.value)} placeholder="VD: 2.5 cm" />
                  </div>
                  <div className="pm-field">
                    <label>Đơn vị tính</label>
                    <input type="text" value={form.don_vi_tinh} onChange={e => handleChange('don_vi_tinh', e.target.value)} placeholder="VD: Cái, Bộ..." />
                  </div>
                  <div className="pm-field">
                    <label>Đặc điểm (Tính chất)</label>
                    <input type="text" value={form.dac_diem} onChange={e => handleChange('dac_diem', e.target.value)} placeholder="VD: VIP, Mép Vàng..." />
                  </div>
                  <div className="pm-field">
                    <label>Loại gỗ</label>
                    <input type="text" value={form.loai_go} onChange={e => handleChange('loai_go', e.target.value)} placeholder="VD: Gỗ Sồi, Căm Xe..." />
                  </div>
                  <div className="pm-field">
                    <label>Bề mặt</label>
                    <input type="text" value={form.be_mat} onChange={e => handleChange('be_mat', e.target.value)} placeholder="VD: Bóng, Mờ..." />
                  </div>
                  <div className="pm-field">
                    <label>Màu sắc</label>
                    <input type="text" value={form.Mau_sac} onChange={e => handleChange('Mau_sac', e.target.value)} placeholder="VD: Nâu, Vàng..." />
                  </div>
                  <div className="pm-field">
                    <label>Nắp</label>
                    <input type="text" value={form.nap} onChange={e => handleChange('nap', e.target.value)} placeholder="VD: Nắp tròn, Nắp dẹp..." />
                  </div>
                  <div className="pm-field">
                    <label>Liệt</label>
                    <input type="text" value={form.Liet} onChange={e => handleChange('Liet', e.target.value)} placeholder="..." />
                  </div>
                  <div className="pm-field pm-field-full">
                    <label>Mục đích sử dụng</label>
                    <textarea value={form.Muc_dich} onChange={e => handleChange('Muc_dich', e.target.value)} placeholder="VD: Dùng cho tang lễ chôn cất..." rows={2} />
                  </div>
                  <div className="pm-field pm-field-full">
                    <label>Thông số khác</label>
                    <textarea value={form.thong_so_khac} onChange={e => handleChange('thong_so_khac', e.target.value)} placeholder="Các thông số kỹ thuật bổ sung..." rows={2} />
                  </div>
                </div>
              </div>

              <div className="pm-form-section">
                <h3 className="pm-form-section-title">Giá & mô tả</h3>
                <div className="pm-form-grid">
                  <div className="pm-field">
                    <label>Giá bán (VNĐ)</label>
                    <input type="number" value={form.gia_ban} onChange={e => handleChange('gia_ban', Number(e.target.value))} placeholder="0" />
                  </div>
                  <div className="pm-field">
                    <label>Giá vốn (VNĐ)</label>
                    <input type="number" value={form.gia_von} onChange={e => handleChange('gia_von', Number(e.target.value))} placeholder="0" />
                  </div>
                </div>
              </div>
`;

// Extract everything from <div className="pm-form-section"> (first one) up to <!-- Image Upload Section -->
const startMarker = '<div className="pm-form-section">';
const endMarker = '{/* Image Upload Section */}';
const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + newFormContent + '\n              ' + content.substring(endIdx);
}

fs.writeFileSync(filePath, content);
console.log('Successfully updated ProductsManageClient.tsx');
