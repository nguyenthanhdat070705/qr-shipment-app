'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Phone, ChevronLeft, ChevronRight, Eye, RefreshCw,
  CheckCircle, FileText, User, CreditCard, Camera, Upload,
  X, ExternalLink, FolderOpen, Loader2, ImageIcon, Filter
} from 'lucide-react';

interface Account {
  id: string;
  getfly_account_id: string;
  account_code: string;
  account_name: string;
  phone: string;
  email: string;
  address: string;
  account_type: string;
  relation_name: string;
  so_cccd: string;
  ma_hoi_vien: string;
  ho_ten_nguoi_mat: string;
  contact_name: string;
  contact_phone: string;
  gdrive_folder_url: string;
  // Upload status
  has_vneid_front: boolean;
  has_vneid_back: boolean;
  has_contract_scan: boolean;
  has_membership_form: boolean;
  vneid_front_url: string | null;
  vneid_back_url: string | null;
  contract_scan_url: string | null;
  membership_form_url: string | null;
}

type DocType = 'vneid_front' | 'vneid_back' | 'contract_scan' | 'membership_form';

const DOC_LABELS: Record<DocType, string> = {
  vneid_front: 'VNeID Mặt trước',
  vneid_back: 'VNeID Mặt sau',
  contract_scan: 'Bản scan Hợp đồng',
  membership_form: 'Phiếu Hội viên',
};

