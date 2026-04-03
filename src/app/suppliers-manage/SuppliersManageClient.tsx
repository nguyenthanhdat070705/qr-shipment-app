'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, X, Check, Edit2, ChevronDown, ChevronUp, Truck, Phone, FileText, MapPin } from 'lucide-react';
import './suppliers-manage.css';

interface Supplier {
  id: string;
  ma_ncc: string;
  ten_ncc: string;
  nguoi_lien_he: string;
  sdt: string;
  dia_chi: string;
  email: string;
  ghi_chu: string;
  noi_dung: string;
  thong_tin_lien_he: string;
  thong_tin_hoa_don: string;
  is_active: boolean;
  created_at: string;
}

const EMPTY_FORM = {
  ma_ncc: '',
  ten_ncc: '',
  nguoi_lien_he: '',
  sdt: '',
  dia_chi: '',
  email: '',
  ghi_chu: '',
  noi_dung: '',
  thong_tin_lien_he: '',
  thong_tin_hoa_don: '',
};

export default function SuppliersManageClient() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        setUserEmail(u.email || '');
      }
    } catch { /* ignore */ }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/suppliers');
      const json = await res.json();
      setSuppliers(json.data || []);
    } catch {
      console.error('Fetch error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ma_ncc || !form.ten_ncc) {
      setMessage({ type: 'error', text: 'Mã NCC và Tên NCC là bắt buộc!' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const isEdit = !!editingId;
      const res = await fetch('/api/suppliers', {
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

      setMessage({
        type: 'success',
        text: isEdit ? `Đã cập nhật NCC "${form.ma_ncc}"` : `Đã tạo NCC "${form.ma_ncc}" thành công!`,
      });
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      fetchSuppliers();
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối server' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (sup: Supplier) => {
    setEditingId(sup.id);
    setForm({
      ma_ncc: sup.ma_ncc,
      ten_ncc: sup.ten_ncc,
      nguoi_lien_he: sup.nguoi_lien_he || '',
      sdt: sup.sdt || '',
      dia_chi: sup.dia_chi || '',
      email: sup.email || '',
      ghi_chu: sup.ghi_chu || '',
      noi_dung: sup.noi_dung || '',
      thong_tin_lien_he: sup.thong_tin_lien_he || '',
      thong_tin_hoa_don: sup.thong_tin_hoa_don || '',
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMessage(null);
  };

  const filtered = suppliers.filter(s => {
    const q = search.toLowerCase();
    return (
      s.ma_ncc.toLowerCase().includes(q) ||
      s.ten_ncc.toLowerCase().includes(q) ||
      (s.nguoi_lien_he || '').toLowerCase().includes(q) ||
      (s.sdt || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="ncc-container">
      {/* Header */}
      <div className="ncc-header">
        <div className="ncc-header-left">
          <Truck size={28} />
          <div>
            <h1 className="ncc-title">Quản lý nhà cung cấp</h1>
            <p className="ncc-subtitle">Tạo mã & quản lý danh sách NCC ({suppliers.length} NCC)</p>
          </div>
        </div>
        <button className="ncc-btn-create" onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); }}>
          <Plus size={18} />
          Thêm NCC mới
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`ncc-message ncc-message-${message.type}`}>
          {message.type === 'success' ? <Check size={18} /> : <X size={18} />}
          {message.text}
          <button className="ncc-message-close" onClick={() => setMessage(null)}><X size={14} /></button>
        </div>
      )}

      {/* Form tạo/chỉnh sửa */}
      {showForm && (
        <div className="ncc-form-overlay">
          <div className="ncc-form-card">
            <div className="ncc-form-header">
              <h2>{editingId ? 'Chỉnh sửa NCC' : 'Thêm nhà cung cấp mới'}</h2>
              <button className="ncc-form-close" onClick={handleCancel}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="ncc-form">
              <div className="ncc-form-section">
                <h3 className="ncc-form-section-title">Thông tin cơ bản</h3>
                <div className="ncc-form-grid">
                  <div className="ncc-field">
                    <label>Mã NCC <span className="ncc-required">*</span></label>
                    <input
                      type="text"
                      value={form.ma_ncc}
                      onChange={e => handleChange('ma_ncc', e.target.value.toUpperCase())}
                      placeholder="VD: NCC001"
                      disabled={!!editingId}
                      required
                    />
                  </div>
                  <div className="ncc-field">
                    <label>Tên NCC <span className="ncc-required">*</span></label>
                    <input
                      type="text"
                      value={form.ten_ncc}
                      onChange={e => handleChange('ten_ncc', e.target.value)}
                      placeholder="VD: Công ty TNHH ABC"
                      required
                    />
                  </div>
                  <div className="ncc-field">
                    <label>Tên người liên hệ</label>
                    <input
                      type="text"
                      value={form.nguoi_lien_he}
                      onChange={e => handleChange('nguoi_lien_he', e.target.value)}
                      placeholder="VD: Nguyễn Văn A"
                    />
                  </div>
                  <div className="ncc-field">
                    <label>SĐT</label>
                    <input
                      type="text"
                      value={form.sdt}
                      onChange={e => handleChange('sdt', e.target.value)}
                      placeholder="VD: 0901234567"
                    />
                  </div>
                </div>
              </div>

              <div className="ncc-form-section">
                <h3 className="ncc-form-section-title">Liên hệ & địa chỉ</h3>
                <div className="ncc-form-grid">
                  <div className="ncc-field">
                    <label>Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => handleChange('email', e.target.value)}
                      placeholder="VD: abc@company.com"
                    />
                  </div>
                  <div className="ncc-field">
                    <label>Địa chỉ</label>
                    <input
                      type="text"
                      value={form.dia_chi}
                      onChange={e => handleChange('dia_chi', e.target.value)}
                      placeholder="VD: 123 Nguyễn Huệ, Q.1, HCM"
                    />
                  </div>
                  <div className="ncc-field ncc-field-full">
                    <label>Thông tin liên hệ</label>
                    <textarea
                      value={form.thong_tin_lien_he}
                      onChange={e => handleChange('thong_tin_lien_he', e.target.value)}
                      placeholder="Chi tiết thông tin liên hệ khác..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <div className="ncc-form-section">
                <h3 className="ncc-form-section-title">Nội dung & ghi chú</h3>
                <div className="ncc-form-grid">
                  <div className="ncc-field ncc-field-full">
                    <label>Nội dung</label>
                    <textarea
                      value={form.noi_dung}
                      onChange={e => handleChange('noi_dung', e.target.value)}
                      placeholder="Mô tả hoạt động, lĩnh vực cung cấp..."
                      rows={2}
                    />
                  </div>
                  <div className="ncc-field ncc-field-full">
                    <label>Thông tin hóa đơn</label>
                    <textarea
                      value={form.thong_tin_hoa_don}
                      onChange={e => handleChange('thong_tin_hoa_don', e.target.value)}
                      placeholder="MST, tên công ty trên hóa đơn, địa chỉ xuất hóa đơn..."
                      rows={2}
                    />
                  </div>
                  <div className="ncc-field ncc-field-full">
                    <label>Ghi chú</label>
                    <textarea
                      value={form.ghi_chu}
                      onChange={e => handleChange('ghi_chu', e.target.value)}
                      placeholder="Ghi chú thêm..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <div className="ncc-form-actions">
                <button type="button" className="ncc-btn-cancel" onClick={handleCancel}>Hủy</button>
                <button type="submit" className="ncc-btn-save" disabled={saving}>
                  {saving ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Tạo NCC')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="ncc-search-bar">
        <Search size={18} />
        <input
          type="text"
          placeholder="Tìm theo mã NCC, tên, người liên hệ, SĐT..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="ncc-search-clear" onClick={() => setSearch('')}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="ncc-loading">
          <div className="ncc-spinner" />
          <p>Đang tải danh sách NCC...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="ncc-empty">
          <Truck size={48} />
          <h3>Chưa có nhà cung cấp nào</h3>
          <p>Nhấn &quot;Thêm NCC mới&quot; để bắt đầu.</p>
        </div>
      ) : (
        <div className="ncc-table-wrap">
          <table className="ncc-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã NCC</th>
                <th>Tên NCC</th>
                <th>Người liên hệ</th>
                <th>SĐT</th>
                <th>Nội dung</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <>
                  <tr key={s.id} className={expandedRow === s.id ? 'ncc-row-expanded' : ''}>
                    <td className="ncc-td-center">{i + 1}</td>
                    <td><span className="ncc-code">{s.ma_ncc}</span></td>
                    <td className="ncc-td-name">{s.ten_ncc}</td>
                    <td>
                      {s.nguoi_lien_he ? (
                        <span className="ncc-contact-name">{s.nguoi_lien_he}</span>
                      ) : '—'}
                    </td>
                    <td>
                      {s.sdt ? (
                        <span className="ncc-phone">
                          <Phone size={12} />
                          {s.sdt}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="ncc-td-content">{s.noi_dung || '—'}</td>
                    <td className="ncc-td-actions">
                      <button className="ncc-btn-icon" title="Chỉnh sửa" onClick={() => handleEdit(s)}>
                        <Edit2 size={15} />
                      </button>
                      <button
                        className="ncc-btn-icon"
                        title="Chi tiết"
                        onClick={() => setExpandedRow(expandedRow === s.id ? null : s.id)}
                      >
                        {expandedRow === s.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </td>
                  </tr>
                  {expandedRow === s.id && (
                    <tr key={`${s.id}-detail`} className="ncc-detail-row">
                      <td colSpan={7}>
                        <div className="ncc-detail-grid">
                          <div className="ncc-detail-item">
                            <Phone size={14} className="ncc-detail-icon" />
                            <div>
                              <strong>SĐT:</strong>
                              <span>{s.sdt || '—'}</span>
                            </div>
                          </div>
                          <div className="ncc-detail-item">
                            <FileText size={14} className="ncc-detail-icon" />
                            <div>
                              <strong>Email:</strong>
                              <span>{s.email || '—'}</span>
                            </div>
                          </div>
                          <div className="ncc-detail-item">
                            <MapPin size={14} className="ncc-detail-icon" />
                            <div>
                              <strong>Địa chỉ:</strong>
                              <span>{s.dia_chi || '—'}</span>
                            </div>
                          </div>
                          <div className="ncc-detail-item ncc-detail-full">
                            <FileText size={14} className="ncc-detail-icon" />
                            <div>
                              <strong>Thông tin liên hệ:</strong>
                              <span>{s.thong_tin_lien_he || '—'}</span>
                            </div>
                          </div>
                          <div className="ncc-detail-item ncc-detail-full">
                            <FileText size={14} className="ncc-detail-icon" />
                            <div>
                              <strong>Thông tin hóa đơn:</strong>
                              <span>{s.thong_tin_hoa_don || '—'}</span>
                            </div>
                          </div>
                          <div className="ncc-detail-item ncc-detail-full">
                            <FileText size={14} className="ncc-detail-icon" />
                            <div>
                              <strong>Ghi chú:</strong>
                              <span>{s.ghi_chu || '—'}</span>
                            </div>
                          </div>
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
