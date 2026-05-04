'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, Search, Package, Clock, History, AlertCircle,
  MapPin, X, CheckCircle2, RefreshCw, Filter, Eye,
  Truck, Calendar, User, ChevronRight, FileText
} from 'lucide-react';
import { getWarehouseFilter } from '@/config/roles.config';

export default function ExportReviewTab() {
  const [lockedWarehouse, setLockedWarehouse] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const statusColors: Record<string, string> = {
    draft: 'bg-amber-100 text-amber-700 border-amber-200',
    pending: 'bg-teal-100 text-teal-700 border-teal-200',
    assigned: 'bg-blue-100 text-blue-700 border-blue-200',
    in_transit: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  };
  const statusLabel: Record<string, string> = {
    draft: 'Phiếu tạm',
    pending: 'Đã hoàn thành',
    assigned: 'Đã phân công',
    in_transit: 'Đang giao',
    delivered: 'Đã giao',
    cancelled: 'Đã hủy',
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        const name = u.name || u.user_metadata?.name || u.ho_ten || '';
        const wf = getWarehouseFilter(u.email || '', name);
        if (wf) setLockedWarehouse(wf);
      }
    } catch {}
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const warehouseParam = lockedWarehouse ? `?warehouse=${encodeURIComponent(lockedWarehouse)}` : '';
      const res = await fetch(`/api/goods-issue/history${warehouseParam}`);
      const json = await res.json();
      if (res.ok) setHistory(json.data || []);
    } catch {}
    finally { setHistoryLoading(false); }
  }, [lockedWarehouse]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Filter history
  const filteredHistory = history.filter(item => {
    const matchSearch = !search.trim() ||
      (item.ma_phieu_xuat || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.ten_khach || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.ghi_chu || '').toLowerCase().includes(search.toLowerCase()) ||
      item.fact_xuat_hang_items?.some((fi: any) =>
        (fi.ma_hom || '').toLowerCase().includes(search.toLowerCase()) ||
        (fi.ten_hom || '').toLowerCase().includes(search.toLowerCase())
      );
    const matchStatus = statusFilter === 'all' || item.trang_thai === statusFilter;
    return matchSearch && matchStatus;
  });

  // Summary stats
  const totalExports = history.length;
  const todayExports = history.filter(h => {
    const d = new Date(h.created_at).toDateString();
    return d === new Date().toDateString();
  }).length;
  const totalItems = history.reduce((acc: number, h: any) =>
    acc + (h.fact_xuat_hang_items?.length || 0), 0);

  return (
    <div className="@container">
      {/* Header Banner */}
      <div className="mb-6 p-5 @lg:p-8 rounded-[1.5rem] @lg:rounded-[2rem] bg-gradient-to-br from-[#1B2A4A] via-slate-800 to-[#2d1b69] text-white shadow-xl relative overflow-hidden max-w-5xl mx-auto">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/15 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-500/15 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
              <FileText size={12} className="text-violet-400" />
              <span className="text-[10px] font-bold text-white tracking-widest uppercase">Quản lý phiếu</span>
            </div>
            {lockedWarehouse && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 backdrop-blur-md">
                <MapPin size={11} className="text-emerald-300" />
                <span className="text-[10px] font-bold text-emerald-200 tracking-wide">{lockedWarehouse}</span>
              </div>
            )}
          </div>
          <h1 className="text-2xl @lg:text-3xl font-extrabold mb-2 tracking-tight">Quản lý phiếu xuất 📋</h1>
          <p className="text-indigo-200/70 text-xs @lg:text-sm max-w-md leading-relaxed">
            Tra cứu, theo dõi và quản lý tất cả phiếu xuất kho. Xem chi tiết từng phiếu xuất.
          </p>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-2 mt-4">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white text-xs font-semibold">
              <ClipboardList size={12} />
              {totalExports} phiếu tổng
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-semibold">
              <Truck size={12} />
              {todayExports} hôm nay
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-semibold">
              <Package size={12} />
              {totalItems} sản phẩm
            </div>
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="max-w-5xl mx-auto mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo mã phiếu, mã hòm, tên sản phẩm, ghi chú..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all font-medium bg-gray-50/50 focus:bg-white"
            />
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            {([
              ['all', 'Tất cả'],
              ['pending', 'Hoàn thành'],
              ['cancelled', 'Đã hủy'],
            ] as [string, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === key
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={fetchHistory}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 text-xs font-bold transition-all"
            >
              <RefreshCw size={12} className={historyLoading ? 'animate-spin' : ''} />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="max-w-5xl mx-auto pb-12">
        <div className="rounded-[1.5rem] @lg:rounded-[2rem] bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-xl shadow-gray-200/50 dark:shadow-none overflow-hidden">
          <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
            {historyLoading ? (
              <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
                <span className="animate-spin h-5 w-5 border-2 border-indigo-400 border-t-transparent rounded-full" />
                <span className="text-sm font-medium">Đang tải danh sách phiếu xuất...</span>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-3">
                  <ClipboardList size={28} className="text-gray-300 dark:text-gray-500" />
                </div>
                <p className="text-sm font-bold text-gray-400 mb-1">
                  {search || statusFilter !== 'all' ? 'Không tìm thấy phiếu nào khớp' : 'Chưa có phiếu xuất hàng'}
                </p>
                <p className="text-xs text-gray-300">
                  {search ? 'Thử tìm kiếm khác' : 'Phiếu xuất sẽ hiển thị ở đây sau khi tạo'}
                </p>
              </div>
            ) : (
              filteredHistory.map((item: any) => {
                const firstItem = item.fact_xuat_hang_items?.[0];
                const itemCount = item.fact_xuat_hang_items?.length || 0;
                const createdAt = new Date(item.created_at);
                const dateStr = createdAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const timeStr = createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={item.id} className="px-4 @lg:px-6 py-4 hover:bg-gray-50/60 dark:hover:bg-slate-700/30 transition-colors group">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`flex-shrink-0 h-11 w-11 rounded-xl flex items-center justify-center ${
                        item.trang_thai === 'cancelled' ? 'bg-red-100' : 'bg-indigo-50 dark:bg-indigo-900/40'
                      }`}>
                        <Package size={18} className={
                          item.trang_thai === 'cancelled' ? 'text-red-500' : 'text-indigo-500 dark:text-indigo-400'
                        } />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-mono text-[11px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-2 py-0.5 rounded-md">
                            {item.ma_phieu_xuat}
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusColors[item.trang_thai] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            {statusLabel[item.trang_thai] || item.trang_thai}
                          </span>
                          {itemCount > 1 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                              {itemCount} SP
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 truncate">
                          {firstItem ? `${firstItem.ma_hom} — ${firstItem.ten_hom}` : item.ten_khach || 'N/A'}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400 dark:text-gray-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {timeStr} · {dateStr}
                          </span>
                          {item.ten_khach && (
                            <span className="flex items-center gap-1">
                              <User size={10} />
                              {item.ten_khach}
                            </span>
                          )}
                          {item.kho_xuat && (
                            <span className="flex items-center gap-1">
                              <MapPin size={10} />
                              {item.kho_xuat}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action */}
                      <button
                        onClick={() => setSelectedHistoryItem(item)}
                        className="flex-shrink-0 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 hover:text-white px-3 py-2 rounded-xl text-[11px] font-bold transition-all"
                      >
                        <Eye size={12} />
                        Chi tiết
                        <ChevronRight size={11} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedHistoryItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6 transition-all">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-gray-100 bg-gray-50/80 shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 shadow-inner">
                  <Package size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Chi tiết Phiếu Xuất</h2>
                  <p className="text-[13px] text-gray-500 font-semibold mt-0.5 font-mono bg-white px-2 py-0.5 rounded border border-gray-200 w-fit">{selectedHistoryItem.ma_phieu_xuat}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedHistoryItem(null)}
                className="p-2 sm:p-2.5 bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all shadow-sm border border-gray-200 cursor-pointer hover:rotate-90"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 sm:p-8 space-y-8 overflow-y-auto bg-[#f8fafc]">
              <div className="flex items-center justify-between bg-white px-5 py-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Trạng thái</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-black border uppercase tracking-wider ${statusColors[selectedHistoryItem.trang_thai] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {statusLabel[selectedHistoryItem.trang_thai] || selectedHistoryItem.trang_thai}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-gray-800">
                    {new Date(selectedHistoryItem.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-[11px] font-bold text-gray-400">
                    {new Date(selectedHistoryItem.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Info grid */}
              <div>
                <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  Thông tin chung
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-100 transition-colors">
                    <span className="block text-[11px] font-black uppercase tracking-widest text-indigo-400 mb-2">Kho xuất</span>
                    <p className="text-sm font-bold text-gray-800">{selectedHistoryItem.kho_xuat || '—'}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-100 transition-colors">
                    <span className="block text-[11px] font-black uppercase tracking-widest text-indigo-400 mb-2">Người xuất</span>
                    <p className="text-sm font-bold text-gray-800 truncate">{selectedHistoryItem.nguoi_tao || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Sản phẩm đã xuất
                </h3>
                <div className="space-y-3">
                  {selectedHistoryItem.fact_xuat_hang_items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-4 p-5 rounded-2xl border border-emerald-100 bg-white shadow-sm hover:shadow-md hover:border-emerald-200 transition-all">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                        <Package size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-black text-gray-900 mb-1.5 leading-snug">{item.ten_hom}</p>
                        <div className="flex items-center gap-3 text-[13px] font-bold text-gray-500">
                          <span className="bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100 font-mono text-gray-600">Mã: {item.ma_hom}</span>
                          <div className="w-1 h-1 rounded-full bg-gray-300" />
                          <span>SL: <span className="text-emerald-600 font-extrabold text-sm">{item.so_luong}</span></span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!selectedHistoryItem.fact_xuat_hang_items || selectedHistoryItem.fact_xuat_hang_items.length === 0) && (
                    <p className="text-sm text-gray-500 italic bg-white p-5 rounded-2xl border border-gray-100 text-center">Không có thông tin chi tiết sản phẩm.</p>
                  )}
                </div>
              </div>

              {/* Ghi chú */}
              {selectedHistoryItem.ghi_chu && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-200/50 shadow-inner">
                  <span className="block text-[11px] font-black uppercase tracking-widest text-amber-500 mb-2">Ghi chú & Người Nhận</span>
                  <p className="text-sm font-bold text-amber-900 leading-relaxed">{selectedHistoryItem.ghi_chu}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-gray-100 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedHistoryItem(null)}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-colors active:scale-95"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