export default function MembershipsTab() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Account | null>(null);
  const perPage = 20;

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), per_page: String(perPage),
      });
      if (search) params.set('search', search);
      if (filter) params.set('filter', filter);

      const res = await fetch(`/api/getfly-accounts?${params}`);
      const d = await res.json();
      setAccounts(d.records || []);
      setTotal(d.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, search, filter]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault(); setPage(1); setSearch(searchInput);
  }

  const totalPages = Math.ceil(total / perPage);
  const docsCount = accounts.reduce((acc, a) => acc + (a.has_vneid_front ? 1 : 0) + (a.has_vneid_back ? 1 : 0) + (a.has_contract_scan ? 1 : 0) + (a.has_membership_form ? 1 : 0), 0);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 rounded-xl p-3 border border-violet-200/50">
          <p className="text-[10px] font-bold text-violet-500 uppercase">Tổng khách hàng</p>
          <p className="text-2xl font-black text-violet-700 mt-1">{total.toLocaleString()}</p>
        </div>
        <button onClick={() => { setFilter(f => f === 'members_only' ? '' : 'members_only'); setPage(1); }}
          className={`text-left rounded-xl p-3 border transition-all ${filter === 'members_only' ? 'bg-emerald-100 border-emerald-300 ring-2 ring-emerald-400/30' : 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200/50'}`}>
          <p className="text-[10px] font-bold text-emerald-500 uppercase">Hội viên</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">—</p>
        </button>
        <button onClick={() => { setFilter(f => f === 'with_cccd' ? '' : 'with_cccd'); setPage(1); }}
          className={`text-left rounded-xl p-3 border transition-all ${filter === 'with_cccd' ? 'bg-sky-100 border-sky-300 ring-2 ring-sky-400/30' : 'bg-gradient-to-br from-sky-50 to-sky-100/50 border-sky-200/50'}`}>
          <p className="text-[10px] font-bold text-sky-500 uppercase">Có CCCD</p>
          <p className="text-2xl font-black text-sky-700 mt-1">—</p>
        </button>
        <button onClick={() => { setFilter(f => f === 'with_docs' ? '' : 'with_docs'); setPage(1); }}
          className={`text-left rounded-xl p-3 border transition-all ${filter === 'with_docs' ? 'bg-amber-100 border-amber-300 ring-2 ring-amber-400/30' : 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200/50'}`}>
          <p className="text-[10px] font-bold text-amber-500 uppercase">Đã upload tài liệu</p>
          <p className="text-2xl font-black text-amber-700 mt-1">—</p>
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <form onSubmit={handleSearch} className="flex gap-3 flex-1 min-w-[300px]">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
              placeholder="Tìm theo tên, SĐT, CCCD, mã hội viên..."
              value={searchInput} onChange={e => setSearchInput(e.target.value)} />
          </div>
          <button type="submit" className="px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-all">Tìm</button>
        </form>
        {filter && (
          <button onClick={() => { setFilter(''); setPage(1); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-semibold hover:bg-gray-200 transition-all">
            <X size={12} /> Bỏ lọc
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {total === 0 && !loading ? (
          <div className="py-16 text-center">
            <User size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="font-semibold text-gray-500">Chưa có dữ liệu khách hàng</p>
            <p className="text-xs text-gray-400 mt-1">Chạy sync để tải dữ liệu từ Getfly</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left px-4 py-3 font-bold text-gray-600 dark:text-gray-300 text-[10px] uppercase whitespace-nowrap">Khách hàng</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-600 dark:text-gray-300 text-[10px] uppercase whitespace-nowrap">Loại / Trạng thái</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-600 dark:text-gray-300 text-[10px] uppercase whitespace-nowrap">CCCD / Hội viên</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-600 dark:text-gray-300 text-[10px] uppercase whitespace-nowrap">Tài liệu</th>
                    <th className="text-center px-4 py-3 font-bold text-gray-600 dark:text-gray-300 text-[10px] uppercase whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {loading ? (
                    <tr><td colSpan={5} className="py-10 text-center text-gray-400"><RefreshCw size={24} className="animate-spin mx-auto" /></td></tr>
                  ) : accounts.map(a => (
                    <tr key={a.id} className="hover:bg-violet-50/30 dark:hover:bg-violet-950/20 transition-colors group">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800 dark:text-white text-sm">{a.account_name || '—'}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
                          {a.phone && <><Phone size={9} /> {a.phone}</>}
                          {a.account_code && <span className="ml-2 font-mono text-gray-400">#{a.account_code}</span>}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                          {a.account_type || '—'}
                        </span>
                        <p className="text-[10px] text-gray-500 mt-1">{a.relation_name || ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        {a.so_cccd ? (
                          <span className="flex items-center gap-1 text-emerald-600 font-semibold text-xs">
                            <CreditCard size={11} /> {a.so_cccd}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400">Chưa có CCCD</span>
                        )}
                        {a.ma_hoi_vien && (
                          <p className="text-[10px] text-violet-600 font-semibold mt-1">HV: {a.ma_hoi_vien}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <DocBadge label="VNeID trước" ok={a.has_vneid_front} />
                          <DocBadge label="VNeID sau" ok={a.has_vneid_back} />
                          <DocBadge label="HĐ" ok={a.has_contract_scan} />
                          <DocBadge label="Phiếu HV" ok={a.has_membership_form} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setSelected(a)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-[11px] font-semibold hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-all opacity-80 group-hover:opacity-100">
                          <Eye size={13} /> Hồ sơ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500">{total.toLocaleString()} khách hàng</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30"><ChevronLeft size={14} /> Trước</button>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                  {page} / {totalPages || 1}
                </span>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30">Sau <ChevronRight size={14} /></button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <AccountDetailModal
          account={selected}
          onClose={() => setSelected(null)}
          onUploadDone={() => { setSelected(null); loadAccounts(); }}
        />
      )}
    </div>
  );
}

function DocBadge({ label, ok }: { label: string; ok: boolean }) {
  return ok ? (
    <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
      <CheckCircle size={9} /> {label}
    </span>
  ) : (
    <span className="flex items-center gap-0.5 text-[9px] font-medium text-gray-400 bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 rounded">
      <Camera size={9} /> {label}
    </span>
  );
}

// ══════════════════════════════════════════════════
// Account Detail Modal with Upload
// ══════════════════════════════════════════════════
function AccountDetailModal({
  account: a,
  onClose,
  onUploadDone,
}: {
  account: Account;
  onClose: () => void;
  onUploadDone: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">{a.account_name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {a.phone && <><Phone size={11} className="inline mr-1" />{a.phone} · </>}
              Mã: {a.account_code}
              {a.so_cccd && <> · CCCD: <span className="font-mono">{a.so_cccd}</span></>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {a.gdrive_folder_url && (
              <a href={a.gdrive_folder_url} target="_blank" rel="noopener"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-900/30 text-sky-600 text-xs font-semibold hover:bg-sky-100 transition-all">
                <FolderOpen size={14} /> Google Drive
              </a>
            )}
            <button onClick={onClose} className="p-2 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
          {/* Left: Info */}
          <div className="w-full md:w-1/3 space-y-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-700 pb-2">Thông tin khách hàng</h3>
            <div className="space-y-2.5 text-sm">
              <InfoRow label="Họ tên" value={a.account_name} />
              <InfoRow label="SĐT" value={a.phone} />
              <InfoRow label="CCCD" value={a.so_cccd} mono />
              <InfoRow label="Mã hội viên" value={a.ma_hoi_vien} />
              <InfoRow label="Loại KH" value={a.account_type} />
              <InfoRow label="Trạng thái" value={a.relation_name} />
              <InfoRow label="Địa chỉ" value={a.address} />
              <InfoRow label="Người mất" value={a.ho_ten_nguoi_mat} />
              <InfoRow label="Liên hệ" value={a.contact_name} />
            </div>
          </div>

          {/* Right: Upload */}
          <div className="w-full md:w-2/3 border-l dark:border-gray-700 pl-0 md:pl-6">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-700 pb-2 mb-4 flex items-center gap-2">
              <Upload size={16} /> Tài liệu đính kèm
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <UploadCard
                docType="vneid_front"
                label="VNeID Mặt trước"
                icon={<CreditCard size={24} />}
                accountId={a.getfly_account_id}
                hasFile={a.has_vneid_front}
                fileUrl={a.vneid_front_url}
                onUploaded={onUploadDone}
              />
              <UploadCard
                docType="vneid_back"
                label="VNeID Mặt sau"
                icon={<CreditCard size={24} />}
                accountId={a.getfly_account_id}
                hasFile={a.has_vneid_back}
                fileUrl={a.vneid_back_url}
                onUploaded={onUploadDone}
              />
              <UploadCard
                docType="contract_scan"
                label="Bản scan Hợp đồng"
                icon={<FileText size={24} />}
                accountId={a.getfly_account_id}
                hasFile={a.has_contract_scan}
                fileUrl={a.contract_scan_url}
                onUploaded={onUploadDone}
              />
              <UploadCard
                docType="membership_form"
                label="Phiếu Hội viên"
                icon={<FileText size={24} />}
                accountId={a.getfly_account_id}
                hasFile={a.has_membership_form}
                fileUrl={a.membership_form_url}
                onUploaded={onUploadDone}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <p className="flex justify-between gap-2">
      <span className="text-gray-500 dark:text-gray-400 shrink-0">{label}:</span>
      <span className={`font-semibold text-right text-gray-800 dark:text-gray-200 ${mono ? 'font-mono text-xs' : ''}`}>
        {value || '—'}
      </span>
    </p>
  );
}

// ══════════════════════════════════════════════════
// Upload Card Component
// ══════════════════════════════════════════════════
function UploadCard({
  docType, label, icon, accountId, hasFile, fileUrl, onUploaded
}: {
  docType: DocType;
  label: string;
  icon: React.ReactNode;
  accountId: string;
  hasFile: boolean;
  fileUrl: string | null;
  onUploaded: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (uploading) return;
    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('account_id', accountId);
    formData.append('doc_type', docType);

    try {
      const res = await fetch('/api/upload-member-docs', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success) {
        setUploadResult(data.drive_file_url);
        onUploaded();
      } else {
        alert(`Lỗi upload: ${data.error}`);
      }
    } catch (err) {
      alert(`Lỗi: ${err}`);
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  const displayUrl = uploadResult || fileUrl;

  if (hasFile || displayUrl) {
    return (
      <div className="relative bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 p-4 flex flex-col items-center justify-center text-center min-h-[140px]">
        <CheckCircle size={28} className="text-emerald-500 mb-2" />
        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{label}</p>
        <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-1">Đã upload ✓</p>
        <div className="flex items-center gap-2 mt-3">
          {displayUrl && (
            <a href={displayUrl} target="_blank" rel="noopener"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold hover:bg-emerald-200 transition-all">
              <ExternalLink size={10} /> Xem file
            </a>
          )}
          <button onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[10px] font-semibold border border-gray-200 dark:border-gray-700 hover:bg-gray-50 transition-all">
            <Upload size={10} /> Thay thế
          </button>
        </div>
        <input ref={inputRef} type="file" className="hidden" accept="image/*,.pdf" onChange={onChange} />
      </div>
    );
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className={`relative cursor-pointer rounded-xl border-2 border-dashed p-4 flex flex-col items-center justify-center text-center min-h-[140px] transition-all
        ${dragOver ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30 scale-[1.02]' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-violet-300 hover:bg-violet-50/50 dark:hover:bg-violet-950/20'}
        ${uploading ? 'pointer-events-none opacity-60' : ''}`}>

      {uploading ? (
        <>
          <Loader2 size={28} className="text-violet-500 animate-spin mb-2" />
          <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">Đang upload...</p>
        </>
      ) : (
        <>
          <div className="text-gray-300 dark:text-gray-600 mb-2">{icon}</div>
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{label}</p>
          <p className="text-[10px] text-gray-400 mt-1">Kéo thả hoặc click để upload</p>
          <div className="mt-2 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 text-[10px] font-semibold">
            <Upload size={10} /> Chọn file
          </div>
        </>
      )}

      <input ref={inputRef} type="file" className="hidden" accept="image/*,.pdf" onChange={onChange} />
    </div>
  );
}
