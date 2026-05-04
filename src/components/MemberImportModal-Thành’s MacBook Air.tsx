'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Upload, FileSpreadsheet, X, Check, AlertCircle, ArrowRight,
  RefreshCw, ChevronDown, Download, Crown
} from 'lucide-react';
import * as XLSX from 'xlsx';

/* ─────────────────────────────────────
   Database columns for members table
───────────────────────────────────── */
const DB_COLUMNS = [
  { key: 'full_name', label: 'Họ tên HV', required: true },
  { key: 'phone', label: 'Số điện thoại', required: true },
  { key: 'member_code', label: 'Mã hội viên' },
  { key: 'email', label: 'Email' },
  { key: 'id_number', label: 'Số CCCD/CMND' },
  { key: 'address', label: 'Địa chỉ' },
  { key: 'registered_date', label: 'Ngày đăng ký' },
  { key: 'expiry_date', label: 'Ngày hết hạn' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'branch', label: 'Chi nhánh' },
  { key: 'consultant_name', label: 'Tư vấn viên' },
  { key: 'service_package', label: 'Gói dịch vụ' },
  { key: 'contract_number', label: 'Số hợp đồng' },
  { key: 'contract_value', label: 'Giá trị HĐ' },
  { key: 'payment_method', label: 'Phương thức TT' },
  { key: 'notes', label: 'Ghi chú' },
];

/* ─────────────────────────────────────
   Vietnamese aliases for auto-matching
───────────────────────────────────── */
const ALIASES: Record<string, string> = {
  // full_name
  'ho ten': 'full_name', 'họ tên': 'full_name', 'hoten': 'full_name', 'full_name': 'full_name',
  'tên hv': 'full_name', 'ten hv': 'full_name', 'hội viên': 'full_name', 'hoi vien': 'full_name',
  'tên hội viên': 'full_name', 'ten hoi vien': 'full_name', 'tên khách hàng': 'full_name',
  'ten khach hang': 'full_name', 'khách hàng': 'full_name', 'khach hang': 'full_name',
  'họ và tên': 'full_name', 'ho va ten': 'full_name', 'name': 'full_name', 'tên': 'full_name',
  // phone
  'phone': 'phone', 'sdt': 'phone', 'sđt': 'phone', 'số điện thoại': 'phone',
  'so dien thoai': 'phone', 'điện thoại': 'phone', 'dien thoai': 'phone',
  'mobile': 'phone', 'tel': 'phone',
  // member_code
  'ma hv': 'member_code', 'mã hv': 'member_code', 'mahv': 'member_code', 'member_code': 'member_code',
  'mã hội viên': 'member_code', 'ma hoi vien': 'member_code', 'member code': 'member_code',
  // email
  'email': 'email', 'e-mail': 'email', 'mail': 'email',
  // id_number
  'cccd': 'id_number', 'cmnd': 'id_number', 'id_number': 'id_number', 'id number': 'id_number',
  'số cccd': 'id_number', 'so cccd': 'id_number', 'căn cước': 'id_number', 'can cuoc': 'id_number',
  'chứng minh': 'id_number', 'chung minh': 'id_number',
  // address
  'dia chi': 'address', 'địa chỉ': 'address', 'address': 'address',
  // registered_date
  'ngay dk': 'registered_date', 'ngày đk': 'registered_date', 'ngày đăng ký': 'registered_date',
  'ngay dang ky': 'registered_date', 'registered_date': 'registered_date', 'registration date': 'registered_date',
  'ngay tham gia': 'registered_date', 'ngày tham gia': 'registered_date',
  // expiry_date
  'ngay het han': 'expiry_date', 'ngày hết hạn': 'expiry_date', 'expiry_date': 'expiry_date',
  'het han': 'expiry_date', 'hết hạn': 'expiry_date',
  // status
  'trang thai': 'status', 'trạng thái': 'status', 'status': 'status',
  // branch
  'chi nhanh': 'branch', 'chi nhánh': 'branch', 'branch': 'branch',
  'cn': 'branch',
  // consultant_name
  'tu van': 'consultant_name', 'tư vấn': 'consultant_name', 'consultant_name': 'consultant_name',
  'tv': 'consultant_name', 'nhân viên tư vấn': 'consultant_name', 'nhan vien tu van': 'consultant_name',
  'tư vấn viên': 'consultant_name', 'tu van vien': 'consultant_name', 'sale': 'consultant_name',
  // service_package
  'goi dv': 'service_package', 'gói dv': 'service_package', 'gói dịch vụ': 'service_package',
  'goi dich vu': 'service_package', 'service_package': 'service_package', 'package': 'service_package',
  'gói': 'service_package', 'goi': 'service_package',
  // contract_number
  'so hd': 'contract_number', 'số hđ': 'contract_number', 'số hợp đồng': 'contract_number',
  'so hop dong': 'contract_number', 'contract_number': 'contract_number', 'contract': 'contract_number',
  'hợp đồng': 'contract_number', 'hop dong': 'contract_number',
  // contract_value
  'gia tri': 'contract_value', 'giá trị': 'contract_value', 'giá trị hđ': 'contract_value',
  'gia tri hd': 'contract_value', 'contract_value': 'contract_value', 'value': 'contract_value',
  'số tiền': 'contract_value', 'so tien': 'contract_value',
  // payment_method
  'phuong thuc tt': 'payment_method', 'phương thức tt': 'payment_method',
  'hinh thuc thanh toan': 'payment_method', 'payment_method': 'payment_method',
  'thanh toán': 'payment_method', 'thanh toan': 'payment_method',
  // notes
  'ghi chu': 'notes', 'ghi chú': 'notes', 'notes': 'notes', 'note': 'notes',
  'mô tả': 'notes', 'mo ta': 'notes',
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
  if (ALIASES[normalized]) return ALIASES[normalized];

  for (const [alias, dbCol] of Object.entries(ALIASES)) {
    if (normalized.includes(alias) || alias.includes(normalized)) {
      return dbCol;
    }
  }

  const asDbCol = normalized.replace(/\s/g, '_');
  if (DB_COLUMNS.find(c => c.key === asDbCol)) return asDbCol;

  return '';
}

