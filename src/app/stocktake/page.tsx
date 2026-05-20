'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardCheck, Plus, Search, RefreshCw, Warehouse,
  ChevronRight, Calendar, User, Package, AlertTriangle,
  CheckCircle2, Clock, X, ArrowRight, Filter,
  BarChart3, TrendingDown, TrendingUp, Minus, FileText,
  XCircle, Loader2
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { getWarehouseFilter, getUserRole } from '@/config/roles.config';

/* ─────────────────────────────────────
   Types
───────────────────────────────────── */
interface StocktakeSession {
  id: string;
  ma_phieu_kiem: string;
  kho_id: string;
  trang_thai: string;
  nguoi_kiem_email: string | null;
  ngay_kiem: string;
  ghi_chu: string | null;
  tong_loai_kiem: number;
  tong_lech: number;
  created_at: string;
  ten_kho: string;
}

interface StocktakeItem {
  id: string;
  hom_id: string;
  ma_hom: string;
  ten_hom: string;
  so_luong_he_thong: number;
  so_luong_thuc_te: number;
  chenh_lech: number;
  ghi_chu: string | null;
  trang_thai: string;
}

interface WarehouseOption {
  id: string;
  ma_kho: string;
  ten_kho: string;
}

/* ─────────────────────────────────────
   Status configs
───────────────────────────────────── */
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Nháp', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: <FileText size={12} /> },
  in_progress: { label: 'Đang kiểm', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock size={12} /> },
  completed: { label: 'Hoàn thành', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={12} /> },
  cancelled: { label: 'Đã hủy', color: 'bg-red-50 text-red-600 border-red-200', icon: <XCircle size={12} /> },
};

