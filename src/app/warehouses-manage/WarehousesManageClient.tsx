'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, X, Check, Edit2, Trash2, Warehouse, MapPin, Phone, User, AlertTriangle, Loader2, Eye, EyeOff } from 'lucide-react';
import './warehouses-manage.css';

interface WarehouseItem {
  id: string;
  ma_kho: string;
  ten_kho: string;
  dia_chi: string;
  nguoi_quan_ly: string;
  sdt: string;
  is_active: boolean;
  created_at: string;
}

const EMPTY_FORM = {
  ma_kho: '',
  ten_kho: '',
  dia_chi: '',
  nguoi_quan_ly: '',
  sdt: '',
};

export default function WarehousesManageClient() {
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<WarehouseItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [togglingActiveId, setTogglingActiveId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) setUserEmail(JSON.parse(raw).email || '');
    } catch { /* ignore */ }
  }, []);

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/warehouses?include_inactive=true');
      const json = await res.json();
      setWarehouses(json.data || []);
    } catch { console.error('Fetch error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchWarehouses(); }, [fetchWarehouses]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ma_kho || !form.ten_kho) {
      setMessage({ type: 'error', text: 'Mã kho và Tên kho là bắt buộc!' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const isEdit = !!editingId;
      const res = await fetch('/api/warehouses', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEdit ? { id: editingId, updated_by: userEmail } : { created_by: userEmail }),
          ...form,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setMessage({ type: 'error', text: json.error || 'Lỗi' }); return; }
      setMessage({ type: 'success', text: isEdit ? `Đã cập nhật kho "${form.ma_kho}"` : `Đã tạo kho "${form.ma_kho}" thành công!` });
      setShowForm(false); setEditingId(null); setForm(EMPTY_FORM);
      fetchWarehouses();
    } catch { setMessage({ type: 'error', text: 'Lỗi kết nối server' }); }
    finally { setSaving(false); }
  };

  const handleEdit = (w: WarehouseItem) => {
    setEditingId(w.id);
    setForm({
      ma_kho: w.ma_kho,
      ten_kho: w.ten_kho,
      dia_chi: w.dia_chi || '',
      nguoi_quan_ly: w.nguoi_quan_ly || '',
      sdt: w.sdt || '',
    });
    setShowForm(true);
  };

  const handleCancel = () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); setMessage(null); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/warehouses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id, email: userEmail }),
      });
      const json = await res.json();
      if (!res.ok) { setMessage({ type: 'error', text: json.error || 'Xóa thất bại' }); }
      else { setMessage({ type: 'success', text: `Đã xóa kho "${deleteTarget.ma_kho}"` }); fetchWarehouses(); }
    } catch { setMessage({ type: 'error', text: 'Lỗi kết nối' }); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  const handleToggleActive = async (warehouse: WarehouseItem) => {
    const nextIsActive = !warehouse.is_active;
    const action = nextIsActive ? 'khôi phục' : 'ẩn';
    if (!window.confirm(`${nextIsActive ? 'Khôi phục' : 'Ẩn'} kho "${warehouse.ten_kho}" (${warehouse.ma_kho})? Lịch sử và số tồn hiện có sẽ được giữ nguyên.`)) return;

    setTogglingActiveId(warehouse.id);
    setMessage(null);
    try {
      const res = await fetch('/api/warehouses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: warehouse.id, is_active: nextIsActive, updated_by: userEmail }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: json.error || `Không thể ${action} kho.` });
        return;
      }
      setMessage({ type: 'success', text: nextIsActive ? `Đã khôi phục kho "${warehouse.ma_kho}".` : `Đã ẩn kho "${warehouse.ma_kho}" khỏi các danh sách hoạt động.` });
      await fetchWarehouses();
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối khi cập nhật trạng thái kho.' });
    } finally {
      setTogglingActiveId(null);
    }
  };

  const filtered = warehouses.filter(w => {
    const q = search.toLowerCase();
    return w.ma_kho.toLowerCase().includes(q) || w.ten_kho.toLowerCase().includes(q) ||
      (w.dia_chi || '').toLowerCase().includes(q);
  });
  const activeCount = warehouses.filter(w => w.is_active).length;
  const inactiveCount = warehouses.length - activeCount;
  const visibleWarehouses = showInactive ? filtered : filtered.filter(w => w.is_active);

  return (
    <div className="wh-container">
      {/* Header */}
      <div className="wh-header">
        <div className="wh-header-left">
          <Warehouse size={28} />
          <div>
            <h1 className="wh-title">Quản lý kho hàng</h1>
            <p className="wh-subtitle">Tạo & quản lý danh sách kho ({activeCount} kho đang hoạt động)</p>
          </div>
        </div>
        <button className="wh-btn-create" onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); }}>
          <Plus size={18} />
          Thêm kho mới
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`wh-message wh-message-${message.type}`}>
          {message.type === 'success' ? <Check size={18} /> : <X size={18} />}
          {message.text}
          <button className="wh-message-close" onClick={() => setMessage(null)}><X size={14} /></button>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="wh-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="wh-delete-modal" onClick={e => e.stopPropagation()}>
            <div className="wh-delete-header">
              <AlertTriangle size={24} className="wh-delete-icon" />
              <div>
                <h3>Xóa kho hàng</h3>
                <p>Hành động này không thể hoàn tác</p>
              </div>
            </div>
            <div className="wh-delete-body">
              <p>Bạn có chắc muốn xóa kho <strong>{deleteTarget.ma_kho}</strong> — <strong>{deleteTarget.ten_kho}</strong>?</p>
            </div>
            <div className="wh-delete-actions">
              <button className="wh-btn-cancel" onClick={() => setDeleteTarget(null)} disabled={deleting}>Hủy</button>
              <button className="wh-btn-delete" onClick={handleDelete} disabled={deleting}>
                {deleting ? <><Loader2 size={14} className="wh-spin" /> Đang xóa...</> : <><Trash2 size={14} /> Xác nhận xóa</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="wh-overlay">
          <div className="wh-form-card">
            <div className="wh-form-header">
              <h2>{editingId ? 'Chỉnh sửa kho' : 'Thêm kho hàng mới'}</h2>
              <button className="wh-form-close" onClick={handleCancel}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="wh-form">
              <div className="wh-form-grid">
                <div className="wh-field">
                  <label>Mã kho <span className="wh-required">*</span></label>
                  <input type="text" value={form.ma_kho} onChange={e => handleChange('ma_kho', e.target.value.toUpperCase())} placeholder="VD: KHO01" disabled={!!editingId} required />
                </div>
                <div className="wh-field">
                  <label>Tên kho <span className="wh-required">*</span></label>
                  <input type="text" value={form.ten_kho} onChange={e => handleChange('ten_kho', e.target.value)} placeholder="VD: Kho Quận 1" required />
                </div>
                <div className="wh-field wh-field-full">
                  <label>Địa chỉ</label>
                  <input type="text" value={form.dia_chi} onChange={e => handleChange('dia_chi', e.target.value)} placeholder="VD: 123 Nguyễn Huệ, Q.1, TP.HCM" />
                </div>
                <div className="wh-field">
                  <label>Người quản lý</label>
                  <input type="text" value={form.nguoi_quan_ly} onChange={e => handleChange('nguoi_quan_ly', e.target.value)} placeholder="VD: Nguyễn Văn A" />
                </div>
                <div className="wh-field">
                  <label>SĐT</label>
                  <input type="text" value={form.sdt} onChange={e => handleChange('sdt', e.target.value)} placeholder="VD: 0901234567" />
                </div>
              </div>
              <div className="wh-form-actions">
                <button type="button" className="wh-btn-cancel" onClick={handleCancel}>Hủy</button>
                <button type="submit" className="wh-btn-save" disabled={saving}>{saving ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Tạo kho')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="wh-search-bar">
        <Search size={18} />
        <input type="text" placeholder="Tìm theo mã kho, tên, địa chỉ..." value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button className="wh-search-clear" onClick={() => setSearch('')}><X size={16} /></button>}
      </div>

      {inactiveCount > 0 && (
        <button
          type="button"
          className="wh-archived-toggle"
          onClick={() => setShowInactive(value => !value)}
          aria-expanded={showInactive}
        >
          {showInactive ? <EyeOff size={16} /> : <Eye size={16} />}
          {showInactive ? 'Ẩn kho đã lưu trữ' : `Kho đã lưu trữ (${inactiveCount})`}
        </button>
      )}

      {/* Table */}
      {loading ? (
        <div className="wh-loading"><div className="wh-spinner" /><p>Đang tải danh sách kho...</p></div>
      ) : visibleWarehouses.length === 0 ? (
        <div className="wh-empty"><Warehouse size={48} /><h3>{search ? 'Không tìm thấy kho phù hợp' : 'Chưa có kho đang hoạt động'}</h3><p>Nhấn &quot;Thêm kho mới&quot; để bắt đầu.</p></div>
      ) : (
        <div className="wh-table-wrap">
          <table className="wh-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã kho</th>
                <th>Tên kho</th>
                <th>Địa chỉ</th>
                <th>Người quản lý</th>
                <th>SĐT</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibleWarehouses.map((w, i) => (
                <tr key={w.id} className={w.is_active ? '' : 'wh-row-inactive'}>
                  <td className="wh-td-center">{i + 1}</td>
                  <td><span className="wh-code">{w.ma_kho}</span></td>
                  <td className="wh-td-name">{w.ten_kho}{!w.is_active && <span className="wh-inactive-badge">Đã lưu trữ</span>}</td>
                  <td>
                    {w.dia_chi ? (
                      <span className="wh-address"><MapPin size={12} />{w.dia_chi}</span>
                    ) : '—'}
                  </td>
                  <td>
                    {w.nguoi_quan_ly ? (
                      <span className="wh-manager"><User size={12} />{w.nguoi_quan_ly}</span>
                    ) : '—'}
                  </td>
                  <td>
                    {w.sdt ? (
                      <span className="wh-phone"><Phone size={12} />{w.sdt}</span>
                    ) : '—'}
                  </td>
                  <td className="wh-td-actions">
                    <button className="wh-btn-icon" title="Chỉnh sửa" onClick={() => handleEdit(w)}><Edit2 size={15} /></button>
                    <button
                      className="wh-btn-icon"
                      title={w.is_active ? 'Ẩn kho khỏi hệ thống đang hoạt động' : 'Khôi phục kho'}
                      onClick={() => handleToggleActive(w)}
                      disabled={togglingActiveId === w.id}
                    >
                      {w.is_active ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button className="wh-btn-icon wh-btn-icon-danger" title="Xóa" onClick={() => setDeleteTarget(w)}><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
