'use client';

import { useState, useEffect } from 'react';
import { Truck, Search, CheckCircle2, Package, Clock, History, AlertCircle, MapPin, X } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { getWarehouseFilter } from '@/config/roles.config';

interface InventoryItemData {
  inventory_id: string;
  ma_lo: string;
  product_id: string;
  product_code: string;
  product_name: string;
  warehouse_id: string;
  warehouse_name: string;
  quantity_available: number;
}

export default function GoodsIssuePage() {
  const [searchInput, setSearchInput] = useState('');
  const [lockedWarehouse, setLockedWarehouse] = useState<string | null>(null);

  const [scannedItems, setScannedItems] = useState<InventoryItemData[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');

  const [maDam, setMaDam] = useState('');
  const [nguoiNhan, setNguoiNhan] = useState('');
  const [error, setError] = useState('');

  // Đọc warehouse của user từ localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        const name = u.name || u.user_metadata?.name || u.hoten || '';
        const wf = getWarehouseFilter(u.email || '', name);
        if (wf) setLockedWarehouse(wf);
      }
    } catch {}
  }, []);

  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null);

  const statusColors: Record<string, string> = {
    pending: 'bg-teal-100 text-teal-700 border-teal-200',
    assigned: 'bg-blue-100 text-blue-700 border-blue-200',
    in_transit: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  };
  const statusLabel: Record<string, string> = {
    pending: 'Đã hoàn thành',
    assigned: 'Đã phân công',
    in_transit: 'Đang giao',
    delivered: 'Đã giao',
    cancelled: 'Đã hủy',
  };


  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const warehouseParam = lockedWarehouse ? `?warehouse=${encodeURIComponent(lockedWarehouse)}` : '';
      const res = await fetch(`/api/goods-issue/history${warehouseParam}`);
      const json = await res.json();
      if (res.ok) setHistory(json.data || []);
    } catch {}
    finally { setHistoryLoading(false); }
  };

  useEffect(() => { fetchHistory(); }, []);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const getCoffinImage = (code: string) => {
    if (!code) return '/coffin-1.png';
    let hash = 0;
    for (let i = 0; i < code.length; i++) hash = ((hash << 5) - hash + code.charCodeAt(i)) | 0;
    return `/coffin-${(Math.abs(hash) % 5) + 1}.png`;
  };

  // Search logic
  const handleSearchProductOrLot = async (code: string) => {
    setError('');
    setScannedItems([]);
    setSelectedInventoryId('');
    setSuccess(false);

    if (!code) return;

    try {
      // Truyền warehouse filter để API chỉ trả về hàng trong kho của user
      const warehouseParam = lockedWarehouse ? `&warehouse=${encodeURIComponent(lockedWarehouse)}` : '';
      const res = await fetch(`/api/goods-issue/search?q=${encodeURIComponent(code)}${warehouseParam}`);
      const result = await res.json();

      // Nếu lỗi kỹ thuật 500 → báo lỗi server
      if (res.status === 500) {
        setError('Lỗi kết nối cơ sở dữ liệu.');
        return;
      }

      // Nếu có ma_dam → auto-fill
      if (result.dam_data?.ma_dam) {
        setMaDam(result.dam_data.ma_dam);
      }

      // 404 = không tìm thấy gì
      if (res.status === 404) {
        setError(result.error || `Không tìm thấy thông tin cho mã "${code}".`);
        return;
      }

      // Có dam_data nhưng không có inventory
      if (result.message && (!result.data || result.data.length === 0)) {
        setError(result.message);
        return;
      }

      let data = (result.data || []) as InventoryItemData[];

      // Lọc chỉ hiển hàng thuộc kho của user (client-side safety check)
      if (lockedWarehouse) {
        const filterLower = lockedWarehouse.toLowerCase();
        const filtered = data.filter(item =>
          item.warehouse_name?.toLowerCase().includes(filterLower) ||
          filterLower.includes(item.warehouse_name?.toLowerCase() || '')
        );
        // Nếu sau filter không còn hàng nào trong kho mình
        if (filtered.length === 0 && data.length > 0) {
          setError(`Sản phẩm này không có trong ${lockedWarehouse} (chỉ có ở: ${data.map(d => d.warehouse_name).join(', ')}).`);
          return;
        }
        data = filtered.length > 0 ? filtered : data;
      }

      // Không có hàng
      if (data.length === 0) {
        setError(`Không tìm thấy tồn kho cho mã "${code}".`);
        return;
      }

      setScannedItems(data);
      setSelectedInventoryId(data[0].inventory_id);
      setSearchInput(code);
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối server.');
    }
  };


  const selectedItem = scannedItems.find(i => i.inventory_id === selectedInventoryId);

  const handleSubmit = async () => {
    if (!selectedItem) {
      setError('Không có sản phẩm tồn kho khả dụng!');
      return;
    }

    if (!maDam.trim()) {
      setError('Vui lòng nhập Mã Đám.');
      return;
    }

    if (!nguoiNhan.trim()) {
      setError('Vui lòng nhập tên Người nhận.');
      return;
    }

    if (1 > selectedItem.quantity_available) {
      setError(`Số lượng xuất không hợp lệ (Tồn khả dụng: ${selectedItem.quantity_available})`);
      return;
    }

    setSubmitting(true);
    setError('');

    let createdBy = 'unknown';
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) createdBy = JSON.parse(raw).email || 'unknown';
    } catch {}

    try {
      const res = await fetch('/api/goods-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory_id: selectedItem.inventory_id,
          product_code: selectedItem.product_code,
          quantity: 1,
          ma_dam: maDam.trim(),
          nguoi_nhan: nguoiNhan.trim(),
          note: `Xuất cho đám ${maDam.trim()} — Người nhận: ${nguoiNhan.trim()}`,
          created_by: createdBy,
        })
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Có lỗi xảy ra khi tạo đơn xuất hàng.');
        return;
      }

      setSuccess(true);
      fetchHistory();
      setTimeout(() => {
        // Reset form for next transfer
        setScannedItems([]);
        setSelectedInventoryId('');
        setMaDam('');
        setNguoiNhan('');
        setSearchInput('');
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout title="Xuất hàng" icon={<Truck size={15} className="text-emerald-500" />}>
      {/* Header */}
      <div className="mb-8 p-8 sm:p-10 rounded-[2rem] bg-gradient-to-br from-[#1B2A4A] via-indigo-900 to-[#1e3a8a] text-white shadow-xl shadow-indigo-900/20 max-w-4xl mx-auto relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/20 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md shadow-sm">
              <Truck size={14} className="text-emerald-400" />
              <span className="text-[11px] font-bold text-white tracking-widest uppercase">Xuất Kho Nội Bộ</span>
            </div>
            {lockedWarehouse && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 backdrop-blur-md shadow-sm">
                <MapPin size={13} className="text-emerald-300" />
                <span className="text-[11px] font-bold text-emerald-200 tracking-wide">{lockedWarehouse}</span>
              </div>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight">Xuất hàng</h1>
          <p className="text-indigo-100 text-sm max-w-md leading-relaxed">
            {lockedWarehouse
              ? `Chỉ xuất hàng từ ${lockedWarehouse}. Nhập mã sản phẩm hoặc mã đám, xác nhận xuất kho.`
              : 'Nhập mã sản phẩm hoặc mã đám, điền thông tin người nhận, xác nhận xuất kho.'}
          </p>
        </div>
      </div>


      <div className="max-w-4xl mx-auto space-y-8 pb-12 px-2 sm:px-0">
        {/* Success message */}
        {success && (
          <div className="max-w-lg mx-auto rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-br from-emerald-50 dark:from-emerald-900/20 to-teal-50 dark:to-teal-900/20 shadow-lg p-8 sm:p-10 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white dark:bg-emerald-800/30 rounded-full flex items-center justify-center mb-5 border-4 border-emerald-200 dark:border-emerald-500/30 shadow-md">
              <CheckCircle2 size={40} className="text-emerald-500 sm:w-[48px] sm:h-[48px]" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-emerald-800 dark:text-emerald-400 mb-2">Xuất hàng thành công!</h3>
            <p className="text-sm sm:text-base text-emerald-700 dark:text-emerald-500 font-semibold">Sản phẩm đã được trừ kho và ghi nhận.</p>
            <p className="text-xs sm:text-sm text-emerald-500 dark:text-emerald-600 mt-3 opacity-80">Tự động làm mới sau 3 giây...</p>
          </div>
        )}

        {/* Search Card */}
        {!success && (
          <div className="rounded-[1.5rem] sm:rounded-[2rem] bg-white dark:bg-[#162240] border border-gray-100 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-none p-5 sm:p-8 relative overflow-hidden transition-all">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-emerald-500"></div>

            <div className="mb-5 sm:mb-6">
              <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-gray-900 dark:text-white flex items-center gap-2">
                <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-[10px] sm:text-xs">1</span>
                Tìm kiếm sản phẩm
              </h2>
            </div>

            <div className="relative max-w-2xl flex flex-col sm:block gap-3">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearchProductOrLot(searchInput.trim());
                  }}
                  placeholder="Nhập Mã Đám hoặc mã sản phẩm..."
                  className="w-full pl-11 pr-4 sm:pr-32 py-3 sm:py-4 bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:bg-white dark:focus:bg-transparent focus:border-indigo-500 dark:focus:border-indigo-400 rounded-xl sm:rounded-2xl text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all shadow-inner dark:shadow-none focus:shadow-indigo-500/10 outline-none"
                />
                <div className="hidden sm:block absolute right-2 top-2 bottom-2">
                  <button
                    type="button"
                    onClick={() => handleSearchProductOrLot(searchInput.trim())}
                    className="h-full px-6 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all"
                  >
                    Tìm kiếm
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSearchProductOrLot(searchInput.trim())}
                className="sm:hidden w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all"
              >
                Tìm kiếm
              </button>
            </div>

            {error && (
              <div className="mt-5 sm:mt-6 px-4 sm:px-5 py-3 sm:py-4 rounded-xl bg-red-50/50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs sm:text-sm font-medium flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* Product card + Transfer form */}
        {selectedItem && !success && (
          <div className="max-w-lg mx-auto space-y-4">
            {/* Product info card */}
            <div className="rounded-2xl overflow-hidden border border-indigo-200 dark:border-indigo-500/30 shadow-xl">
              <div className="bg-gradient-to-r from-[#1B2A4A] to-teal-700 px-5 sm:px-6 py-4 sm:py-5">
                <p className="text-teal-200 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <Package size={12} /> Sản phẩm
                </p>
                <h2 className="text-white text-lg sm:text-xl font-bold leading-snug">
                  {selectedItem.product_name}
                </h2>
              </div>

              {/* Coffin image */}
              <div className="bg-slate-50 dark:bg-white/5 border-x border-indigo-100 dark:border-transparent px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getCoffinImage(selectedItem.product_code)}
                  alt="Sản phẩm"
                  className="max-h-32 sm:max-h-44 w-full object-contain drop-shadow-md"
                />
              </div>

              <div className="bg-white dark:bg-[#162240] border border-indigo-100 dark:border-transparent divide-y divide-indigo-50/60 dark:divide-white/5">
                <div className="flex items-center justify-between px-5 sm:px-6 py-3 sm:py-3.5">
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Mã SP</span>
                  <span className="font-mono font-extrabold text-indigo-800 dark:text-indigo-400 text-base sm:text-lg">{selectedItem.product_code}</span>
                </div>
                <div className="flex items-center justify-between px-5 sm:px-6 py-3 sm:py-3.5">
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Kho</span>
                  {scannedItems.length > 1 ? (
                    <select
                      value={selectedInventoryId}
                      onChange={(e) => setSelectedInventoryId(e.target.value)}
                      className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 outline-none cursor-pointer max-w-[150px] sm:max-w-none"
                    >
                      {scannedItems.map(item => (
                        <option key={item.inventory_id} value={item.inventory_id}>
                          {item.warehouse_name} (Tồn: {item.quantity_available})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 sm:px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-500/30 text-xs sm:text-sm text-right">
                      {selectedItem.warehouse_name} <br className="sm:hidden"/> <span className="sm:inline hidden">—</span> {selectedItem.quantity_available} cái
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Transfer form */}
            <div className="rounded-[1.5rem] sm:rounded-2xl border border-indigo-100 dark:border-white/10 bg-white dark:bg-[#162240] shadow-lg p-5 sm:p-6 space-y-4">
              <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-gray-900 dark:text-white flex items-center gap-2">
                <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-[10px] sm:text-xs">2</span>
                Thông tin chuyển kho
              </h2>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Mã Đám *</label>
                <input
                  type="text"
                  value={maDam}
                  onChange={(e) => setMaDam(e.target.value)}
                  placeholder="Nhập mã đám (vd: 260122)..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-medium text-gray-900 dark:text-white focus:bg-white dark:focus:bg-[#162240] focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/30 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Người nhận *</label>
                <input
                  type="text"
                  value={nguoiNhan}
                  onChange={(e) => setNguoiNhan(e.target.value)}
                  placeholder="Tên người nhận hàng..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-medium text-gray-900 dark:text-white focus:bg-white dark:focus:bg-[#162240] focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/30 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="w-full inline-flex items-center justify-center gap-3 rounded-xl
                          bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4
                          text-base font-bold text-white shadow-xl shadow-emerald-800/20
                          hover:from-emerald-700 hover:to-teal-700 hover:scale-[1.02] active:scale-95
                          disabled:opacity-70 disabled:pointer-events-none transition-all duration-200"
              >
                {submitting ? (
                  <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span> Đang xuất kho...</>
                ) : (
                  <><Truck size={20} /> Xác nhận xuất hàng</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      <div className="max-w-4xl mx-auto pb-12 mt-10 px-2 sm:px-0">
        <div className="rounded-[1.5rem] sm:rounded-[2rem] bg-white dark:bg-[#162240] border border-gray-100 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-none overflow-hidden">
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100 dark:border-white/5 bg-gray-50/60 dark:bg-white/5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/20">
                <History size={16} className="text-indigo-600 dark:text-indigo-400 sm:w-[18px] sm:h-[18px]" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wide">Lịch sử xuất hàng</h2>
                <p className="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 font-medium">Tổng: {history.length} phiếu{lockedWarehouse ? ` — ${lockedWarehouse}` : ''}</p>
              </div>
            </div>
            <button
              onClick={fetchHistory}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-white/5 transition-all"
            >
              <Clock size={13} /> Làm mới
            </button>
          </div>

          <div className="divide-y divide-gray-50 dark:divide-white/5">
            {historyLoading ? (
              <div className="flex items-center justify-center gap-3 py-12 text-slate-400">
                <span className="animate-spin h-5 w-5 border-2 border-indigo-400 border-t-transparent rounded-full" />
                <span className="text-sm font-medium">Đang tải lịch sử...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <AlertCircle size={24} className="text-gray-400" />
                </div>
                <p className="text-sm font-bold text-gray-500">Chưa có lịch sử xuất hàng</p>
                <p className="text-xs text-gray-400 mt-1">Các phiếu xuất hàng sẽ xuất hiện ở đây</p>
              </div>
            ) : (
              history.map((item: any) => {
                const firstItem = item.fact_xuat_hang_items?.[0];
                const createdAt = new Date(item.created_at);
                const dateStr = createdAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const timeStr = createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });



                return (
                  <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 px-5 sm:px-6 py-4 hover:bg-gray-50/60 dark:hover:bg-white/5 transition-colors">
                    <div className="flex-shrink-0 hidden sm:flex h-10 w-10 rounded-xl bg-indigo-50 dark:bg-white/5 items-center justify-center">
                      <Package size={18} className="text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-center gap-2 flex-wrap mb-1 sm:mb-0">
                        <span className="font-mono text-[10px] sm:text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/20 px-2 py-0.5 rounded-md">{item.ma_phieu_xuat}</span>
                        <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[item.trang_thai] || 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-white/10 dark:text-gray-300 dark:border-white/20'}`}>
                          {statusLabel[item.trang_thai] || item.trang_thai}
                        </span>
                        {firstItem?.so_luong && (
                          <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/30">SL: {firstItem.so_luong}</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-0.5 truncate w-full">
                        {firstItem ? `${firstItem.ma_hom} — ${firstItem.ten_hom}` : item.ten_khach || 'N/A'}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1 sm:mt-0.5 text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                        {item.nguoi_tao && item.nguoi_tao !== '—' && (
                          <span>Người xuất: <span className="text-gray-600 dark:text-gray-300 font-semibold">{item.nguoi_tao}</span></span>
                        )}
                        {item.ten_khach && (
                          <span className="hidden sm:inline">• </span>
                        )}
                        {item.ten_khach && (
                          <span>Người nhận: <span className="text-gray-600 dark:text-gray-300 font-semibold">{item.ten_khach}</span></span>
                        )}
                      </div>
                      {item.ghi_chu && (
                        <p className="text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 font-medium truncate mt-0.5">{item.ghi_chu}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 w-full sm:w-auto flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-1.5 mt-2 sm:mt-0">
                      <div className="flex sm:block items-center gap-2">
                        <p className="text-xs sm:text-[13px] font-bold text-gray-700 dark:text-gray-300">{timeStr}</p>
                        <span className="text-gray-300 dark:text-gray-600 sm:hidden">•</span>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">{dateStr}</p>
                      </div>
                      <button 
                        onClick={() => setSelectedHistoryItem(item)}
                        className="bg-indigo-50 dark:bg-white/10 hover:bg-indigo-600 dark:hover:bg-indigo-500 text-indigo-600 dark:text-gray-200 hover:text-white border border-indigo-100 dark:border-white/10 px-3 sm:px-3 py-1.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all shadow-sm active:scale-95"
                      >
                        Chi tiết
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Drawer/Modal Chi Tiết Xuất Hàng */}
      {selectedHistoryItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6 transition-all animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#162240] rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 sm:px-8 py-4 sm:py-5 border-b border-gray-100 dark:border-white/5 bg-gray-50/80 dark:bg-white/5 shrink-0">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shadow-inner dark:shadow-none">
                  <Package size={20} className="sm:w-[24px] sm:h-[24px]" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight">Chi tiết Xuất Kho</h2>
                  <p className="text-[11px] sm:text-[13px] text-gray-500 dark:text-gray-400 font-semibold mt-0.5 font-mono bg-white dark:bg-white/5 px-2 py-0.5 rounded border border-gray-200 dark:border-white/10 w-fit">{selectedHistoryItem.ma_phieu_xuat}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedHistoryItem(null)} 
                className="p-2 sm:p-2.5 bg-white dark:bg-[#162240] hover:bg-red-50 dark:hover:bg-red-500/20 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 rounded-full transition-all shadow-sm border border-gray-200 dark:border-white/10 cursor-pointer hover:rotate-90"
              >
                <X size={18} className="sm:w-[20px] sm:h-[20px]" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-5 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto modal-scrollbar bg-[#f8fafc] dark:bg-[#0b1426]">
              
              <div className="flex items-center justify-between bg-white dark:bg-[#162240] px-4 sm:px-5 py-3 sm:py-4 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                 <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="text-[10px] sm:text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Trạng thái</span>
                    <span className={`inline-flex items-center w-fit px-2 py-1 rounded-lg text-[10px] sm:text-xs font-black border uppercase tracking-wider ${statusColors[selectedHistoryItem.trang_thai] || 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-white/10 dark:text-gray-300 dark:border-white/20'}`}>
                      {statusLabel[selectedHistoryItem.trang_thai] || selectedHistoryItem.trang_thai}
                    </span>
                 </div>
                 <div className="text-right">
                    <p className="text-xs sm:text-sm font-black text-gray-800 dark:text-white">
                      {new Date(selectedHistoryItem.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 dark:text-gray-500">
                      {new Date(selectedHistoryItem.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                 </div>
              </div>

              {/* Info grid */}
              <div>
                <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2 uppercase tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  Thông tin chung
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-white dark:bg-[#162240] p-4 sm:p-5 rounded-[1.5rem] sm:rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm hover:border-indigo-100 dark:hover:border-white/10 transition-colors">
                    <span className="block text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-indigo-400 mb-1.5 sm:mb-2">Kho xuất</span>
                    <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-white">{selectedHistoryItem.kho_xuat || '—'}</p>
                  </div>
                  <div className="bg-white dark:bg-[#162240] p-4 sm:p-5 rounded-[1.5rem] sm:rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm hover:border-indigo-100 dark:hover:border-white/10 transition-colors">
                    <span className="block text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-indigo-400 mb-1.5 sm:mb-2">Người xuất</span>
                    <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-white truncate">{selectedHistoryItem.nguoi_tao || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2 uppercase tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Sản phẩm đã xuất
                </h3>
                 <div className="space-y-3">
                    {selectedHistoryItem.fact_xuat_hang_items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex gap-3 sm:gap-4 p-4 sm:p-5 rounded-[1.5rem] sm:rounded-2xl border border-emerald-100 dark:border-emerald-500/20 bg-white dark:bg-[#162240] shadow-sm hover:shadow-md hover:border-emerald-200 transition-all">
                        <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                          <Package size={18} className="sm:w-[20px] sm:h-[20px]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] sm:text-[15px] font-black text-gray-900 dark:text-white mb-1.5 leading-snug">{item.ten_hom}</p>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-[13px] font-bold text-gray-500 dark:text-gray-400">
                            <span className="bg-gray-50 dark:bg-white/5 px-2 py-0.5 rounded-lg border border-gray-100 dark:border-white/10 font-mono text-gray-600 dark:text-gray-300 text-[10px] sm:text-xs">Mã: {item.ma_hom}</span>
                            <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>
                            <span className="text-[10px] sm:text-xs">SL: <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">{item.so_luong}</span></span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!selectedHistoryItem.fact_xuat_hang_items || selectedHistoryItem.fact_xuat_hang_items.length === 0) && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic bg-white dark:bg-[#162240] p-5 rounded-2xl border border-gray-100 dark:border-white/5 text-center">Không có thông tin chi tiết sản phẩm.</p>
                    )}
                 </div>
              </div>

              {/* Ghi chú */}
              {selectedHistoryItem.ghi_chu && (
                <div className="bg-gradient-to-br from-amber-50 dark:from-amber-900/20 to-orange-50 dark:to-orange-900/20 rounded-[1.5rem] sm:rounded-2xl p-4 sm:p-5 border border-amber-200/50 dark:border-amber-500/20 shadow-inner">
                  <span className="block text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-amber-500 mb-1.5 sm:mb-2">Ghi chú & Người Nhận</span>
                  <p className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-500 leading-relaxed">{selectedHistoryItem.ghi_chu}</p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 bg-white dark:bg-[#162240] border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 shrink-0">
              {selectedHistoryItem.trang_thai !== 'cancelled' && (
                <button 
                  onClick={async () => {
                    if (!confirm('Bạn có chắc chắn muốn huỷ phiếu xuất này? Số lượng sẽ được cộng lại vào kho.')) return;
                    try {
                      const res = await fetch(`/api/goods-issue/${selectedHistoryItem.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'cancelled' })
                      });
                      if (res.ok) {
                        setSelectedHistoryItem({ ...selectedHistoryItem, trang_thai: 'cancelled' });
                        fetchHistory();
                      } else {
                        const err = await res.json();
                        alert(err.error || 'Lỗi huỷ phiếu xuất');
                      }
                    } catch (e) {
                      alert('Lỗi kết nối');
                    }
                  }}
                  className="px-5 sm:px-6 py-2 sm:py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-xs sm:text-sm transition-colors active:scale-95"
                >
                  Huỷ lệnh
                </button>
              )}
              <button 
                onClick={() => setSelectedHistoryItem(null)}
                className="px-5 sm:px-6 py-2 sm:py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs sm:text-sm transition-colors active:scale-95"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
