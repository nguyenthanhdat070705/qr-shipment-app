'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Minus, Search, Package, Edit2, X, Check, ChevronDown, ChevronUp, Upload, Image as ImageIcon, Loader2, Trash2, ArrowLeft, AlertTriangle, Warehouse } from 'lucide-react';
import Link from 'next/link';
import ExcelImportModal from '@/components/ExcelImportModal';
import { isVIPAdmin } from '@/config/roles.config';
import './products-manage.css';

interface WarehouseItem {
  id: string;
  ma_kho: string;
  ten_kho: string;
}

interface QtyPopup {
  productId: string;
  productName: string;
  currentQty: number;
  mode: 'add' | 'subtract';
  amount: number;
  kho_id: string;
  loai_hang: string;
}

interface Product {
  id: string;
  ma_hom: string;
  ten_hom: string;
  gia_ban: number;
  gia_ban_1: number;
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
}

const EMPTY_FORM = {
  ma_hom: '',
  ten_hom: '',
  gia_ban: 0,
  gia_ban_1: 0,
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
};

export default function ProductsManagePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showExcelImport, setShowExcelImport] = useState(false);
  // Image upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Quantity adjustment state
  const [adjustingQty, setAdjustingQty] = useState<string | null>(null);
  const [qtyPopup, setQtyPopup] = useState<QtyPopup | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        setUserEmail(u.email || '');
      }
    } catch { /* ignore */ }
  }, []);

  // Only VIP admin can adjust quantities
  const isVIP = isVIPAdmin(userEmail);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      const json = await res.json();
      setProducts(json.data || []);
    } catch {
      console.error('Fetch error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await fetch('/api/warehouses');
      const json = await res.json();
      setWarehouses(json.data || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchProducts(); fetchWarehouses(); }, [fetchProducts, fetchWarehouses]);

  const handleChange = (field: string, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // ── Image upload handler ──
  const handleFileSelect = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Chỉ chấp nhận file ảnh (JPEG, PNG, WebP, GIF).' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Ảnh quá lớn. Tối đa 5MB.' });
      return;
    }
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadImage = async (productId: string, maHom: string, file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('product_id', productId);
    fd.append('ma_hom', maHom);
    try {
      const res = await fetch('/api/products/upload-image', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) { console.error('Upload failed:', json.error); return null; }
      return json.url;
    } catch { return null; }
  };

  // Upload for existing product (from table)
  const handleUploadForProduct = async (product: Product) => {
    if (!fileInputRef.current) return;
    // Store product info for later use
    fileInputRef.current.dataset.productId = product.id;
    fileInputRef.current.dataset.maHom = product.ma_hom;
    fileInputRef.current.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const productId = e.target.dataset.productId;
    const maHom = e.target.dataset.maHom;
    if (productId && maHom) {
      // Direct upload for existing product
      setUploadingImage(true);
      const url = await uploadImage(productId, maHom, file);
      if (url) {
        setMessage({ type: 'success', text: `Đã upload ảnh cho ${maHom}!` });
        fetchProducts();
      } else {
        setMessage({ type: 'error', text: 'Upload ảnh thất bại.' });
      }
      setUploadingImage(false);
      e.target.value = '';
      delete e.target.dataset.productId;
      delete e.target.dataset.maHom;
    } else {
      // Preview for form
      handleFileSelect(file);
      e.target.value = '';
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    setPendingFile(null);
    handleChange('hinh_anh', '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ma_hom || !form.ten_hom) {
      setMessage({ type: 'error', text: 'Mã hòm và Tên hòm là bắt buộc!' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const isEdit = !!editingId;
      const res = await fetch('/api/products', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEdit ? { id: editingId, updated_by: userEmail } : { created_by: userEmail }),
          ...form,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: json.error || 'Lỗi không xác định' });
        return;
      }

      // Upload image if pending
      if (pendingFile && json.data?.id) {
        setUploadingImage(true);
        const url = await uploadImage(json.data.id, form.ma_hom, pendingFile);
        setUploadingImage(false);
        if (!url) {
          setMessage({ type: 'error', text: 'Sản phẩm đã tạo nhưng upload ảnh thất bại.' });
        }
      }

      setMessage({
        type: 'success',
        text: isEdit ? `Đã cập nhật sản phẩm "${form.ma_hom}"` : `Đã tạo sản phẩm "${form.ma_hom}" thành công!`,
      });
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      setImagePreview(null);
      setPendingFile(null);
      fetchProducts();
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối server' });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: Product) => {
    // Optimistic UI update
    setProducts(prev => prev.map(item => item.id === p.id ? { ...item, is_active: !p.is_active } : item));
    try {
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, updated_by: userEmail, is_active: !p.is_active }),
      });
      if (!res.ok) {
        setProducts(prev => prev.map(item => item.id === p.id ? { ...item, is_active: !p.is_active } : item));
      }
    } catch {
      setProducts(prev => prev.map(item => item.id === p.id ? { ...item, is_active: !p.is_active } : item));
    }
  };

  const handleEdit = (product: Product) => {
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
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMessage(null);
    setImagePreview(null);
    setPendingFile(null);
  };

  // ── Quantity: open popup to choose Kho + Loại hàng ──
  const openQtyPopup = (product: Product, mode: 'add' | 'subtract') => {
    setQtyPopup({
      productId: product.id,
      productName: `${product.ma_hom} — ${product.ten_hom}`,
      currentQty: product.so_luong || 0,
      mode,
      amount: 1,
      kho_id: warehouses.length > 0 ? warehouses[0].id : '',
      loai_hang: 'Đã mua',
    });
  };

  const handleQuantityConfirm = async () => {
    if (!qtyPopup || qtyPopup.amount <= 0) return;
    const delta = qtyPopup.mode === 'add' ? qtyPopup.amount : -qtyPopup.amount;
    const { productId, kho_id, loai_hang } = qtyPopup;
    setAdjustingQty(productId);
    setQtyPopup(null);
    try {
      const res = await fetch('/api/products/quantity', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId, delta, email: userEmail, kho_id, loai_hang }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: json.error || 'Lỗi cập nhật số lượng' });
      } else {
        setProducts(prev => prev.map(p =>
          p.id === productId
            ? { ...p, so_luong: json.new_qty }
            : p
        ));
        setMessage({ type: 'success', text: `${delta > 0 ? 'Cộng' : 'Trừ'} ${Math.abs(delta)} → ${json.ma_hom} (SL: ${json.new_qty})` });
      }
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối khi cập nhật số lượng' });
    } finally {
      setAdjustingQty(null);
    }
  };

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    return (
      p.ma_hom.toLowerCase().includes(q) ||
      p.ten_hom.toLowerCase().includes(q) || (p.Nguon_goc || '').toLowerCase().includes(q) ||
      (p.loai_hom || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="pm-container">
      {/* Hidden file input for table uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />
      {/* Header */}
      <div className="pm-header">
        <div className="pm-header-left">
          <Package size={28} />
          <div>
            <h1 className="pm-title">Quản lý sản phẩm</h1>
            <p className="pm-subtitle">
              <span className="pm-stat-pill pm-stat-total">Tổng sản phẩm: <strong>{products.length}</strong></span>
              <span className="pm-stat-pill pm-stat-active">Đang bán: <strong>{products.filter(p => p.is_active).length}</strong></span>
              <span className="pm-stat-pill pm-stat-inactive">Ngừng bán: <strong>{products.filter(p => !p.is_active).length}</strong></span>
            </p>
          </div>
        </div>
        <Link href="/" className="pm-btn-back">
          <ArrowLeft size={18} />
          Trang chủ
        </Link>
        <div className="pm-header-actions">
          <button className="pm-btn-upload" onClick={() => setShowExcelImport(true)}>
            <Upload size={18} />
            Import Excel
          </button>
          <button className="pm-btn-create" onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); }}>
            <Plus size={18} />
            Tạo sản phẩm mới
          </button>
        </div>
      </div>

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={showExcelImport}
        onClose={() => setShowExcelImport(false)}
        onImportDone={fetchProducts}
        userEmail={userEmail}
      />

      {/* Message */}
      {message && (
        <div className={`pm-message pm-message-${message.type}`}>
          {message.type === 'success' ? <Check size={18} /> : <X size={18} />}
          {message.text}
          <button className="pm-message-close" onClick={() => setMessage(null)}><X size={14} /></button>
        </div>
      )}

      {/* Form tạo/chỉnh sửa */}
      {showForm && (
        <div className="pm-form-overlay">
          <div className="pm-form-card">
            <div className="pm-form-header">
              <h2>{editingId ? 'Chỉnh sửa sản phẩm' : 'Tạo sản phẩm mới'}</h2>
              <button className="pm-form-close" onClick={handleCancel}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="pm-form">
              
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
                <h3 className="pm-form-section-title">Giá tiền</h3>
                <div className="pm-form-grid">
                  <div className="pm-field">
                    <label>Giá vốn (VNĐ)</label>
                    <input type="number" value={form.gia_ban} onChange={e => handleChange('gia_ban', Number(e.target.value))} placeholder="0" />
                  </div>
                  <div className="pm-field">
                    <label>Giá bán (VNĐ)</label>
                    <input type="number" value={form.gia_ban_1} onChange={e => handleChange('gia_ban_1', Number(e.target.value))} placeholder="0" />
                  </div>
                </div>
              </div>

              {/* Image Upload Section */}
              <div className="pm-form-section">
                <h3 className="pm-form-section-title">Hình ảnh sản phẩm</h3>
                <div className="pm-image-upload-area">
                  {(imagePreview || form.hinh_anh) ? (
                    <div className="pm-image-preview-wrap">
                      <img
                        src={imagePreview || form.hinh_anh}
                        alt="Preview"
                        className="pm-image-preview"
                      />
                      <div className="pm-image-actions">
                        <button
                          type="button"
                          className="pm-btn-image-change"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e: Event) => {
                              const f = (e.target as HTMLInputElement).files?.[0];
                              if (f) handleFileSelect(f);
                            };
                            input.click();
                          }}
                        >
                          <Upload size={14} />
                          Đổi ảnh
                        </button>
                        <button type="button" className="pm-btn-image-remove" onClick={clearImage}>
                          <Trash2 size={14} />
                          Xóa
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="pm-image-dropzone"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e: Event) => {
                          const f = (e.target as HTMLInputElement).files?.[0];
                          if (f) handleFileSelect(f);
                        };
                        input.click();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const f = e.dataTransfer.files[0];
                        if (f) handleFileSelect(f);
                      }}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      <ImageIcon size={36} className="pm-dropzone-icon" />
                      <p className="pm-dropzone-text">Kéo thả hoặc click để chọn ảnh</p>
                      <p className="pm-dropzone-hint">JPEG, PNG, WebP • Tối đa 5MB</p>
                    </div>
                  )}
                  {uploadingImage && (
                    <div className="pm-image-uploading">
                      <Loader2 size={18} className="pm-spin" />
                      <span>Đang upload ảnh...</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pm-form-actions">
                <button type="button" className="pm-btn-cancel" onClick={handleCancel}>Hủy</button>
                <button type="submit" className="pm-btn-save" disabled={saving}>
                  {saving ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Tạo sản phẩm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="pm-form-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="pm-delete-modal" onClick={e => e.stopPropagation()}>
            <div className="pm-delete-header">
              <AlertTriangle size={24} className="pm-delete-icon" />
              <div>
                <h3>Xóa sản phẩm hòm</h3>
                <p>Hành động này không thể hoàn tác</p>
              </div>
            </div>
            <div className="pm-delete-body">
              <p>Bạn có chắc muốn xóa hòm <strong>{deleteTarget.ma_hom}</strong> — <strong>{deleteTarget.ten_hom}</strong>?</p>
              <p className="pm-delete-warning">⚠ Sản phẩm sẽ bị xóa khỏi kho hàng và danh sách.</p>
            </div>
            <div className="pm-delete-actions">
              <button className="pm-btn-cancel" onClick={() => setDeleteTarget(null)} disabled={deleting}>Hủy</button>
              <button className="pm-btn-delete" onClick={async () => {
                setDeleting(true);
                try {
                  const res = await fetch('/api/products', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: deleteTarget.id, email: userEmail }),
                  });
                  const json = await res.json();
                  if (!res.ok) { setMessage({ type: 'error', text: json.error || 'Xóa thất bại' }); }
                  else { setMessage({ type: 'success', text: `Đã xóa hòm "${deleteTarget.ma_hom}"` }); fetchProducts(); }
                } catch { setMessage({ type: 'error', text: 'Lỗi kết nối' }); }
                finally { setDeleting(false); setDeleteTarget(null); }
              }} disabled={deleting}>
                {deleting ? <><Loader2 size={14} className="pm-spin" /> Đang xóa...</> : <><Trash2 size={14} /> Xác nhận xóa</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quantity Adjustment Popup */}
      {qtyPopup && (
        <div className="pm-form-overlay" onClick={() => setQtyPopup(null)}>
          <div className="pm-qty-modal" onClick={e => e.stopPropagation()}>
            <div className="pm-qty-modal-header">
              <Warehouse size={22} />
              <div>
                <h3>{qtyPopup.mode === 'add' ? 'Cộng' : 'Trừ'} số lượng hòm</h3>
                <p className="pm-qty-modal-product">{qtyPopup.productName}</p>
              </div>
              <button className="pm-form-close" onClick={() => setQtyPopup(null)}><X size={18} /></button>
            </div>
            <div className="pm-qty-modal-body">
              <div className="pm-qty-modal-field">
                <label>{qtyPopup.mode === 'add' ? <Plus size={14} /> : <Minus size={14} />} Số lượng {qtyPopup.mode === 'add' ? 'cộng' : 'trừ'}</label>
                <input
                  type="number"
                  className="pm-qty-input"
                  min={1}
                  max={qtyPopup.mode === 'subtract' ? qtyPopup.currentQty : 9999}
                  value={qtyPopup.amount}
                  onChange={e => setQtyPopup({ ...qtyPopup, amount: Math.max(1, parseInt(e.target.value) || 1) })}
                  autoFocus
                />
              </div>

              <div className="pm-qty-modal-info">
                <span>Hiện tại:</span>
                <strong>{qtyPopup.currentQty}</strong>
                <span className={qtyPopup.mode === 'add' ? 'pm-qty-delta-plus' : 'pm-qty-delta-minus'}>
                  {qtyPopup.mode === 'add' ? `+${qtyPopup.amount}` : `−${qtyPopup.amount}`}
                </span>
                <span>→</span>
                <strong className={qtyPopup.mode === 'add' ? 'pm-qty-delta-plus' : 'pm-qty-delta-minus'}>
                  {Math.max(0, qtyPopup.mode === 'add' ? qtyPopup.currentQty + qtyPopup.amount : qtyPopup.currentQty - qtyPopup.amount)}
                </strong>
              </div>

              <div className="pm-qty-modal-field">
                <label><Warehouse size={14} /> Chọn kho</label>
                <select
                  value={qtyPopup.kho_id}
                  onChange={e => setQtyPopup({ ...qtyPopup, kho_id: e.target.value })}
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.ma_kho} — {w.ten_kho}</option>
                  ))}
                </select>
              </div>

              <div className="pm-qty-modal-field">
                <label><Package size={14} /> Loại hàng</label>
                <div className="pm-qty-type-group">
                  {['Đã mua', 'Ký gửi'].map(type => (
                    <button
                      key={type}
                      type="button"
                      className={`pm-qty-type-btn ${qtyPopup.loai_hang === type ? 'active' : ''}`}
                      onClick={() => setQtyPopup({ ...qtyPopup, loai_hang: type })}
                    >
                      {type === 'Đã mua' ? <Check size={14} /> : <Package size={14} />}
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="pm-qty-modal-actions">
              <button className="pm-btn-cancel" onClick={() => setQtyPopup(null)}>Hủy</button>
              <button
                className={`pm-qty-confirm-btn ${qtyPopup.mode === 'add' ? 'pm-qty-confirm-plus' : 'pm-qty-confirm-minus'}`}
                onClick={handleQuantityConfirm}
                disabled={!qtyPopup.kho_id || qtyPopup.amount <= 0 || (qtyPopup.mode === 'subtract' && qtyPopup.amount > qtyPopup.currentQty)}
              >
                {qtyPopup.mode === 'add'
                  ? <><Plus size={14} /> Xác nhận cộng {qtyPopup.amount}</>
                  : <><Minus size={14} /> Xác nhận trừ {qtyPopup.amount}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="pm-search-bar">
        <Search size={18} />
        <input
          type="text"
          placeholder="Tìm theo mã hòm, tên, NCC, loại..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="pm-search-clear" onClick={() => setSearch('')}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="pm-loading">
          <div className="pm-spinner" />
          <p>Đang tải danh sách sản phẩm...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="pm-empty">
          <Package size={48} />
          <h3>Chưa có sản phẩm nào</h3>
          <p>Nhấn &quot;Tạo sản phẩm mới&quot; để bắt đầu thêm hòm vào hệ thống.</p>
        </div>
      ) : (
        <div className="pm-table-wrap">
          <table className="pm-table">
            <thead>
              <tr>
                <th style={{ width: 60, padding: '0 10px', textAlign: 'center' }}></th>
                <th>Ảnh</th>
                <th>Mã hòm</th>
                <th>Tên hòm</th>
                <th>Kích thước</th>
                <th className="pm-th-qty">Số lượng</th>
                <th>Đặc điểm</th>
                <th>ĐVT</th>
                <th>Nguồn gốc</th>
                <th>Giá bán</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <>
                  <tr key={p.id} className={expandedRow === p.id ? 'pm-row-expanded' : ''} style={{ opacity: p.is_active ? 1 : 0.6 }}>
                    <td>
                      <div className="pm-toggle-wrap" onClick={(e) => e.stopPropagation()}>
                        <label className="pm-toggle-switch" title={p.is_active ? 'Đang bán' : 'Ngừng bán'}>
                          <input
                            type="checkbox"
                            checked={!!p.is_active}
                            onChange={() => toggleActive(p)}
                          />
                          <span className="pm-toggle-slider"></span>
                        </label>
                      </div>
                    </td>
                    <td className="pm-td-center">
                      {p.hinh_anh ? (
                        <div className="pm-td-thumb" onClick={() => handleUploadForProduct(p)}>
                          <img src={p.hinh_anh} alt={p.ma_hom} style={{ filter: p.is_active ? 'none' : 'grayscale(100%)' }} />
                        </div>
                      ) : (
                        <button className="pm-td-add-thumb" onClick={() => handleUploadForProduct(p)} title="Thêm ảnh">
                          <ImageIcon size={14} />
                        </button>
                      )}
                    </td>
                    <td><span className="pm-code">{p.ma_hom}</span></td>
                    <td className="pm-td-name">{p.ten_hom_the_hien || p.ten_hom}</td>
                    <td>{p.kich_thuoc || '—'}</td>
                    <td className="pm-td-qty">
                      {isVIP ? (
                        <div className="pm-qty-controls">
                          <button
                            className="pm-qty-btn pm-qty-minus"
                            onClick={() => openQtyPopup(p, 'subtract')}
                            disabled={adjustingQty === p.id || (p.so_luong || 0) <= 0}
                            title="Trừ 1"
                          >
                            <Minus size={14} />
                          </button>
                          <span className={`pm-qty-value ${(p.so_luong || 0) > 0 ? 'pm-qty-positive' : ''}`}>
                            {adjustingQty === p.id ? <Loader2 size={14} className="pm-spin" /> : (p.so_luong || 0)}
                          </span>
                          <button
                            className="pm-qty-btn pm-qty-plus"
                            onClick={() => openQtyPopup(p, 'add')}
                            disabled={adjustingQty === p.id}
                            title="Cộng 1"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className={`pm-qty-value ${(p.so_luong || 0) > 0 ? 'pm-qty-positive' : ''}`}>
                          {p.so_luong || 0}
                        </span>
                      )}
                    </td>
                    <td>{p.dac_diem || '—'}</td>
                    <td>{p.don_vi_tinh || 'Cái'}</td>
                    <td>{p.Nguon_goc || '—'}</td>
                    <td className="pm-td-price">{(p.gia_ban_1 || 0).toLocaleString('vi-VN')}₫</td>
                    <td className="pm-td-actions">
                      <button className="pm-btn-icon" title="Chỉnh sửa" onClick={() => handleEdit(p)}>
                        <Edit2 size={15} />
                      </button>
                      <button className="pm-btn-icon pm-btn-icon-danger" title="Xóa" onClick={() => setDeleteTarget(p)}>
                        <Trash2 size={15} />
                      </button>
                      <button
                        className="pm-btn-icon"
                        title="Chi tiết"
                        onClick={() => setExpandedRow(expandedRow === p.id ? null : p.id)}
                      >
                        {expandedRow === p.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </td>
                  </tr>
                  {expandedRow === p.id && (
                    <tr key={`${p.id}-detail`} className="pm-detail-row">
                      <td colSpan={10}>
                        <div className="pm-detail-grid">
                          <div><strong>Độ dày thành:</strong> {p.Thanh || '—'}</div>
                          <div><strong>Loại hòm:</strong> {p.loai_hom || '—'}</div>
                          <div><strong>Giá vốn:</strong> {(p.gia_ban || 0).toLocaleString('vi-VN')}₫</div>
                          <div><strong>Thông số khác:</strong> {p.thong_so_khac || '—'}</div>
                          <div className="pm-detail-full"><strong>Mục đích sử dụng:</strong> {p.Muc_dich || '—'}</div>
                          <div className="pm-detail-full"><strong>Mô tả:</strong> {p.mo_ta || '—'}</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