/* ─────────────────────────────────────
   Create Stocktake Modal
───────────────────────────────────── */
function CreateStocktakeModal({
  open, onClose, warehouses, userEmail, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  warehouses: WarehouseOption[];
  userEmail: string;
  onCreated: (id: string) => void;
}) {
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [note, setNote] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!selectedWarehouse) {
      setError('Vui lòng chọn kho cần kiểm.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/stocktake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: selectedWarehouse,
          note: note.trim() || undefined,
          created_by: userEmail,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lỗi tạo phiếu kiểm kho');
      onCreated(json.data.id);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-violet-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <ClipboardCheck size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Tạo phiếu kiểm kho mới</h2>
                  <p className="text-indigo-100 text-xs">Chọn kho và bắt đầu kiểm đếm</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Kho kiểm tra *</label>
              <select
                value={selectedWarehouse}
                onChange={e => setSelectedWarehouse(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-gray-50 font-medium"
              >
                <option value="">— Chọn kho —</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.ten_kho} ({w.ma_kho})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Ghi chú</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Ghi chú cho phiếu kiểm kho này (tuỳ chọn)..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-gray-50 resize-none"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600 font-semibold">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 p-4 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-bold hover:shadow-lg transition-all disabled:opacity-60"
            >
              {creating ? (
                <><Loader2 size={14} className="animate-spin" /> Đang tạo...</>
              ) : (
                <><Plus size={14} /> Tạo phiếu kiểm</>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────
   Stocktake Detail Modal
───────────────────────────────────── */
function StocktakeDetailModal({
  open, onClose, sessionId, onUpdate,
}: {
  open: boolean;
  onClose: () => void;
  sessionId: string | null;
  onUpdate: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);
  const [items, setItems] = useState<StocktakeItem[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'checked' | 'diff'>('all');
  const [error, setError] = useState('');

  const fetchDetail = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/stocktake/${sessionId}`);
      const json = await res.json();
      if (res.ok) {
        setData(json.data);
        setItems(json.data.items || []);
      }
    } catch { }
    finally { setLoading(false); }
  }, [sessionId]);

  useEffect(() => {
    if (open && sessionId) fetchDetail();
  }, [open, sessionId, fetchDetail]);

  const updateItemCount = (itemId: string, value: number) => {
    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, so_luong_thuc_te: value, trang_thai: 'checked' } : i
    ));
  };

  const updateItemNote = (itemId: string, note: string) => {
    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, ghi_chu: note } : i
    ));
  };

  const handleSave = async (action: 'save' | 'complete' | 'adjust' = 'save') => {
    setSaving(true);
    setError('');
    try {
      const changedItems = items
        .filter(i => i.trang_thai === 'checked' || i.trang_thai === 'adjusted')
        .map(i => ({
          id: i.id,
          so_luong_thuc_te: i.so_luong_thuc_te,
          ghi_chu: i.ghi_chu,
          trang_thai: i.trang_thai,
        }));

      const res = await fetch(`/api/stocktake/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, items: changedItems }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lỗi lưu');

      if (action === 'complete' || action === 'adjust') {
        onUpdate();
        onClose();
      } else {
        fetchDetail();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const isCompleted = data?.trang_thai === 'completed';
  const isCancelled = data?.trang_thai === 'cancelled';
  const isReadOnly = isCompleted || isCancelled;

  const filteredItems = items.filter(item => {
    const matchSearch = !search.trim() ||
      item.ma_hom.toLowerCase().includes(search.toLowerCase()) ||
      (item.ten_hom || '').toLowerCase().includes(search.toLowerCase());

    if (filter === 'pending') return matchSearch && item.trang_thai === 'pending';
    if (filter === 'checked') return matchSearch && item.trang_thai !== 'pending';
    if (filter === 'diff') return matchSearch && item.trang_thai !== 'pending' && item.so_luong_thuc_te !== item.so_luong_he_thong;
    return matchSearch;
  });

  const totalChecked = items.filter(i => i.trang_thai !== 'pending').length;
  const totalItems = items.length;
  const totalSystemQty = items.reduce((sum, i) => sum + (i.so_luong_he_thong || 0), 0);
  const totalDiff = items.filter(i => i.trang_thai !== 'pending' && i.so_luong_thuc_te !== i.so_luong_he_thong).length;
  const totalSurplus = items.filter(i => i.trang_thai !== 'pending' && i.so_luong_thuc_te > i.so_luong_he_thong).length;
  const totalDeficit = items.filter(i => i.trang_thai !== 'pending' && i.so_luong_thuc_te < i.so_luong_he_thong).length;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-700 p-5 text-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <ClipboardCheck size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">{data?.ma_phieu_kiem || '...'}</h2>
                    {data?.trang_thai && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_CONFIG[data.trang_thai]?.color || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_CONFIG[data.trang_thai]?.label || data.trang_thai}
                      </span>
                    )}
                  </div>
                  <p className="text-indigo-100 text-xs">{data?.ten_kho || '...'} · {data?.ngay_kiem || ''}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
              <Loader2 size={24} className="animate-spin" />
              <span className="text-sm font-medium">Đang tải dữ liệu...</span>
            </div>
          ) : (
            <>
              {/* Stats bar */}
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex flex-wrap gap-3 flex-shrink-0">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-bold">
                  <Package size={12} className="text-indigo-500" />
                  <span className="text-gray-500">Tổng:</span>
                  <span className="text-gray-900">{totalItems} loại</span>
                  <span className="text-gray-300 mx-0.5">|</span>
                  <span className="text-indigo-600">{totalSystemQty.toLocaleString()} SP</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-bold">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  <span className="text-gray-500">Đã kiểm:</span>
                  <span className="text-emerald-600">{totalChecked}/{totalItems}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-bold">
                  <AlertTriangle size={12} className="text-amber-500" />
                  <span className="text-gray-500">Chênh lệch:</span>
                  <span className="text-amber-600">{totalDiff}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-bold">
                  <TrendingUp size={12} className="text-blue-500" />
                  <span className="text-gray-500">Thừa:</span>
                  <span className="text-blue-600">{totalSurplus}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-bold">
                  <TrendingDown size={12} className="text-red-500" />
                  <span className="text-gray-500">Thiếu:</span>
                  <span className="text-red-600">{totalDeficit}</span>
                </div>
              </div>

              {/* Search + Filter */}
              <div className="px-5 py-3 border-b border-gray-100 flex flex-col sm:flex-row gap-3 flex-shrink-0">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Tìm theo mã hòm hoặc tên sản phẩm..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                  />
                </div>
                <div className="flex gap-1.5">
                  {([
                    ['all', 'Tất cả'],
                    ['pending', 'Chưa kiểm'],
                    ['checked', 'Đã kiểm'],
                    ['diff', 'Chênh lệch'],
                  ] as [string, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setFilter(key as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        filter === key
                          ? 'bg-indigo-500 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Items table */}
              <div className="flex-1 overflow-y-auto overflow-x-auto">
                <div className="min-w-[800px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3">Mã hòm</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Tên sản phẩm</th>
                        <th className="py-2.5 px-3 text-center w-28">SL hệ thống</th>
                        <th className="py-2.5 px-3 text-center w-32">SL thực tế</th>
                        <th className="py-2.5 px-3 text-center w-24">Chênh lệch</th>
                        <th className="py-2.5 px-3 text-center w-24">Trạng thái</th>
                        <th className="py-2.5 px-3 min-w-[150px]">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-[13px]">
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-16 text-center text-gray-400">
                            <Package size={32} className="mx-auto mb-2 opacity-30" />
                            <p className="text-sm font-medium">Không có sản phẩm nào</p>
                          </td>
                        </tr>
                      ) : filteredItems.map((item, idx) => {
                        const diff = item.trang_thai !== 'pending'
                          ? item.so_luong_thuc_te - item.so_luong_he_thong
                          : null;
                        const isPending = item.trang_thai === 'pending';

                        return (
                          <tr key={item.id} className={`hover:bg-gray-50/60 transition-colors ${
                            diff !== null && diff !== 0 ? 'bg-amber-50/30' : ''
                          }`}>
                            <td className="py-2 px-3 text-center text-[10px] font-bold text-gray-400">{idx + 1}</td>
                            <td className="py-2 px-3">
                              <span className="font-mono text-[11px] font-bold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">
                                {item.ma_hom}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-semibold text-gray-700 text-xs">{item.ten_hom || '—'}</span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="text-sm font-bold text-gray-600">{item.so_luong_he_thong}</span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              {isReadOnly ? (
                                <span className={`text-sm font-bold ${
                                  diff !== null && diff !== 0 ? (diff > 0 ? 'text-blue-600' : 'text-red-600') : 'text-gray-900'
                                }`}>
                                  {item.so_luong_thuc_te}
                                </span>
                              ) : (
                                <input
                                  type="number"
                                  min={0}
                                  value={isPending ? '' : item.so_luong_thuc_te}
                                  onChange={e => {
                                    const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                    if (!isNaN(val)) updateItemCount(item.id, val);
                                  }}
                                  placeholder={String(item.so_luong_he_thong)}
                                  className={`w-20 px-2 py-1.5 rounded-lg border text-sm text-center font-bold transition-all focus:outline-none focus:ring-2 ${
                                    isPending
                                      ? 'border-gray-200 bg-white focus:ring-indigo-200 focus:border-indigo-400 text-gray-900'
                                      : diff !== null && diff !== 0
                                        ? diff > 0
                                          ? 'border-blue-200 bg-blue-50 focus:ring-blue-200 text-blue-700'
                                          : 'border-red-200 bg-red-50 focus:ring-red-200 text-red-700'
                                        : 'border-emerald-200 bg-emerald-50 focus:ring-emerald-200 text-emerald-700'
                                  }`}
                                />
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {diff === null ? (
                                <span className="text-gray-300">—</span>
                              ) : diff === 0 ? (
                                <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600">
                                  <Minus size={10} /> 0
                                </span>
                              ) : diff > 0 ? (
                                <span className="inline-flex items-center gap-0.5 text-xs font-bold text-blue-600">
                                  <TrendingUp size={10} /> +{diff}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-xs font-bold text-red-600">
                                  <TrendingDown size={10} /> {diff}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {isPending ? (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
                                  <Clock size={9} /> Chờ
                                </span>
                              ) : item.trang_thai === 'adjusted' ? (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-violet-50 text-violet-600 border border-violet-200">
                                  <CheckCircle2 size={9} /> Đã điều chỉnh
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                                  <CheckCircle2 size={9} /> Đã kiểm
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              {isReadOnly ? (
                                <span className="text-[10px] text-gray-500">{item.ghi_chu || ''}</span>
                              ) : (
                                <input
                                  type="text"
                                  value={item.ghi_chu || ''}
                                  onChange={e => updateItemNote(item.id, e.target.value)}
                                  placeholder="Ghi chú..."
                                  className="w-full px-2 py-1 rounded-lg border border-gray-200 text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-white"
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="px-5 py-2 bg-red-50 border-t border-red-200">
                  <p className="text-xs text-red-600 font-semibold">{error}</p>
                </div>
              )}

              {/* Footer */}
              {!isReadOnly && (
                <div className="border-t border-gray-100 p-4 flex flex-wrap gap-3 bg-gray-50/50 flex-shrink-0">
                  <button
                    onClick={() => handleSave('save')}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                    Lưu tạm
                  </button>
                  <button
                    onClick={() => handleSave('complete')}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Hoàn thành kiểm kho
                  </button>
                  {totalDiff > 0 && (
                    <button
                      onClick={() => {
                        if (confirm(`Xác nhận điều chỉnh tồn kho theo kết quả kiểm kho?\n\n${totalDiff} loại sản phẩm sẽ được cập nhật số lượng trong hệ thống.\n\nThao tác này không thể hoàn tác.`)) {
                          handleSave('adjust');
                        }
                      }}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold hover:shadow-lg transition-all disabled:opacity-50 ml-auto"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
                      Điều chỉnh tồn kho ({totalDiff})
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────
   Main Page
───────────────────────────────────── */
export default function StocktakePage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<StocktakeSession[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [warehouseLabel, setWarehouseLabel] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalId, setDetailModalId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        setUserEmail(u.email || '');
        setUserName(u.ho_ten || u.email?.split('@')[0] || '');
        const wf = getWarehouseFilter(u.email || '', u.ho_ten || '');
        setWarehouseLabel(wf || 'Tổng kho');
      }
    } catch { }
  }, []);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stocktake');
      const json = await res.json();
      if (res.ok) setSessions(json.data || []);
    } catch { }
    finally { setLoading(false); }
  }, []);

  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await fetch('/api/warehouses');
      const json = await res.json();
      if (res.ok) setWarehouses(json.data || []);
    } catch { }
  }, []);

  useEffect(() => {
    fetchSessions();
    fetchWarehouses();
  }, [fetchSessions, fetchWarehouses]);

  const handleCreated = (id: string) => {
    fetchSessions();
    setDetailModalId(id);
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Bạn có chắc muốn hủy phiếu kiểm kho này?')) return;
    try {
      await fetch(`/api/stocktake/${id}`, { method: 'DELETE' });
      fetchSessions();
    } catch { }
  };

  const filteredSessions = sessions.filter(s => {
    const matchSearch = !search.trim() ||
      s.ma_phieu_kiem.toLowerCase().includes(search.toLowerCase()) ||
      s.ten_kho.toLowerCase().includes(search.toLowerCase()) ||
      (s.nguoi_kiem_email || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.trang_thai === statusFilter;
    return matchSearch && matchStatus;
  });

  const statsCount = {
    total: sessions.length,
    inProgress: sessions.filter(s => s.trang_thai === 'in_progress').length,
    completed: sessions.filter(s => s.trang_thai === 'completed').length,
    hasDiff: sessions.filter(s => s.tong_lech > 0).length,
  };

  return (
    <PageLayout title="Kiểm kho" icon={<ClipboardCheck size={15} className="text-indigo-500" />}>
      <CreateStocktakeModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        warehouses={warehouses}
        userEmail={userEmail}
        onCreated={handleCreated}
      />

      <StocktakeDetailModal
        open={!!detailModalId}
        onClose={() => setDetailModalId(null)}
        sessionId={detailModalId}
        onUpdate={fetchSessions}
      />

      {/* ── Welcome Banner ─────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1040] via-indigo-900 to-[#2d1b69] p-4 sm:p-6 mb-4 sm:mb-6 shadow-xl">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-16 w-32 h-32 rounded-full bg-violet-400/10 blur-2xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 mb-2 sm:mb-3 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-xs text-white/70 font-semibold tracking-wide truncate">Kiểm kho · {warehouseLabel}</span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white mb-1 tracking-tight">
              Kiểm kê hàng tồn kho 📋
            </h1>
            <p className="text-indigo-200/70 text-xs sm:text-sm">Đối chiếu số lượng thực tế với hệ thống, phát hiện chênh lệch và điều chỉnh.</p>

            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3 sm:mt-4">
              <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-[11px] sm:text-xs font-semibold">
                <BarChart3 size={12} />
                {statsCount.total} phiếu
              </div>
              <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-200 text-[11px] sm:text-xs font-semibold">
                <Clock size={12} />
                {statsCount.inProgress} đang kiểm
              </div>
              {statsCount.hasDiff > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-red-500/20 border border-red-400/30 text-red-200 text-[11px] sm:text-xs font-semibold">
                  <AlertTriangle size={12} />
                  {statsCount.hasDiff} chênh lệch
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-row sm:flex-col items-stretch sm:items-end gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-bold hover:shadow-lg hover:shadow-indigo-500/30 transition-all min-h-[44px]"
            >
              <Plus size={16} /> <span className="whitespace-nowrap">Tạo phiếu</span>
            </button>
            <button
              onClick={fetchSessions}
              className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white/80 text-xs font-semibold hover:bg-white/20 transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> <span className="hidden sm:inline">Làm mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Search + Filter ─────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo mã phiếu, tên kho, người kiểm..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all font-medium bg-gray-50/50 focus:bg-white"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar snap-x-chips -mx-3 px-3 sm:mx-0 sm:px-0">
          {([
            ['all', 'Tất cả'],
            ['in_progress', 'Đang kiểm'],
            ['completed', 'Hoàn thành'],
            ['cancelled', 'Đã hủy'],
          ] as [string, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                statusFilter === key
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Sessions List ─────────────────────────────── */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
            <Loader2 size={24} className="animate-spin" />
            <span className="text-sm font-medium">Đang tải danh sách...</span>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center">
              <ClipboardCheck size={36} className="text-indigo-200" />
            </div>
            <div>
              <p className="text-base font-bold text-gray-400 mb-1">Chưa có phiếu kiểm kho nào</p>
              <p className="text-sm text-gray-300">Nhấn "Tạo phiếu kiểm kho" để bắt đầu.</p>
            </div>
          </div>
        ) : filteredSessions.map(session => {
          const statusConf = STATUS_CONFIG[session.trang_thai] || STATUS_CONFIG.draft;
          const createdDate = new Date(session.created_at);

          return (
            <div
              key={session.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 overflow-hidden group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-5">
                {/* Top row on mobile: Icon + Code badges */}
                <div className="flex items-start gap-3 sm:contents">
                  {/* Icon */}
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    session.trang_thai === 'in_progress' ? 'bg-amber-100' :
                    session.trang_thai === 'completed' ? 'bg-emerald-100' :
                    session.trang_thai === 'cancelled' ? 'bg-red-100' :
                    'bg-gray-100'
                  }`}>
                    <ClipboardCheck size={18} className={
                      session.trang_thai === 'in_progress' ? 'text-amber-600' :
                      session.trang_thai === 'completed' ? 'text-emerald-600' :
                      session.trang_thai === 'cancelled' ? 'text-red-500' :
                      'text-gray-500'
                    } />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md break-all">
                        {session.ma_phieu_kiem}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusConf.color}`}>
                        {statusConf.icon} {statusConf.label}
                      </span>
                      {session.tong_lech > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <AlertTriangle size={9} /> {session.tong_lech} chênh lệch
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Warehouse size={11} className="text-sky-500" />
                        <span className="font-semibold text-gray-700 truncate max-w-[120px] sm:max-w-none">{session.ten_kho}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {createdDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                      {session.nguoi_kiem_email && (
                        <span className="flex items-center gap-1">
                          <User size={11} />
                          <span className="truncate max-w-[100px]">{session.nguoi_kiem_email.split('@')[0]}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Package size={11} />
                        {session.tong_loai_kiem} đã kiểm
                      </span>
                    </div>

                    {session.ghi_chu && (
                      <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">{session.ghi_chu}</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 sm:contents">
                  <button
                    onClick={() => setDetailModalId(session.id)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-xl bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-100 transition-colors min-h-[44px] sm:min-h-0"
                  >
                    {session.trang_thai === 'in_progress' ? 'Tiếp tục' : 'Xem chi tiết'}
                    <ChevronRight size={13} />
                  </button>
                  {session.trang_thai === 'in_progress' && (
                    <button
                      onClick={() => handleCancel(session.id)}
                      className="p-2.5 sm:p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
                      title="Hủy phiếu"
                    >
                      <XCircle size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </PageLayout>
  );
}
