'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Search, ScanLine, Keyboard, CheckCircle2, Package, Clock, History, AlertCircle } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { getWarehouseFilter } from '@/config/roles.config';
import dynamic from 'next/dynamic';

const Scanner = dynamic(() => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner), {
  ssr: false,
});

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
  const router = useRouter();
  const [inputMode, setInputMode] = useState<'type' | 'scan'>('type');
  const [searchInput, setSearchInput] = useState('');

  const [scannedItems, setScannedItems] = useState<InventoryItemData[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');

  const [maDam, setMaDam] = useState('');
  const [nguoiNhan, setNguoiNhan] = useState('');
  const [error, setError] = useState('');

  // History
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/goods-issue/history');
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
      const res = await fetch(`/api/goods-issue/search?q=${encodeURIComponent(code)}`);
      const result = await res.json();

      if (!res.ok) {
        setError(result.error || `Mã "${code}" không tồn tại hoặc đã hết hàng.`);
        return;
      }

      // If search returned dam_data with ma_dam, auto-fill
      if (result.dam_data?.ma_dam) {
        setMaDam(result.dam_data.ma_dam);
      }

      let data = (result.data || []) as InventoryItemData[];

      // Filter by authorized warehouse if applicable
      try {
        const auth = localStorage.getItem('auth_user');
        if (auth) {
          const user = JSON.parse(auth);
          const filter = getWarehouseFilter(user.email);
          if (filter) {
            data = data.filter(item => item.warehouse_name?.includes(filter));
          }
        }
      } catch {}

      if (data.length === 0) {
        setError('Không tìm thấy lô hàng khả dụng nào.');
        return;
      }

      setScannedItems(data);
      setSelectedInventoryId(data[0].inventory_id);
      setSearchInput(code);
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối cơ sở dữ liệu khi tra cứu tồn kho.');
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
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-4 shadow-sm">
            <Truck size={14} className="text-emerald-400" />
            <span className="text-[11px] font-bold text-white tracking-widest uppercase">Xuất Kho Nội Bộ</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight">Chuyển Kho Nội Bộ (IT)</h1>
          <p className="text-indigo-100 text-sm max-w-md leading-relaxed">
            Quét mã QR sản phẩm hoặc nhập mã đám, điền thông tin người nhận, xác nhận xuất kho.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        {/* Success message */}
        {success && (
          <div className="max-w-lg mx-auto rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg p-10 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-5 border-4 border-emerald-200 shadow-md">
              <CheckCircle2 size={48} className="text-emerald-500" />
            </div>
            <h3 className="text-2xl font-black text-emerald-800 mb-2">Xuất hàng thành công!</h3>
            <p className="text-emerald-700 font-semibold">Sản phẩm đã được trừ kho và ghi nhận.</p>
            <p className="text-sm text-emerald-500 mt-3 opacity-80">Tự động làm mới sau 3 giây...</p>
          </div>
        )}

        {/* Scanner / Search Card */}
        {!success && (
          <div className="rounded-[2rem] bg-white border border-gray-100 shadow-xl shadow-gray-200/50 p-6 sm:p-8 relative overflow-hidden transition-all">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-emerald-500"></div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-gray-900 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs">1</span>
                Quét mã hoặc tìm kiếm
              </h2>

              <div className="flex bg-gray-100/80 backdrop-blur-xl p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setInputMode('type')}
                  className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                    inputMode === 'type'
                      ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200/50'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Keyboard size={14} />
                  Nhập tay
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('scan')}
                  className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                    inputMode === 'scan'
                      ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-gray-200/50'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <ScanLine size={14} />
                  Quét mã QR
                </button>
              </div>
            </div>

            {inputMode === 'type' ? (
              <div className="relative max-w-2xl">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearchProductOrLot(searchInput.trim());
                  }}
                  placeholder="Nhập Mã Đám hoặc mã sản phẩm..."
                  className="w-full pl-11 pr-32 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 rounded-2xl text-sm font-medium text-gray-900 placeholder:text-gray-400 transition-all shadow-inner focus:shadow-indigo-500/10 outline-none"
                />
                <div className="absolute right-2 top-2 bottom-2">
                  <button
                    type="button"
                    onClick={() => handleSearchProductOrLot(searchInput.trim())}
                    className="h-full px-6 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all"
                  >
                    Tìm kiếm
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden bg-black/5 relative aspect-video sm:aspect-[21/9] w-full max-w-2xl border border-gray-200 flex items-center justify-center">
                <Scanner
                  onScan={(result) => {
                    if (result && result.length > 0 && result[0].rawValue) {
                      setSearchInput(result[0].rawValue);
                      setInputMode('type');
                      handleSearchProductOrLot(result[0].rawValue);
                    }
                  }}
                  formats={['qr_code']}
                  components={{ onOff: true, torch: true, zoom: true, finder: true }}
                />
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-white/50 pb-8">
                  <ScanLine size={48} className="mb-4 opacity-50" />
                  <p className="text-xs font-medium tracking-widest uppercase">Đưa mã QR vào khung ngắm</p>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 px-5 py-4 rounded-xl bg-red-50/50 border border-red-100 text-red-600 text-sm font-medium flex items-center gap-3">
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
            <div className="rounded-2xl overflow-hidden border border-indigo-200 shadow-xl">
              <div className="bg-gradient-to-r from-[#1B2A4A] to-teal-700 px-6 py-5">
                <p className="text-teal-200 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <Package size={12} /> Sản phẩm
                </p>
                <h2 className="text-white text-xl font-bold leading-snug">
                  {selectedItem.product_name}
                </h2>
              </div>

              {/* Coffin image */}
              <div className="bg-slate-50 border-x border-indigo-100 px-6 py-5 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getCoffinImage(selectedItem.product_code)}
                  alt="Sản phẩm"
                  className="max-h-44 w-full object-contain drop-shadow-md"
                />
              </div>

              <div className="bg-white border border-indigo-100 divide-y divide-indigo-50/60">
                <div className="flex items-center justify-between px-6 py-3.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Mã SP</span>
                  <span className="font-mono font-extrabold text-indigo-800 text-lg">{selectedItem.product_code}</span>
                </div>
                <div className="flex items-center justify-between px-6 py-3.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Kho</span>
                  {scannedItems.length > 1 ? (
                    <select
                      value={selectedInventoryId}
                      onChange={(e) => setSelectedInventoryId(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border-2 border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-700 outline-none cursor-pointer"
                    >
                      {scannedItems.map(item => (
                        <option key={item.inventory_id} value={item.inventory_id}>
                          {item.warehouse_name} (Tồn: {item.quantity_available})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                      {selectedItem.warehouse_name} — {selectedItem.quantity_available} cái
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Transfer form */}
            <div className="rounded-2xl border border-indigo-100 bg-white shadow-lg p-6 space-y-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-gray-900 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs">2</span>
                Thông tin chuyển kho
              </h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Mã Đám *</label>
                <input
                  type="text"
                  value={maDam}
                  onChange={(e) => setMaDam(e.target.value)}
                  placeholder="Nhập mã đám (vd: 260122)..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Người nhận *</label>
                <input
                  type="text"
                  value={nguoiNhan}
                  onChange={(e) => setNguoiNhan(e.target.value)}
                  placeholder="Tên người nhận hàng..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
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
      <div className="max-w-4xl mx-auto pb-12 mt-10">
        <div className="rounded-[2rem] bg-white border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/60">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100">
                <History size={18} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">Lịch sử xuất hàng</h2>
                <p className="text-[11px] text-gray-400 font-medium">{history.length} phiếu gần nhất</p>
              </div>
            </div>
            <button
              onClick={fetchHistory}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-all"
            >
              <Clock size={13} /> Làm mới
            </button>
          </div>

          <div className="divide-y divide-gray-50">
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

                const statusColors: Record<string, string> = {
                  pending: 'bg-amber-100 text-amber-700 border-amber-200',
                  assigned: 'bg-blue-100 text-blue-700 border-blue-200',
                  in_transit: 'bg-indigo-100 text-indigo-700 border-indigo-200',
                  delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                  cancelled: 'bg-red-100 text-red-700 border-red-200',
                };
                const statusLabel: Record<string, string> = {
                  pending: 'Chờ xử lý',
                  assigned: 'Đã phân công',
                  in_transit: 'Đang giao',
                  delivered: 'Đã giao',
                  cancelled: 'Đã hủy',
                };

                return (
                  <div key={item.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors">
                    <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                      <Package size={18} className="text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">{item.ma_phieu_xuat}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[item.trang_thai] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {statusLabel[item.trang_thai] || item.trang_thai}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">
                        {firstItem ? `${firstItem.ma_hom} — ${firstItem.ten_hom}` : item.ten_khach || 'N/A'}
                      </p>
                      {item.ghi_chu && (
                        <p className="text-xs text-gray-400 font-medium truncate mt-0.5">{item.ghi_chu}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs font-bold text-gray-700">{timeStr}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{dateStr}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
