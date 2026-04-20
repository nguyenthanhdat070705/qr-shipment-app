'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, X, Check, Edit2, ChevronDown, ChevronUp, Truck, Phone, FileText, MapPin, Trash2, Upload, FileSpreadsheet, ArrowRight, RefreshCw, AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
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

// ── Excel column mapping ──
const NCC_DB_COLUMNS = [
  { key: 'ma_ncc', label: 'Mã NCC', required: true },
  { key: 'ten_ncc', label: 'Tên NCC', required: true },
  { key: 'nguoi_lien_he', label: 'Người liên hệ' },
  { key: 'sdt', label: 'SĐT' },
  { key: 'noi_dung', label: 'Nội dung' },
  { key: 'thong_tin_lien_he', label: 'Thông tin liên hệ' },
  { key: 'ghi_chu', label: 'Ghi chú' },
  { key: 'thong_tin_hoa_don', label: 'Thông tin hóa đơn' },
  { key: 'dia_chi', label: 'Địa chỉ' },
  { key: 'email', label: 'Email' },
];

const NCC_ALIASES: Record<string, string> = {
  'ma ncc': 'ma_ncc', 'mã ncc': 'ma_ncc', 'mancc': 'ma_ncc', 'ma_ncc': 'ma_ncc',
  'mã nhà cung cấp': 'ma_ncc', 'supplier code': 'ma_ncc', 'code': 'ma_ncc',
  'ten ncc': 'ten_ncc', 'tên ncc': 'ten_ncc', 'tenncc': 'ten_ncc', 'ten_ncc': 'ten_ncc',
  'tên nhà cung cấp': 'ten_ncc', 'supplier name': 'ten_ncc', 'name': 'ten_ncc', 'tên': 'ten_ncc',
  'nguoi lien he': 'nguoi_lien_he', 'người liên hệ': 'nguoi_lien_he', 'tên người liên hệ': 'nguoi_lien_he',
  'contact': 'nguoi_lien_he', 'contact person': 'nguoi_lien_he', 'nguoi_lien_he': 'nguoi_lien_he',
  'sdt': 'sdt', 'số điện thoại': 'sdt', 'so dien thoai': 'sdt', 'phone': 'sdt', 'điện thoại': 'sdt', 'sđt': 'sdt',
  'noi dung': 'noi_dung', 'nội dung': 'noi_dung', 'content': 'noi_dung', 'noi_dung': 'noi_dung',
  'thong tin lien he': 'thong_tin_lien_he', 'thông tin liên hệ': 'thong_tin_lien_he',
  'contact info': 'thong_tin_lien_he', 'thong_tin_lien_he': 'thong_tin_lien_he',
  'ghi chu': 'ghi_chu', 'ghi chú': 'ghi_chu', 'note': 'ghi_chu', 'notes': 'ghi_chu', 'ghi_chu': 'ghi_chu',
  'thong tin hoa don': 'thong_tin_hoa_don', 'thông tin hóa đơn': 'thong_tin_hoa_don',
  'hóa đơn': 'thong_tin_hoa_don', 'invoice': 'thong_tin_hoa_don', 'thong_tin_hoa_don': 'thong_tin_hoa_don',
  'thông tin thanh toán': 'thong_tin_hoa_don', 'thanh toán': 'thong_tin_hoa_don', 'payment': 'thong_tin_hoa_don',
  'dia chi': 'dia_chi', 'địa chỉ': 'dia_chi', 'address': 'dia_chi', 'dia_chi': 'dia_chi',
  'địa chỉ nhà cc': 'dia_chi', 'dia chi nha cc': 'dia_chi',
  'email': 'email', 'e-mail': 'email', 'mail': 'email',
};

