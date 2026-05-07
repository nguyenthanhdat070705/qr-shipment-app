'use client';

import { useState, useEffect } from 'react';
import { Ban, PackageCheck, Truck, Trash2, Clock, AlertTriangle, X, Loader2 } from 'lucide-react';
import PageLayout from '@/components/PageLayout';

interface VoidItem {
  id: string;
  code: string;
  type: 'import' | 'export';
  warehouse: string;
  warehouse_id: string;
  status: string;
  note: string | null;
  customer?: string;
  created_by: string;
  date: string;
  created_at: string;
  items: { code: string; name: string; qty: number }[];
}

type Tab = 'import' | 'export' | 'voided';

const TAB_CONFIG: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'import', label: 'Phiếu Nhập', icon: <PackageCheck size={16} /> },
  { key: 'export', label: 'Phiếu Xuất', icon: <Truck size={16} /> },
  { key: 'voided', label: 'Đã Huỷ', icon: <Ban size={16} /> },
];

const STATUS_LABELS: Record<string, string> = {
  completed: 'Hoàn tất',
  pending_po: 'Chờ PO',
  pending_confirm: 'Chờ xác nhận',
  pending: 'Chờ xử lý',
  assigned: 'Đã phân công',
  in_transit: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã huỷ',
};

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  pending_po: 'bg-amber-100 text-amber-700 border-amber-200',
  pending_confirm: 'bg-blue-100 text-blue-700 border-blue-200',
  pending: 'bg-teal-100 text-teal-700 border-teal-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
  delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export default function VoidedReceiptsPage() {
  const [tab, setTab] = useState<Tab>('import');
  const [imports, setImports] = useState<VoidItem[]>([]);
  const [exports, setExports] = useState<VoidItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cancel modal
  const [cancelTarget, setCancelTarget] = useState<VoidItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/voided-receipts');
      const json = await res.json();
      if (json.error) setError(json.error);
      setImports(json.imports || []);
      setExports(json.exports || []);
    } catch {
      setError('Lỗi kết nối server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const apiBase = cancelTarget.type === 'import' ? '/api/goods-receipt' : '/api/goods-issue';
      const res = await fetch(`${apiBase}/${cancelTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', cancel_reason: cancelReason }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Lỗi huỷ phiếu');
        return;
      }
      setCancelTarget(null);
      setCancelReason('');
      fetchData();
    } catch {
      alert('Lỗi kết nối');
    } finally {
      setCancelling(false);
    }
  };

  // Filter data based on tab
  const activeImports = imports.filter(r => r.status !== 'cancelled');
  const activeExports = exports.filter(r => r.status !== 'cancelled');
  const voidedAll = [
    ...imports.filter(r => r.status === 'cancelled'),
    ...exports.filter(r => r.status === 'cancelled'),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const displayData = tab === 'import' ? activeImports : tab === 'export' ? activeExports : voidedAll;

  const statImportVoided = imports.filter(r => r.status === 'cancelled').length;
  const statExportVoided = exports.filter(r => r.status === 'cancelled').length;

  return (
    <PageLayout title="Phiếu Huỷ" icon={<Ban size={15} className="text-red-500" />}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Quản lý Phiếu Huỷ</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Huỷ phiếu nhập / xuất và tra cứu lịch sử huỷ. Tồn kho sẽ được tự động hoàn trả.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl bg-white dark:bg-[#162240] border border-gray-100 dark:border-white/10 p-5 flex items-center gap-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex-shrink-0">
            <PackageCheck size={22} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white leading-none">{activeImports.length}</p>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wide">Phiếu nhập</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#162240] border border-gray-100 dark:border-white/10 p-5 flex items-center gap-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/10 flex-shrink-0">
            <Truck size={22} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white leading-none">{activeExports.length}</p>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wide">Phiếu xuất</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#162240] border border-red-100 dark:border-red-500/20 p-5 flex items-center gap-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10 flex-shrink-0">
            <Ban size={22} className="text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white leading-none">{statImportVoided + statExportVoided}</p>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wide">Đã huỷ</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#162240] border border-gray-100 dark:border-white/10 p-5 flex items-center gap-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex-shrink-0">
            <Clock size={22} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white leading-none">{imports.length + exports.length}</p>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wide">Tổng cộng</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-5 py-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm font-medium flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-100 dark:border-white/10 pb-1">
        {TAB_CONFIG.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === t.key
                ? 'bg-[#1B2A4A] text-white shadow-lg shadow-[#1B2A4A]/20'
                : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
            }`}
          >
            {t.icon}
            {t.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              tab === t.key ? 'bg-white/20' : 'bg-gray-200 dark:bg-white/10'
            }`}>
              {t.key === 'import' ? activeImports.length : t.key === 'export' ? activeExports.length : voidedAll.length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-red-200 border-t-red-600" />
        </div>
      ) : displayData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10">
          <Ban size={40} className="text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
            {tab === 'voided' ? 'Chưa có phiếu nào bị huỷ.' : 'Không có phiếu nào.'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#162240] shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                  <th className="px-2.5 py-2 text-left text-[11px] font-bold uppercase text-gray-400 dark:text-gray-500">Mã phiếu</th>
                  <th className="px-2.5 py-2 text-left text-[11px] font-bold uppercase text-gray-400 dark:text-gray-500">Loại</th>
                  <th className="px-2.5 py-2 text-left text-[11px] font-bold uppercase text-gray-400 dark:text-gray-500">Kho</th>
                  <th className="px-2.5 py-2 text-left text-[11px] font-bold uppercase text-gray-400 dark:text-gray-500">Sản phẩm</th>
                  <th className="px-2.5 py-2 text-left text-[11px] font-bold uppercase text-gray-400 dark:text-gray-500">Trạng thái</th>
                  <th className="px-2.5 py-2 text-left text-[11px] font-bold uppercase text-gray-400 dark:text-gray-500">Ngày</th>
                  {tab !== 'voided' && (
                    <th className="px-2.5 py-2 text-center text-[11px] font-bold uppercase text-gray-400 dark:text-gray-500">Hành động</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {displayData.map(item => (
                  <tr key={`${item.type}-${item.id}`} className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50/60 dark:hover:bg-white/5 transition-colors">
                    <td className="px-2.5 py-2">
                      <span className={`font-mono font-bold text-xs ${item.type === 'import' ? 'text-indigo-700 dark:text-indigo-400' : 'text-amber-700 dark:text-amber-400'}`}>
                        {item.code}
                      </span>
                    </td>
                    <td className="px-2.5 py-2">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        item.type === 'import'
                          ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20'
                          : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20'
                      }`}>
                        {item.type === 'import' ? <PackageCheck size={10} /> : <Truck size={10} />}
                        {item.type === 'import' ? 'Nhập' : 'Xuất'}
                      </span>
                    </td>
                    <td className="px-2.5 py-2 text-gray-700 dark:text-gray-300 font-medium text-xs">{item.warehouse}</td>
                    <td className="px-2.5 py-2">
                      <div className="max-w-[200px]">
                        {item.items.length > 0 ? (
                          <span className="text-[11px] text-gray-600 dark:text-gray-400 font-medium truncate block">
                            {item.items.map(i => `${i.name} (x${i.qty})`).join(', ')}
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400 dark:text-gray-500 italic">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-2.5 py-2">
                      <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-white/10 dark:text-gray-300 dark:border-white/20'}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>
                    <td className="px-2.5 py-2 text-[11px] text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                      {new Date(item.date).toLocaleDateString('vi-VN')}
                    </td>
                    {tab !== 'voided' && (
                      <td className="px-2.5 py-2 text-center">
                        {item.status !== 'cancelled' ? (
                          <button
                            onClick={() => { setCancelTarget(item); setCancelReason(''); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 text-[11px] font-bold transition-colors active:scale-95"
                          >
                            <Trash2 size={12} />
                            Huỷ
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-400 dark:text-gray-500 italic">Đã huỷ</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#162240] rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-white/5 bg-red-50/50 dark:bg-red-500/5 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-black text-gray-900 dark:text-white">Xác nhận huỷ phiếu</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                  {cancelTarget.type === 'import' ? 'Tồn kho sẽ bị TRỪ' : 'Tồn kho sẽ được CỘNG LẠI'}
                </p>
              </div>
              <button onClick={() => setCancelTarget(null)} className="p-2 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-full transition-colors">
                <X size={18} className="text-gray-400 dark:text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Mã phiếu</span>
                  <span className={`font-mono font-bold text-sm ${cancelTarget.type === 'import' ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {cancelTarget.code}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Loại</span>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{cancelTarget.type === 'import' ? 'Phiếu Nhập' : 'Phiếu Xuất'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Kho</span>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{cancelTarget.warehouse}</span>
                </div>
                {cancelTarget.items.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/10">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 block mb-1">Sản phẩm</span>
                    {cancelTarget.items.map((i, idx) => (
                      <p key={idx} className="text-xs text-gray-600 dark:text-gray-400">• {i.name} (x{i.qty})</p>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Lý do huỷ (tuỳ chọn)</label>
                <textarea
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Nhập lý do huỷ phiếu..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-medium text-gray-900 dark:text-white focus:border-red-400 dark:focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-500/20 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none"
                />
              </div>

              <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-400 font-medium flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  {cancelTarget.type === 'import'
                    ? 'Huỷ phiếu nhập sẽ TRỪ số lượng đã nhập khỏi tồn kho. Hành động này không thể hoàn tác.'
                    : 'Huỷ phiếu xuất sẽ CỘNG LẠI số lượng đã xuất vào tồn kho. Hành động này không thể hoàn tác.'}
                </span>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex gap-3 justify-end">
              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
                className="px-5 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-200 dark:shadow-red-500/20 transition-all disabled:opacity-50 inline-flex items-center gap-2"
              >
                {cancelling ? (
                  <><Loader2 size={14} className="animate-spin" /> Đang huỷ...</>
                ) : (
                  <><Trash2 size={14} /> Xác nhận huỷ</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