/* ─────────────────────────────────────
   Template download utility
───────────────────────────────────── */
function downloadTemplate() {
  const headers = ['Họ tên', 'SĐT', 'CCCD', 'Email', 'Địa chỉ', 'Ngày ĐK', 'Chi nhánh', 'Tư vấn viên', 'Gói dịch vụ', 'Số HĐ', 'Giá trị HĐ', 'Ghi chú'];
  const sample = ['Nguyễn Văn A', '0901234567', '012345678901', 'a@mail.com', '123 Đường ABC, Q1, HCM', '14/04/2026', 'CN1', 'Trần B', 'Tiêu Chuẩn', 'HD-001', '2000000', ''];
  const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mẫu Hội Viên');
  // Set column widths
  ws['!cols'] = headers.map(() => ({ wch: 18 }));
  XLSX.writeFile(wb, 'Mau_Import_Hoi_Vien.xlsx');
}

/* ─────────────────────────────────────
   Component Props & Types
───────────────────────────────────── */
interface MemberImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImportDone: () => void;
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'done';

/* ─────────────────────────────────────
   Main Component
───────────────────────────────────── */
export default function MemberImportModal({ isOpen, onClose, onImportDone }: MemberImportProps) {
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

  const hasFullName = Object.values(columnMapping).includes('full_name');
  const mappedDbCols = Object.values(columnMapping).filter(Boolean);

  const getMappedRows = (): Record<string, unknown>[] => {
    return excelData.map(row => {
      const mapped: Record<string, unknown> = {};
      for (const [excelCol, dbCol] of Object.entries(columnMapping)) {
        if (dbCol) mapped[dbCol] = row[excelCol];
      }
      return mapped;
    }).filter(r => r.full_name);
  };

  const handleGoToPreview = () => {
    if (!hasFullName) {
      setError('Phải chọn cột tương ứng cho "Họ tên HV" (bắt buộc).');
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
      const res = await fetch('/api/membership/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: mappedRows }),
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="w-full max-w-3xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-500 to-yellow-600 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="font-extrabold text-lg">Import Hội Viên từ Excel</h2>
              <p className="text-white/80 text-xs">
                {step === 'upload' && 'Chọn file Excel hoặc CSV để import danh sách hội viên'}
                {step === 'mapping' && `Ghép cột Excel → Database (${fileName})`}
                {step === 'preview' && `Xem trước dữ liệu (${mappedRows.length} hội viên)`}
                {step === 'importing' && 'Đang import dữ liệu...'}
                {step === 'done' && 'Import hoàn tất!'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-white/20 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-1 py-3 px-6 border-b border-gray-100 bg-gray-50">
          {[
            { id: 'upload', label: 'Tải file' },
            { id: 'mapping', label: 'Ghép cột' },
            { id: 'preview', label: 'Xem trước' },
            { id: 'done', label: 'Hoàn tất' },
          ].map((s, i) => {
            const stepOrder = ['upload', 'mapping', 'preview', 'done'];
            const currentIdx = stepOrder.indexOf(step === 'importing' ? 'done' : step);
            const isActive = step === s.id || (step === 'importing' && s.id === 'done');
            const isCompleted = currentIdx > i;
            return (
              <div key={s.id} className="flex items-center gap-1">
                {i > 0 && <div className={`w-8 h-0.5 mx-1 rounded ${isCompleted ? 'bg-amber-500' : 'bg-gray-200'}`} />}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                  isActive ? 'bg-amber-100 text-amber-700' :
                  isCompleted ? 'bg-emerald-100 text-emerald-700' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                    isActive ? 'bg-amber-500 text-white' :
                    isCompleted ? 'bg-emerald-500 text-white' :
                    'bg-gray-200 text-gray-400'
                  }`}>
                    {isCompleted ? <Check size={10} /> : i + 1}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-semibold">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 py-14 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-amber-300 hover:bg-amber-50/30 transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 group-hover:scale-110 transition-transform">
                  <Upload size={28} />
                </div>
                <h3 className="font-bold text-gray-800">Kéo thả file hoặc nhấn để chọn</h3>
                <p className="text-xs text-gray-400">Hỗ trợ: .xlsx, .xls, .csv</p>
                <p className="text-xs text-amber-600 font-semibold mt-1">
                  💡 Hệ thống tự động nhận diện các cột tiếng Việt
                </p>
              </div>

              {/* Download template */}
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 mx-auto px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 text-xs font-bold hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Download size={14} />
                Tải file mẫu Excel
              </button>

              {/* Info */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-gray-700">📋 Hướng dẫn chuẩn bị file:</h4>
                <ul className="text-xs text-gray-500 space-y-1 pl-4 list-disc">
                  <li><strong>Bắt buộc:</strong> Cột &quot;Họ tên&quot; (hoặc tên tương tự)</li>
                  <li><strong>Đề nghị:</strong> SĐT, CCCD, Ngày ĐK, Chi nhánh</li>
                  <li>Mã HV sẽ tự động tạo nếu không có trong file</li>
                  <li>Ngày hỗ trợ định dạng: dd/mm/yyyy, yyyy-mm-dd</li>
                  <li>Gói dịch vụ: Tiêu Chuẩn, Cao Cấp, Đặc Biệt, Gói Gia Đình</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold">
                  {excelHeaders.length} cột trong Excel
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">
                  {Object.keys(columnMapping).length} đã ghép
                </span>
                {!hasFullName && (
                  <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-[11px] font-bold">
                    ⚠ Chưa ghép &quot;Họ tên HV&quot; (bắt buộc)
                  </span>
                )}
              </div>

              <div className="border border-gray-100 rounded-xl overflow-hidden">
                {/* Header row */}
                <div className="grid grid-cols-[1fr_32px_1fr_1fr] gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <div>Cột Excel</div>
                  <div></div>
                  <div>Cột Database</div>
                  <div>Dữ liệu mẫu</div>
                </div>

                {/* Column rows */}
                <div className="divide-y divide-gray-50 max-h-[280px] overflow-y-auto">
                  {excelHeaders.map(header => {
                    const mapped = columnMapping[header] || '';
                    const sample = excelData[0]?.[header];
                    return (
                      <div key={header} className={`grid grid-cols-[1fr_32px_1fr_1fr] gap-2 items-center px-4 py-2.5 ${mapped ? 'bg-emerald-50/30' : ''}`}>
                        <div className="text-xs font-semibold text-gray-800 truncate" title={header}>
                          {header}
                        </div>
                        <div className="flex justify-center">
                          <ArrowRight size={12} className={mapped ? 'text-emerald-500' : 'text-gray-200'} />
                        </div>
                        <div className="relative">
                          <select
                            value={mapped}
                            onChange={e => handleMappingChange(header, e.target.value)}
                            className={`w-full text-xs px-2.5 py-1.5 rounded-lg border appearance-none pr-7 ${
                              mapped
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold'
                                : 'border-gray-200 bg-white text-gray-500'
                            }`}
                          >
                            <option value="">— Bỏ qua —</option>
                            {DB_COLUMNS.map(col => {
                              const taken = mappedDbCols.includes(col.key) && mapped !== col.key;
                              return (
                                <option key={col.key} value={col.key} disabled={taken}>
                                  {col.label}{col.required ? ' *' : ''}{taken ? ' ✓' : ''}
                                </option>
                              );
                            })}
                          </select>
                          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                        <div className="text-[11px] text-gray-400 truncate" title={String(sample || '')}>
                          {String(sample || '—').slice(0, 30)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button onClick={resetState} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 transition-colors">
                  Hủy
                </button>
                <button
                  onClick={handleGoToPreview}
                  disabled={!hasFullName}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  Xem trước <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold">
                  {mappedRows.length} hội viên sẽ được import
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">
                  {mappedDbCols.length} cột dữ liệu
                </span>
              </div>

              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold text-gray-400">#</th>
                        {mappedDbCols.map(col => {
                          const info = DB_COLUMNS.find(c => c.key === col);
                          return <th key={col} className="px-3 py-2 text-left font-bold text-gray-600 whitespace-nowrap">{info?.label || col}</th>;
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {mappedRows.slice(0, 20).map((row, i) => (
                        <tr key={i} className="hover:bg-yellow-50/30">
                          <td className="px-3 py-2 text-gray-400 font-mono">{i + 1}</td>
                          {mappedDbCols.map(col => (
                            <td key={col} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[150px] truncate">
                              {col === 'member_code' ? (
                                <span className="font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">{String(row[col] || 'Tự động')}</span>
                              ) : (
                                String(row[col] || '—')
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {mappedRows.length > 20 && (
                  <p className="text-xs text-gray-400 text-center py-2 border-t border-gray-50">
                    ... và {mappedRows.length - 20} hội viên nữa
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button onClick={() => setStep('mapping')} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 transition-colors">
                  ← Quay lại
                </button>
                <button
                  onClick={handleImport}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <Upload size={14} />
                  Import {mappedRows.length} hội viên
                </button>
              </div>
            </div>
          )}

          {/* Step 3.5: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
              <RefreshCw size={40} className="text-amber-500 animate-spin" />
              <h3 className="font-bold text-gray-800 text-lg">Đang import dữ liệu...</h3>
              <p className="text-xs text-gray-400">Vui lòng chờ, đừng đóng cửa sổ này.</p>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && importResult && (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <Check size={28} className="text-emerald-600" />
              </div>
              <h3 className="font-extrabold text-gray-800 text-lg">Import hoàn tất!</h3>

              <div className="grid grid-cols-4 gap-4 w-full max-w-md">
                {[
                  { label: 'Tổng dòng', value: importResult.total, color: 'text-gray-700' },
                  { label: 'Thêm mới', value: importResult.inserted, color: 'text-emerald-600' },
                  { label: 'Cập nhật', value: importResult.updated, color: 'text-blue-600' },
                  { label: 'Bỏ qua', value: importResult.skipped, color: 'text-amber-600' },
                ].map(s => (
                  <div key={s.label} className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {importResult.errors.length > 0 && (
                <div className="w-full max-w-md bg-red-50 border border-red-100 rounded-xl p-3 text-left">
                  <h4 className="text-xs font-bold text-red-700 mb-2">⚠ Lỗi ({importResult.errors.length})</h4>
                  <ul className="text-[11px] text-red-600 space-y-1 max-h-32 overflow-y-auto">
                    {importResult.errors.slice(0, 10).map((e, i) => (
                      <li key={i}>• {e}</li>
                    ))}
                    {importResult.errors.length > 10 && (
                      <li className="text-red-400">... và {importResult.errors.length - 10} lỗi khác</li>
                    )}
                  </ul>
                </div>
              )}

              <button
                onClick={handleClose}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1B2A4A] text-white text-xs font-bold hover:bg-[#243656] transition-colors mt-2"
              >
                <Crown size={14} /> Xem danh sách
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