function autoMatchNcc(header: string): string {
  const norm = header.toLowerCase().replace(/[_\-\.]/g, ' ').replace(/\s+/g, ' ').trim();
  if (NCC_ALIASES[norm]) return NCC_ALIASES[norm];
  for (const [alias, dbCol] of Object.entries(NCC_ALIASES)) {
    if (norm.includes(alias) || alias.includes(norm)) return dbCol;
  }
  const asDb = norm.replace(/\s/g, '_');
  if (NCC_DB_COLUMNS.find(c => c.key === asDb)) return asDb;
  return '';
}

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

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Excel import state
  const [showExcel, setShowExcel] = useState(false);
  const [excelStep, setExcelStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'done'>('upload');
  const [excelFileName, setExcelFileName] = useState('');
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelData, setExcelData] = useState<Record<string, unknown>[]>([]);
  const [excelMapping, setExcelMapping] = useState<Record<string, string>>({});
  const [excelError, setExcelError] = useState('');
  const [excelImporting, setExcelImporting] = useState(false);
  const [excelResult, setExcelResult] = useState<{ total: number; inserted: number; updated: number; skipped: number; errors: string[] } | null>(null);
  const excelFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) setUserEmail(JSON.parse(raw).email || '');
    } catch { /* ignore */ }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/suppliers?t=' + Date.now(), { cache: 'no-store' });
      const json = await res.json();
      setSuppliers(json.data || []);
    } catch { console.error('Fetch error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // ── Submit create/edit ──
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
      if (!res.ok) { setMessage({ type: 'error', text: json.error || 'Lỗi' }); return; }
      setMessage({ type: 'success', text: isEdit ? `Đã cập nhật NCC "${form.ma_ncc}"` : `Đã tạo NCC "${form.ma_ncc}" thành công!` });
      setShowForm(false); setEditingId(null); setForm(EMPTY_FORM);
      fetchSuppliers();
    } catch { setMessage({ type: 'error', text: 'Lỗi kết nối server' }); }
    finally { setSaving(false); }
  };

  const handleEdit = (sup: Supplier) => {
    setEditingId(sup.id);
    setForm({
      ma_ncc: sup.ma_ncc, ten_ncc: sup.ten_ncc,
      nguoi_lien_he: sup.nguoi_lien_he || '', sdt: sup.sdt || '',
      dia_chi: sup.dia_chi || '', email: sup.email || '',
      ghi_chu: sup.ghi_chu || '', noi_dung: sup.noi_dung || '',
      thong_tin_lien_he: sup.thong_tin_lien_he || '', thong_tin_hoa_don: sup.thong_tin_hoa_don || '',
    });
    setShowForm(true);
  };

  const handleCancel = () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); setMessage(null); };

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id, email: userEmail }),
      });
      const json = await res.json();
      if (!res.ok) { setMessage({ type: 'error', text: json.error || 'Xóa thất bại' }); }
      else { setMessage({ type: 'success', text: `Đã xóa NCC "${deleteTarget.ma_ncc}"` }); fetchSuppliers(); }
    } catch { setMessage({ type: 'error', text: 'Lỗi kết nối' }); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  // ── Excel import ──
  const resetExcel = () => {
    setExcelStep('upload'); setExcelFileName(''); setExcelHeaders([]); setExcelData([]);
    setExcelMapping({}); setExcelError(''); setExcelImporting(false); setExcelResult(null);
  };
  const closeExcel = () => { resetExcel(); setShowExcel(false); };

  const handleExcelFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelError('');
    setExcelFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        if (json.length === 0) { setExcelError('File không có dữ liệu.'); return; }
        const headers = Object.keys(json[0]);
        setExcelHeaders(headers);
        setExcelData(json);
        const mapping: Record<string, string> = {};
        headers.forEach(h => { const m = autoMatchNcc(h); if (m) mapping[h] = m; });
        setExcelMapping(mapping);
        setExcelStep('mapping');
      } catch { setExcelError('Không thể đọc file.'); }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExcelMappingChange = (excelCol: string, dbCol: string) => {
    setExcelMapping(prev => {
      const next = { ...prev };
      if (!dbCol) { delete next[excelCol]; }
      else {
        for (const k of Object.keys(next)) { if (next[k] === dbCol && k !== excelCol) delete next[k]; }
        next[excelCol] = dbCol;
      }
      return next;
    });
  };

  const hasMaNcc = Object.values(excelMapping).includes('ma_ncc');
  const mappedDbCols = Object.values(excelMapping).filter(Boolean);

  const getMappedRows = () => {
    return excelData.map(row => {
      const mapped: Record<string, unknown> = {};
      for (const [ec, dc] of Object.entries(excelMapping)) { if (dc) mapped[dc] = row[ec]; }
      return mapped;
    }).filter(r => r.ma_ncc);
  };

  const handleExcelImport = async () => {
    setExcelImporting(true); setExcelError(''); setExcelStep('importing');
    try {
      const rows = getMappedRows();
      const res = await fetch('/api/suppliers/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, email: userEmail }),
      });
      const json = await res.json();
      if (!res.ok) { setExcelError(json.error || 'Lỗi import'); setExcelStep('preview'); return; }
      setExcelResult(json); setExcelStep('done'); fetchSuppliers();
    } catch { setExcelError('Lỗi kết nối'); setExcelStep('preview'); }
    finally { setExcelImporting(false); }
  };

  const filtered = suppliers.filter(s => {
    const q = search.toLowerCase();
    return s.ma_ncc.toLowerCase().includes(q) || s.ten_ncc.toLowerCase().includes(q) ||
      (s.nguoi_lien_he || '').toLowerCase().includes(q) || (s.sdt || '').toLowerCase().includes(q);
  });

  const mappedRows = excelStep === 'preview' ? getMappedRows() : [];

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
        <div className="ncc-header-actions">
          <button className="ncc-btn-upload" onClick={() => setShowExcel(true)}>
            <Upload size={18} />
            Import Excel
          </button>
          <button className="ncc-btn-create" onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); }}>
            <Plus size={18} />
            Thêm NCC mới
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`ncc-message ncc-message-${message.type}`}>
          {message.type === 'success' ? <Check size={18} /> : <X size={18} />}
          {message.text}
          <button className="ncc-message-close" onClick={() => setMessage(null)}><X size={14} /></button>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="ncc-form-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="ncc-delete-modal" onClick={e => e.stopPropagation()}>
            <div className="ncc-delete-header">
              <AlertTriangle size={24} className="ncc-delete-icon" />
              <div>
                <h3>Xóa nhà cung cấp</h3>
                <p>Hành động này không thể hoàn tác</p>
              </div>
            </div>
            <div className="ncc-delete-body">
              <p>Bạn có chắc muốn xóa NCC <strong>{deleteTarget.ma_ncc}</strong> — <strong>{deleteTarget.ten_ncc}</strong>?</p>
            </div>
            <div className="ncc-delete-actions">
              <button className="ncc-btn-cancel" onClick={() => setDeleteTarget(null)} disabled={deleting}>Hủy</button>
              <button className="ncc-btn-delete" onClick={handleDelete} disabled={deleting}>
                {deleting ? <><Loader2 size={14} className="ncc-spin" /> Đang xóa...</> : <><Trash2 size={14} /> Xác nhận xóa</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Excel Import Modal ── */}
      {showExcel && (
        <div className="ncc-form-overlay" onClick={closeExcel}>
          <div className="ncc-excel-modal" onClick={e => e.stopPropagation()}>
            <div className="ncc-excel-header">
              <div className="ncc-excel-header-left">
                <FileSpreadsheet size={22} />
                <div>
                  <h2>Import NCC từ Excel</h2>
                  <p className="ncc-excel-subtitle">
                    {excelStep === 'upload' && 'Chọn file Excel hoặc CSV'}
                    {excelStep === 'mapping' && `Ghép cột Excel → Database (${excelFileName})`}
                    {excelStep === 'preview' && `Xem trước (${getMappedRows().length} dòng)`}
                    {excelStep === 'importing' && 'Đang import...'}
                    {excelStep === 'done' && 'Hoàn tất!'}
                  </p>
                </div>
              </div>
              <button className="ncc-form-close" onClick={closeExcel}><X size={20} /></button>
            </div>

            <div className="ncc-excel-body">
              {excelError && <div className="ncc-excel-error"><AlertCircle size={16} />{excelError}</div>}

              {/* Upload */}
              {excelStep === 'upload' && (
                <div className="ncc-excel-upload" onClick={() => excelFileRef.current?.click()}>
                  <input ref={excelFileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelFile} style={{ display: 'none' }} />
                  <Upload size={48} className="ncc-excel-upload-icon" />
                  <h3>Kéo thả file hoặc nhấn để chọn</h3>
                  <p>.xlsx, .xls, .csv</p>
                </div>
              )}

              {/* Mapping */}
              {excelStep === 'mapping' && (
                <div className="ncc-excel-mapping">
                  <div className="ncc-excel-badges">
                    <span className="ncc-badge ncc-badge-info">{excelHeaders.length} cột Excel</span>
                    <span className="ncc-badge ncc-badge-ok">{Object.keys(excelMapping).length} đã ghép</span>
                    {!hasMaNcc && <span className="ncc-badge ncc-badge-warn">⚠ Chưa ghép &quot;Mã NCC&quot;</span>}
                  </div>
                  <div className="ncc-excel-map-table-wrap">
                    <table className="ncc-excel-map-table">
                      <thead>
                        <tr>
                          <th>Cột Excel</th>
                          <th></th>
                          <th>Cột Database</th>
                          <th>Dữ liệu mẫu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {excelHeaders.map(h => {
                          const mapped = excelMapping[h] || '';
                          const sample = excelData[0]?.[h];
                          return (
                            <tr key={h} className={mapped ? 'ncc-map-row-mapped' : ''}>
                              <td className="ncc-map-col-name">{h}</td>
                              <td className="ncc-map-arrow"><ArrowRight size={14} /></td>
                              <td>
                                <select
                                  value={mapped}
                                  onChange={e => handleExcelMappingChange(h, e.target.value)}
                                  className={`ncc-map-select ${mapped ? 'has-value' : ''}`}
                                >
                                  <option value="">— Bỏ qua —</option>
                                  {NCC_DB_COLUMNS.map(c => {
                                    const taken = mappedDbCols.includes(c.key) && mapped !== c.key;
                                    return <option key={c.key} value={c.key} disabled={taken}>{c.label}{c.required ? ' *' : ''}{taken ? ' ✓' : ''}</option>;
                                  })}
                                </select>
                              </td>
                              <td className="ncc-map-sample">{String(sample || '—').slice(0, 30)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="ncc-excel-actions">
                    <button className="ncc-btn-cancel" onClick={resetExcel}>Hủy</button>
                    <button className="ncc-btn-save" onClick={() => { if (!hasMaNcc) { setExcelError('Phải ghép cột "Mã NCC"'); return; } setExcelError(''); setExcelStep('preview'); }} disabled={!hasMaNcc}>
                      Xem trước <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Preview */}
              {excelStep === 'preview' && (
                <div className="ncc-excel-preview">
                  <div className="ncc-excel-badges">
                    <span className="ncc-badge ncc-badge-info">{mappedRows.length} NCC</span>
                    <span className="ncc-badge ncc-badge-ok">{mappedDbCols.length} cột</span>
                  </div>
                  <div className="ncc-excel-table-wrap">
                    <table className="ncc-table">
                      <thead><tr><th>#</th>{mappedDbCols.map(c => <th key={c}>{NCC_DB_COLUMNS.find(x => x.key === c)?.label || c}</th>)}</tr></thead>
                      <tbody>
                        {mappedRows.slice(0, 20).map((r, i) => (
                          <tr key={i}>
                            <td className="ncc-td-center">{i + 1}</td>
                            {mappedDbCols.map(c => <td key={c}>{c === 'ma_ncc' ? <span className="ncc-code">{String(r[c] || '')}</span> : String(r[c] || '—')}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {mappedRows.length > 20 && <p className="ncc-excel-more">... và {mappedRows.length - 20} dòng nữa</p>}
                  </div>
                  <div className="ncc-excel-actions">
                    <button className="ncc-btn-cancel" onClick={() => setExcelStep('mapping')}>← Quay lại</button>
                    <button className="ncc-btn-import" onClick={handleExcelImport}><Upload size={16} /> Import {mappedRows.length} NCC</button>
                  </div>
                </div>
              )}

              {/* Importing */}
              {excelStep === 'importing' && (
                <div className="ncc-excel-importing">
                  <RefreshCw size={40} className="ncc-spin" />
                  <h3>Đang import...</h3>
                  <p>Vui lòng chờ.</p>
                </div>
              )}

              {/* Done */}
              {excelStep === 'done' && excelResult && (
                <div className="ncc-excel-done">
                  <div className="ncc-excel-done-icon"><Check size={36} /></div>
                  <h3>Import hoàn tất!</h3>
                  <div className="ncc-excel-stats">
                    <div><span className="ncc-stat-num">{excelResult.total}</span><span>Tổng</span></div>
                    <div><span className="ncc-stat-num ncc-stat-ok">{excelResult.inserted}</span><span>Thêm mới</span></div>
                    <div><span className="ncc-stat-num ncc-stat-up">{excelResult.updated}</span><span>Cập nhật</span></div>
                    <div><span className="ncc-stat-num ncc-stat-skip">{excelResult.skipped}</span><span>Bỏ qua</span></div>
                  </div>
                  {excelResult.errors.length > 0 && (
                    <div className="ncc-excel-errors">
                      <h4>⚠ Lỗi ({excelResult.errors.length})</h4>
                      <ul>{excelResult.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}</ul>
                    </div>
                  )}
                  <div className="ncc-excel-actions"><button className="ncc-btn-save" onClick={closeExcel}>Đóng</button></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Form tạo/chỉnh sửa ── */}
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
                    <input type="text" value={form.ma_ncc} onChange={e => handleChange('ma_ncc', e.target.value.toUpperCase())} placeholder="VD: NCC001" disabled={!!editingId} required />
                  </div>
                  <div className="ncc-field">
                    <label>Tên NCC <span className="ncc-required">*</span></label>
                    <input type="text" value={form.ten_ncc} onChange={e => handleChange('ten_ncc', e.target.value)} placeholder="VD: Công ty TNHH ABC" required />
                  </div>
                  <div className="ncc-field">
                    <label>Tên người liên hệ</label>
                    <input type="text" value={form.nguoi_lien_he} onChange={e => handleChange('nguoi_lien_he', e.target.value)} placeholder="VD: Nguyễn Văn A" />
                  </div>
                  <div className="ncc-field">
                    <label>SĐT</label>
                    <input type="text" value={form.sdt} onChange={e => handleChange('sdt', e.target.value)} placeholder="VD: 0901234567" />
                  </div>
                </div>
              </div>

              <div className="ncc-form-section">
                <h3 className="ncc-form-section-title">Liên hệ & địa chỉ</h3>
                <div className="ncc-form-grid">
                  <div className="ncc-field">
                    <label>Email</label>
                    <input type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="abc@company.com" />
                  </div>
                  <div className="ncc-field">
                    <label>Địa chỉ</label>
                    <input type="text" value={form.dia_chi} onChange={e => handleChange('dia_chi', e.target.value)} placeholder="123 Nguyễn Huệ, Q.1, HCM" />
                  </div>
                  <div className="ncc-field ncc-field-full">
                    <label>Thông tin liên hệ</label>
                    <textarea value={form.thong_tin_lien_he} onChange={e => handleChange('thong_tin_lien_he', e.target.value)} placeholder="Chi tiết liên hệ khác..." rows={2} />
                  </div>
                </div>
              </div>

              <div className="ncc-form-section">
                <h3 className="ncc-form-section-title">Nội dung & ghi chú</h3>
                <div className="ncc-form-grid">
                  <div className="ncc-field ncc-field-full">
                    <label>Nội dung</label>
                    <textarea value={form.noi_dung} onChange={e => handleChange('noi_dung', e.target.value)} placeholder="Mô tả hoạt động, lĩnh vực..." rows={2} />
                  </div>
                  <div className="ncc-field ncc-field-full">
                    <label>Thông tin hóa đơn</label>
                    <textarea value={form.thong_tin_hoa_don} onChange={e => handleChange('thong_tin_hoa_don', e.target.value)} placeholder="MST, tên công ty trên hóa đơn..." rows={2} />
                  </div>
                  <div className="ncc-field ncc-field-full">
                    <label>Ghi chú</label>
                    <textarea value={form.ghi_chu} onChange={e => handleChange('ghi_chu', e.target.value)} placeholder="Ghi chú thêm..." rows={2} />
                  </div>
                </div>
              </div>

              <div className="ncc-form-actions">
                <button type="button" className="ncc-btn-cancel" onClick={handleCancel}>Hủy</button>
                <button type="submit" className="ncc-btn-save" disabled={saving}>{saving ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Tạo NCC')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="ncc-search-bar">
        <Search size={18} />
        <input type="text" placeholder="Tìm theo mã NCC, tên, người liên hệ, SĐT..." value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button className="ncc-search-clear" onClick={() => setSearch('')}><X size={16} /></button>}
      </div>

      {/* Table */}
      {loading ? (
        <div className="ncc-loading"><div className="ncc-spinner" /><p>Đang tải danh sách NCC...</p></div>
      ) : filtered.length === 0 ? (
        <div className="ncc-empty"><Truck size={48} /><h3>Chưa có nhà cung cấp nào</h3><p>Nhấn &quot;Thêm NCC mới&quot; hoặc &quot;Import Excel&quot; để bắt đầu.</p></div>
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
                    <td>{s.nguoi_lien_he ? <span className="ncc-contact-name">{s.nguoi_lien_he}</span> : '—'}</td>
                    <td>{s.sdt ? <span className="ncc-phone"><Phone size={12} />{s.sdt}</span> : '—'}</td>
                    <td className="ncc-td-content">{s.noi_dung || '—'}</td>
                    <td className="ncc-td-actions">
                      <button className="ncc-btn-icon" title="Chỉnh sửa" onClick={() => handleEdit(s)}><Edit2 size={15} /></button>
                      <button className="ncc-btn-icon ncc-btn-icon-danger" title="Xóa" onClick={() => setDeleteTarget(s)}><Trash2 size={15} /></button>
                      <button className="ncc-btn-icon" title="Chi tiết" onClick={() => setExpandedRow(expandedRow === s.id ? null : s.id)}>
                        {expandedRow === s.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </td>
                  </tr>
                  {expandedRow === s.id && (
                    <tr key={`${s.id}-detail`} className="ncc-detail-row">
                      <td colSpan={7}>
                        <div className="ncc-detail-grid">
                          <div className="ncc-detail-item"><Phone size={14} className="ncc-detail-icon" /><div><strong>SĐT:</strong><span>{s.sdt || '—'}</span></div></div>
                          <div className="ncc-detail-item"><FileText size={14} className="ncc-detail-icon" /><div><strong>Email:</strong><span>{s.email || '—'}</span></div></div>
                          <div className="ncc-detail-item"><MapPin size={14} className="ncc-detail-icon" /><div><strong>Địa chỉ:</strong><span>{s.dia_chi || '—'}</span></div></div>
                          <div className="ncc-detail-item ncc-detail-full"><FileText size={14} className="ncc-detail-icon" /><div><strong>Thông tin liên hệ:</strong><span>{s.thong_tin_lien_he || '—'}</span></div></div>
                          <div className="ncc-detail-item ncc-detail-full"><FileText size={14} className="ncc-detail-icon" /><div><strong>Thông tin hóa đơn:</strong><span>{s.thong_tin_hoa_don || '—'}</span></div></div>
                          <div className="ncc-detail-item ncc-detail-full"><FileText size={14} className="ncc-detail-icon" /><div><strong>Ghi chú:</strong><span>{s.ghi_chu || '—'}</span></div></div>
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
