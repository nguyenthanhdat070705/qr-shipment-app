'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Package, Edit2, X, Check, ChevronDown, ChevronUp, Upload, Image as ImageIcon, Loader2, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ExcelImportModal from '@/components/ExcelImportModal';
import './products-manage.css';

interface Product {
  id: string;
  ma_hom: string;
  ten_hom: string;
  gia_ban: number;
  gia_von: number;
  NCC: string;
  loai_hom: string;
  hinh_anh: string;
  mo_ta: string;
  kich_thuoc: string;
  thong_so_khac: string;
  do_day_thanh: string;
  don_vi_tinh: string;
  tinh_chat: string;
  muc_dich_su_dung: string;
  is_active: boolean;
  created_at: string;
}

const EMPTY_FORM = {
  ma_hom: '',
  ten_hom: '',
  gia_ban: 0,
  gia_von: 0,
  NCC: '',
  loai_hom: '',
  hinh_anh: '',
  mo_ta: '',
  kich_thuoc: '',
  thong_so_khac: '',
  do_day_thanh: '',
  don_vi_tinh: 'Cái',
  tinh_chat: '',
  muc_dich_su_dung: '',
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        setUserEmail(u.email || '');
      }
    } catch { /* ignore */ }
  }, []);

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

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

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

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      ma_hom: product.ma_hom,
      ten_hom: product.ten_hom,
      gia_ban: product.gia_ban || 0,
      gia_von: product.gia_von || 0,
      NCC: product.NCC || '',
      loai_hom: product.loai_hom || '',
      hinh_anh: product.hinh_anh || '',
      mo_ta: product.mo_ta || '',
      kich_thuoc: product.kich_thuoc || '',
      thong_so_khac: product.thong_so_khac || '',
      do_day_thanh: product.do_day_thanh || '',
      don_vi_tinh: product.don_vi_tinh || 'Cái',
      tinh_chat: product.tinh_chat || '',
      muc_dich_su_dung: product.muc_dich_su_dung || '',
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

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    return (
      p.ma_hom.toLowerCase().includes(q) ||
      p.ten_hom.toLowerCase().includes(q) ||
      (p.NCC || '').toLowerCase().includes(q) ||
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
            <p className="pm-subtitle">Tạo mã & quản lý danh mục hòm ({products.length} sản phẩm)</p>
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
                    <input
                      type="text"
                      value={form.ma_hom}
                      onChange={e => handleChange('ma_hom', e.target.value.toUpperCase())}
                      placeholder="VD: 2AQ0012"
                      disabled={!!editingId}
                      required
                    />
                  </div>
                  <div className="pm-field">
                    <label>Tên hòm <span className="pm-required">*</span></label>
                    <input
                      type="text"
                      value={form.ten_hom}
                      onChange={e => handleChange('ten_hom', e.target.value)}
                      placeholder="VD: Hòm Anh Quốc 12"
                      required
                    />
                  </div>
                  <div className="pm-field">
                    <label>Nhà cung cấp</label>
                    <input
                      type="text"
                      value={form.NCC}
                      onChange={e => handleChange('NCC', e.target.value)}
                      placeholder="VD: NCC ABC"
                    />
                  </div>
                  <div className="pm-field">
                    <label>Loại hòm</label>
                    <input
                      type="text"
                      value={form.loai_hom}
                      onChange={e => handleChange('loai_hom', e.target.value)}
                      placeholder="VD: Hòm gỗ, Hòm thiêu..."
                    />
                  </div>
                </div>
              </div>

              <div className="pm-form-section">
                <h3 className="pm-form-section-title">Thông số kỹ thuật</h3>
                <div className="pm-form-grid">
                  <div className="pm-field">
                    <label>Kích thước</label>
                    <input
                      type="text"
                      value={form.kich_thuoc}
                      onChange={e => handleChange('kich_thuoc', e.target.value)}
                      placeholder="VD: 200x60x50 cm"
                    />
                  </div>
                  <div className="pm-field">
                    <label>Độ dày thành</label>
                    <input
                      type="text"
                      value={form.do_day_thanh}
                      onChange={e => handleChange('do_day_thanh', e.target.value)}
                      placeholder="VD: 2.5 cm"
                    />
                  </div>
                  <div className="pm-field">
                    <label>Đơn vị tính</label>
                    <input
                      type="text"
                      value={form.don_vi_tinh}
                      onChange={e => handleChange('don_vi_tinh', e.target.value)}
                      placeholder="VD: Cái, Bộ..."
                    />
                  </div>
                  <div className="pm-field">
                    <label>Tính chất</label>
                    <input
                      type="text"
                      value={form.tinh_chat}
                      onChange={e => handleChange('tinh_chat', e.target.value)}
                      placeholder="VD: Gỗ tự nhiên, MDF..."
                    />
                  </div>
                  <div className="pm-field pm-field-full">
                    <label>Thông số khác</label>
                    <textarea
                      value={form.thong_so_khac}
                      onChange={e => handleChange('thong_so_khac', e.target.value)}
                      placeholder="Các thông số kỹ thuật bổ sung..."
                      rows={2}
                    />
                  </div>
                  <div className="pm-field pm-field-full">
                    <label>Mục đích sử dụng</label>
                    <textarea
                      value={form.muc_dich_su_dung}
                      onChange={e => handleChange('muc_dich_su_dung', e.target.value)}
                      placeholder="VD: Dùng cho tang lễ chôn cất..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <div className="pm-form-section">
                <h3 className="pm-form-section-title">Giá & mô tả</h3>
                <div className="pm-form-grid">
                  <div className="pm-field">
                    <label>Giá bán (VNĐ)</label>
                    <input
                      type="number"
                      value={form.gia_ban}
                      onChange={e => handleChange('gia_ban', Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                  <div className="pm-field">
                    <label>Giá vốn (VNĐ)</label>
                    <input
                      type="number"
                      value={form.gia_von}
                      onChange={e => handleChange('gia_von', Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                  <div className="pm-field pm-field-full">
                    <label>Mô tả</label>
                    <textarea
                      value={form.mo_ta}
                      onChange={e => handleChange('mo_ta', e.target.value)}
                      placeholder="Mô tả chi tiết sản phẩm..."
                      rows={3}
                    />
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
                <th>Ảnh</th>
                <th>Mã hòm</th>
                <th>Tên hòm</th>
                <th>Kích thước</th>
                <th>Tính chất</th>
                <th>ĐVT</th>
                <th>NCC</th>
                <th>Giá bán</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <>
                  <tr key={p.id} className={expandedRow === p.id ? 'pm-row-expanded' : ''}>
                    <td className="pm-td-center">
                      {p.hinh_anh ? (
                        <div className="pm-td-thumb" onClick={() => handleUploadForProduct(p)}>
                          <img src={p.hinh_anh} alt={p.ma_hom} />
                        </div>
                      ) : (
                        <button className="pm-td-add-thumb" onClick={() => handleUploadForProduct(p)} title="Thêm ảnh">
                          <ImageIcon size={14} />
                        </button>
                      )}
                    </td>
                    <td><span className="pm-code">{p.ma_hom}</span></td>
                    <td className="pm-td-name">{p.ten_hom}</td>
                    <td>{p.kich_thuoc || '—'}</td>
                    <td>{p.tinh_chat || '—'}</td>
                    <td>{p.don_vi_tinh || 'Cái'}</td>
                    <td>{p.NCC || '—'}</td>
                    <td className="pm-td-price">{(p.gia_ban || 0).toLocaleString('vi-VN')}₫</td>
                    <td className="pm-td-actions">
                      <button className="pm-btn-icon" title="Chỉnh sửa" onClick={() => handleEdit(p)}>
                        <Edit2 size={15} />
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
                      <td colSpan={9}>
                        <div className="pm-detail-grid">
                          <div><strong>Độ dày thành:</strong> {p.do_day_thanh || '—'}</div>
                          <div><strong>Loại hòm:</strong> {p.loai_hom || '—'}</div>
                          <div><strong>Giá vốn:</strong> {(p.gia_von || 0).toLocaleString('vi-VN')}₫</div>
                          <div><strong>Thông số khác:</strong> {p.thong_so_khac || '—'}</div>
                          <div className="pm-detail-full"><strong>Mục đích sử dụng:</strong> {p.muc_dich_su_dung || '—'}</div>
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
