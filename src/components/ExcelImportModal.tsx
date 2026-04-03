'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, X, Check, AlertCircle, ArrowRight, RefreshCw, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';

// Database columns + Vietnamese labels
const DB_COLUMNS = [
  { key: 'ma_hom', label: 'Mã hòm', required: true },
  { key: 'ten_hom', label: 'Tên hòm', required: true },
  { key: 'gia_ban', label: 'Giá bán' },
  { key: 'gia_von', label: 'Giá vốn' },
  { key: 'NCC', label: 'Nhà cung cấp' },
  { key: 'loai_hom', label: 'Loại hòm' },
  { key: 'kich_thuoc', label: 'Kích thước' },
  { key: 'do_day_thanh', label: 'Độ dày thành' },
  { key: 'don_vi_tinh', label: 'Đơn vị tính' },
  { key: 'tinh_chat', label: 'Tính chất' },
  { key: 'thong_so_khac', label: 'Thông số khác' },
  { key: 'muc_dich_su_dung', label: 'Mục đích sử dụng' },
  { key: 'mo_ta', label: 'Mô tả' },
  { key: 'hinh_anh', label: 'Hình ảnh (URL)' },
];

// Common Vietnamese → DB column aliases for auto-matching
const ALIASES: Record<string, string> = {
  // ma_hom
  'ma hom': 'ma_hom', 'mã hòm': 'ma_hom', 'mahom': 'ma_hom', 'ma_hom': 'ma_hom',
  'mã': 'ma_hom', 'ma': 'ma_hom', 'mã sp': 'ma_hom', 'mã sản phẩm': 'ma_hom',
  'product code': 'ma_hom', 'code': 'ma_hom', 'sku': 'ma_hom', 'msp': 'ma_hom',
  // ten_hom
  'ten hom': 'ten_hom', 'tên hòm': 'ten_hom', 'tenhom': 'ten_hom', 'ten_hom': 'ten_hom',
  'tên': 'ten_hom', 'ten': 'ten_hom', 'tên sp': 'ten_hom', 'tên sản phẩm': 'ten_hom',
  'product name': 'ten_hom', 'name': 'ten_hom', 'sản phẩm': 'ten_hom',
  // gia_ban
  'gia ban': 'gia_ban', 'giá bán': 'gia_ban', 'giaban': 'gia_ban', 'gia_ban': 'gia_ban',
  'selling price': 'gia_ban', 'price': 'gia_ban', 'đơn giá': 'gia_ban', 'don gia': 'gia_ban',
  // gia_von
  'gia von': 'gia_von', 'giá vốn': 'gia_von', 'giavon': 'gia_von', 'gia_von': 'gia_von',
  'cost': 'gia_von', 'cost price': 'gia_von', 'giá nhập': 'gia_von', 'gia nhap': 'gia_von',
  // NCC
  'ncc': 'NCC', 'nhà cung cấp': 'NCC', 'nha cung cap': 'NCC', 'supplier': 'NCC',
  'nhà cc': 'NCC', 'vendor': 'NCC',
  // loai_hom
  'loai hom': 'loai_hom', 'loại hòm': 'loai_hom', 'loaihom': 'loai_hom', 'loai_hom': 'loai_hom',
  'loại': 'loai_hom', 'loai': 'loai_hom', 'type': 'loai_hom', 'category': 'loai_hom',
  // kich_thuoc
  'kich thuoc': 'kich_thuoc', 'kích thước': 'kich_thuoc', 'kichthuoc': 'kich_thuoc', 'kich_thuoc': 'kich_thuoc',
  'size': 'kich_thuoc', 'dimensions': 'kich_thuoc', 'kt': 'kich_thuoc',
  // do_day_thanh
  'do day thanh': 'do_day_thanh', 'độ dày thành': 'do_day_thanh', 'do_day_thanh': 'do_day_thanh',
  'độ dày': 'do_day_thanh', 'thickness': 'do_day_thanh',
  // don_vi_tinh
  'don vi tinh': 'don_vi_tinh', 'đơn vị tính': 'don_vi_tinh', 'don_vi_tinh': 'don_vi_tinh',
  'đvt': 'don_vi_tinh', 'dvt': 'don_vi_tinh', 'unit': 'don_vi_tinh',
  // tinh_chat
  'tinh chat': 'tinh_chat', 'tính chất': 'tinh_chat', 'tinhchat': 'tinh_chat', 'tinh_chat': 'tinh_chat',
  'chất liệu': 'tinh_chat', 'chat lieu': 'tinh_chat', 'material': 'tinh_chat',
  // thong_so_khac
  'thong so khac': 'thong_so_khac', 'thông số khác': 'thong_so_khac', 'thong_so_khac': 'thong_so_khac',
  'other specs': 'thong_so_khac',
  // muc_dich_su_dung
  'muc dich su dung': 'muc_dich_su_dung', 'mục đích sử dụng': 'muc_dich_su_dung', 'muc_dich_su_dung': 'muc_dich_su_dung',
  'mục đích': 'muc_dich_su_dung', 'purpose': 'muc_dich_su_dung', 'usage': 'muc_dich_su_dung',
  // mo_ta
  'mo ta': 'mo_ta', 'mô tả': 'mo_ta', 'mota': 'mo_ta', 'mo_ta': 'mo_ta',
  'description': 'mo_ta', 'ghi chú': 'mo_ta', 'ghi chu': 'mo_ta', 'note': 'mo_ta',
  // hinh_anh
  'hinh anh': 'hinh_anh', 'hình ảnh': 'hinh_anh', 'hinhanh': 'hinh_anh', 'hinh_anh': 'hinh_anh',
  'image': 'hinh_anh', 'photo': 'hinh_anh', 'url': 'hinh_anh',
};

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[_\-\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function autoMatchColumn(excelHeader: string): string {
  const normalized = normalizeHeader(excelHeader);

  // Exact match in aliases
  if (ALIASES[normalized]) return ALIASES[normalized];

  // Partial match
  for (const [alias, dbCol] of Object.entries(ALIASES)) {
    if (normalized.includes(alias) || alias.includes(normalized)) {
      return dbCol;
    }
  }

  // Direct DB column name match
  const asDbCol = normalized.replace(/\s/g, '_');
  if (DB_COLUMNS.find(c => c.key === asDbCol)) return asDbCol;

  return ''; // No match
}

interface ExcelImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImportDone: () => void;
  userEmail: string;
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'done';

export default function ExcelImportModal({ isOpen, onClose, onImportDone, userEmail }: ExcelImportProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [fileName, setFileName] = useState('');
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelData, setExcelData] = useState<Record<string, unknown>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<{
    total: number; inserted: number; updated: number; skipped: number; errors: string[];
  } | null>(null);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setStep('upload');
    setFileName('');
    setExcelHeaders([]);
    setExcelData([]);
    setColumnMapping({});
    setImportResult(null);
    setError('');
    setImporting(false);
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

        if (jsonData.length === 0) {
          setError('File Excel không có dữ liệu.');
          return;
        }

        const headers = Object.keys(jsonData[0]);
        setExcelHeaders(headers);
        setExcelData(jsonData);

        // Auto-match columns
        const mapping: Record<string, string> = {};
        headers.forEach(h => {
          const matched = autoMatchColumn(h);
          if (matched) mapping[h] = matched;
        });
        setColumnMapping(mapping);

        setStep('mapping');
      } catch {
        setError('Không thể đọc file. Vui lòng kiểm tra định dạng .xlsx hoặc .csv.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleMappingChange = (excelCol: string, dbCol: string) => {
    setColumnMapping(prev => {
      const next = { ...prev };
      if (dbCol === '') {
        delete next[excelCol];
      } else {
        // Remove previous mapping for same DB column
        for (const key of Object.keys(next)) {
          if (next[key] === dbCol && key !== excelCol) {
            delete next[key];
          }
        }
        next[excelCol] = dbCol;
      }
      return next;
    });
  };

  const hasMaHom = Object.values(columnMapping).includes('ma_hom');

  const getMappedRows = (): Record<string, unknown>[] => {
    return excelData.map(row => {
      const mapped: Record<string, unknown> = {};
      for (const [excelCol, dbCol] of Object.entries(columnMapping)) {
        if (dbCol) {
          mapped[dbCol] = row[excelCol];
        }
      }
      return mapped;
    }).filter(r => r.ma_hom); // Filter out rows without ma_hom
  };

  const handleGoToPreview = () => {
    if (!hasMaHom) {
      setError('Phải chọn cột tương ứng cho "Mã hòm" (bắt buộc).');
      return;
    }
    setError('');
    setStep('preview');
  };

  const handleImport = async () => {
    setImporting(true);
    setError('');
    setStep('importing');

    try {
      const mappedRows = getMappedRows();
      const res = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: mappedRows, email: userEmail }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Lỗi import');
        setStep('preview');
        return;
      }

      setImportResult(json);
      setStep('done');
      onImportDone();
    } catch {
      setError('Lỗi kết nối server');
      setStep('preview');
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  const mappedRows = step === 'preview' ? getMappedRows() : [];
  const mappedDbCols = Object.values(columnMapping).filter(Boolean);

  return (
    <div className="pm-form-overlay" onClick={handleClose}>
      <div className="excel-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="excel-modal-header">
          <div className="excel-modal-header-left">
            <FileSpreadsheet size={22} />
            <div>
              <h2>Import sản phẩm từ Excel</h2>
              <p className="excel-modal-subtitle">
                {step === 'upload' && 'Chọn file Excel hoặc CSV để import'}
                {step === 'mapping' && `Ghép cột Excel → Database (${fileName})`}
                {step === 'preview' && `Xem trước dữ liệu (${mappedRows.length} dòng)`}
                {step === 'importing' && 'Đang import dữ liệu...'}
                {step === 'done' && 'Import hoàn tất!'}
              </p>
            </div>
          </div>
          <button className="pm-form-close" onClick={handleClose}><X size={20} /></button>
        </div>

        {/* Steps indicator */}
        <div className="excel-steps">
          {['upload', 'mapping', 'preview', 'done'].map((s, i) => (
            <div key={s} className={`excel-step ${step === s || (step === 'importing' && s === 'done') ? 'active' : ''} ${
              ['upload', 'mapping', 'preview', 'done'].indexOf(step === 'importing' ? 'done' : step) > i ? 'completed' : ''
            }`}>
              <div className="excel-step-num">{i + 1}</div>
              <span>{['Tải file', 'Ghép cột', 'Xem trước', 'Hoàn tất'][i]}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="excel-modal-body">
          {error && (
            <div className="excel-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="excel-upload-area" onClick={() => fileInputRef.current?.click()}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <Upload size={48} className="excel-upload-icon" />
              <h3>Kéo thả file hoặc nhấn để chọn</h3>
              <p>Hỗ trợ: .xlsx, .xls, .csv</p>
              <p className="excel-upload-tip">
                💡 Hệ thống sẽ tự động ghép tên cột Excel với cột database
              </p>
            </div>
          )}

          {/* Step 2: Column mapping */}
          {step === 'mapping' && (
            <div className="excel-mapping">
              <div className="excel-mapping-info">
                <span className="excel-badge excel-badge-info">
                  {excelHeaders.length} cột trong Excel
                </span>
                <span className="excel-badge excel-badge-success">
                  {Object.keys(columnMapping).length} cột đã ghép
                </span>
                {!hasMaHom && (
                  <span className="excel-badge excel-badge-warn">
                    ⚠ Chưa ghép cột &quot;Mã hòm&quot; (bắt buộc)
                  </span>
                )}
              </div>

              <div className="excel-mapping-list">
                <div className="excel-mapping-row excel-mapping-header-row">
                  <div>Cột Excel</div>
                  <div></div>
                  <div>Cột Database</div>
                  <div>Dữ liệu mẫu</div>
                </div>
                {excelHeaders.map(header => {
                  const mapped = columnMapping[header] || '';
                  const dbInfo = DB_COLUMNS.find(c => c.key === mapped);
                  const sample = excelData[0]?.[header];
                  return (
                    <div key={header} className={`excel-mapping-row ${mapped ? 'mapped' : 'unmapped'}`}>
                      <div className="excel-col-name" title={header}>
                        {header}
                      </div>
                      <div className="excel-arrow">
                        <ArrowRight size={16} />
                      </div>
                      <div className="excel-select-wrap">
                        <select
                          value={mapped}
                          onChange={e => handleMappingChange(header, e.target.value)}
                          className={mapped ? 'has-value' : ''}
                        >
                          <option value="">— Bỏ qua —</option>
                          {DB_COLUMNS.map(col => {
                            const taken = mappedDbCols.includes(col.key) && mapped !== col.key;
                            return (
                              <option key={col.key} value={col.key} disabled={taken}>
                                {col.label} ({col.key}){col.required ? ' *' : ''}{taken ? ' ✓' : ''}
                              </option>
                            );
                          })}
                        </select>
                        <ChevronDown size={14} className="excel-select-icon" />
                      </div>
                      <div className="excel-sample" title={String(sample || '')}>
                        {String(sample || '—').slice(0, 30)}
                      </div>
                    </div>
                  );
                  return null;
                })}
              </div>

              <div className="excel-actions">
                <button className="pm-btn-cancel" onClick={() => { resetState(); }}>
                  Hủy
                </button>
                <button
                  className="pm-btn-save"
                  onClick={handleGoToPreview}
                  disabled={!hasMaHom}
                >
                  Xem trước <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="excel-preview">
              <div className="excel-preview-stats">
                <span className="excel-badge excel-badge-info">
                  {mappedRows.length} sản phẩm sẽ được import
                </span>
                <span className="excel-badge excel-badge-success">
                  {mappedDbCols.length} cột dữ liệu
                </span>
              </div>

              <div className="excel-preview-table-wrap">
                <table className="excel-preview-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      {mappedDbCols.map(col => {
                        const info = DB_COLUMNS.find(c => c.key === col);
                        return <th key={col}>{info?.label || col}</th>;
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {mappedRows.slice(0, 20).map((row, i) => (
                      <tr key={i}>
                        <td className="pm-td-center">{i + 1}</td>
                        {mappedDbCols.map(col => (
                          <td key={col}>
                            {col === 'ma_hom' ? (
                              <span className="pm-code">{String(row[col] || '')}</span>
                            ) : (
                              String(row[col] || '—')
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {mappedRows.length > 20 && (
                  <p className="excel-preview-more">... và {mappedRows.length - 20} dòng nữa</p>
                )}
              </div>

              <div className="excel-actions">
                <button className="pm-btn-cancel" onClick={() => setStep('mapping')}>
                  ← Quay lại
                </button>
                <button className="excel-btn-import" onClick={handleImport}>
                  <Upload size={16} />
                  Import {mappedRows.length} sản phẩm
                </button>
              </div>
            </div>
          )}

          {/* Step 3.5: Importing */}
          {step === 'importing' && (
            <div className="excel-importing">
              <RefreshCw size={40} className="excel-spin" />
              <h3>Đang import dữ liệu...</h3>
              <p>Vui lòng chờ, đừng đóng cửa sổ này.</p>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && importResult && (
            <div className="excel-done">
              <div className="excel-done-icon">
                <Check size={36} />
              </div>
              <h3>Import hoàn tất!</h3>

              <div className="excel-done-stats">
                <div className="excel-stat">
                  <span className="excel-stat-num excel-stat-total">{importResult.total}</span>
                  <span>Tổng dòng</span>
                </div>
                <div className="excel-stat">
                  <span className="excel-stat-num excel-stat-inserted">{importResult.inserted}</span>
                  <span>Thêm mới</span>
                </div>
                <div className="excel-stat">
                  <span className="excel-stat-num excel-stat-updated">{importResult.updated}</span>
                  <span>Cập nhật</span>
                </div>
                <div className="excel-stat">
                  <span className="excel-stat-num excel-stat-skipped">{importResult.skipped}</span>
                  <span>Bỏ qua</span>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="excel-done-errors">
                  <h4>⚠ Lỗi ({importResult.errors.length})</h4>
                  <ul>
                    {importResult.errors.slice(0, 10).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                    {importResult.errors.length > 10 && (
                      <li>... và {importResult.errors.length - 10} lỗi khác</li>
                    )}
                  </ul>
                </div>
              )}

              <div className="excel-actions">
                <button className="pm-btn-save" onClick={handleClose}>
                  Đóng
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
