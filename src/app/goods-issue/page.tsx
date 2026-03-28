'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Search, ScanLine, Keyboard, Eye, X, CheckCircle2, Package, User, Clock, History, AlertCircle } from 'lucide-react';
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

const formatChiNhanh = (cn?: string) => {
  if (!cn) return '—';
  const lower = cn.toLowerCase().replace(/\s+/g, '');
  if (lower === 'cn1' || lower === 'kho1') return 'Hàm Long';
  if (lower === 'cn2' || lower === 'kho2') return 'Kha Vạn Cân';
  if (lower === 'cn3' || lower === 'kho3') return 'Kinh Dương Vương';
  return cn;
};

const DetailRow = ({ label, value, sub }: { label: string, value?: any, sub?: string }) => {
  const isValueEmpty = !value || value === 'null' || value === '—' || String(value || '').trim() === '';
  const isSubEmpty = !sub || sub === 'null' || sub === '—' || String(sub || '').trim() === '';
  
  if (isValueEmpty && isSubEmpty) return null;

  return (
    <div className="flex justify-between items-start gap-4 hover:bg-gray-50/50 p-1 -mx-1 rounded-lg transition-colors">
      <span className="text-[13px] font-bold text-gray-500 w-[40%] flex-shrink-0 leading-tight pt-0.5">{label}</span>
      <div className="flex flex-col flex-1 items-end text-right">
         <span className="text-sm font-bold text-gray-900 leading-tight block">{!isValueEmpty ? value : '—'}</span>
         {!isSubEmpty && <span className="text-[11px] font-semibold text-gray-400 mt-1 uppercase tracking-wide leading-tight block">{sub}</span>}
      </div>
    </div>
  );
};

export default function GoodsIssuePage() {
  const router = useRouter();
  const [inputMode, setInputMode] = useState<'type' | 'scan'>('type');
  const [searchInput, setSearchInput] = useState('');
  
  const [scannedItems, setScannedItems] = useState<InventoryItemData[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  
  const [funeralData, setFuneralData] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOrderConfirmed, setIsOrderConfirmed] = useState(false);
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

  // Delivery form (Automated)
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('...');
  const [nowStr, setNowStr] = useState('');

  // Load user from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        setUserEmail(u.email || '');
        setUserName(u.ho_ten || u.name || u.email || 'Thủ kho');
      }
    } catch {}
  }, []);

  // Live clock
  useEffect(() => {
    const fmt = () => {
      const now = new Date();
      const time = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const date = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      setNowStr(`${time} — ${date}`);
    };
    fmt();
    const id = setInterval(fmt, 1000);
    return () => clearInterval(id);
  }, []);


  const getCoffinImage = (code: string) => {
    if (!code) return '/coffin-1.png';
    let hash = 0;
    for (let i = 0; i < code.length; i++) hash = ((hash << 5) - hash + code.charCodeAt(i)) | 0;
    return `/coffin-${(Math.abs(hash) % 5) + 1}.png`;
  };


  // Search logic
  const handleSearchProductOrLot = async (code: string) => {
    setError('');
    setIsOrderConfirmed(false);
    setScannedItems([]);
    setSelectedInventoryId('');
    setFuneralData(null);

    if (!code) return;

    try {
      const res = await fetch(`/api/goods-issue/search?q=${encodeURIComponent(code)}`);
      const result = await res.json();

      if (!res.ok) {
        setError(result.error || `Mã "${code}" không tồn tại hoặc đã hết hàng.`);
        return;
      }

      const damData = result.dam_data;
      if (damData) {
        setFuneralData(damData);
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
      } catch(e) {}

      if (data.length === 0) {
        if (!damData) {
          setError(`Lỗi: Không tìm thấy lô hàng khả dụng nào phù hợp với quyền truy cập kho của bạn.`);
        }
        return;
      }

      setScannedItems(data);
      // Auto-select first item
      setSelectedInventoryId(data[0].inventory_id);
      setSearchInput(code);
      // Note: we do NOT confirm order yet — user must click 'Xác nhận' in modal first

    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối cơ sở dữ liệu khi tra cứu tồn kho.');
    }
  };

  const selectedItem = scannedItems.find(i => i.inventory_id === selectedInventoryId);

  const handleConfirmOrder = () => {
    // Step 1 complete: user confirmed the funeral order.
    // We now mark isOrderConfirmed = true so the coffin card appears below.
    setIsOrderConfirmed(true);
    setIsModalOpen(false);
    setSuccess(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedItem) {
      window.alert('Không có sản phẩm tồn kho khả dụng để lập đơn xuất hàng!');
      return;
    }

    if (1 > selectedItem.quantity_available) {
      setError(`Số lượng xuất không hợp lệ (Tồn khả dụng: ${selectedItem.quantity_available})`);
      return;
    }

    setSubmitting(true);
    let createdBy = 'unknown';
    let createdName = 'Nhân viên';
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        createdBy = u.email || 'unknown';
        createdName = u.ho_ten || u.email?.split('@')[0] || 'Nhân viên';
      }
    } catch { /* ignore */ }

    try {
      const res = await fetch('/api/goods-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory_id: selectedItem.inventory_id,
          product_code: selectedItem.product_code,
          quantity: 1,
          customer_name: funeralData?.nguoi_mat || 'Khách vãng lai',
          customer_phone: funeralData?.sdt || '',
          customer_address: funeralData?.dia_chi_to_chuc || '',
          note: `Xuất hòm cho đám ${funeralData?.ma_dam || '—'} (${funeralData?.hom_loai || selectedItem.product_name})`,
          created_by: createdBy,
        })
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Có lỗi xảy ra khi tạo Đơn xuất hàng.');
        return;
      }

      setSuccess(true);
      fetchHistory(); // refresh history after successful export
      setTimeout(() => {
        router.push(`/operations`);
      }, 2000);
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout title="Xuất hàng" icon={<Truck size={15} className="text-emerald-500" />}>
      {/* ── Header Section ── */}
      <div className="mb-8 p-8 sm:p-10 rounded-[2rem] bg-gradient-to-br from-[#1B2A4A] via-indigo-900 to-[#1e3a8a] text-white shadow-xl shadow-indigo-900/20 max-w-4xl mx-auto relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/20 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-4 shadow-sm">
              <Truck size={14} className="text-emerald-400" />
              <span className="text-[11px] font-bold text-white tracking-widest uppercase">Nghiệp Vụ Xuất Kho</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight">Tạo Đơn Xuất Hàng</h1>
            <p className="text-indigo-100 text-sm max-w-md leading-relaxed">
              Quét mã QR sản phẩm hoặc nhập mã lô/mã sản phẩm để lập phiếu xuất kho và bắt đầu giao hàng nhanh chóng.
            </p>
          </div>
          
          <div className="hidden md:flex h-24 w-24 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 items-center justify-center rotate-3 shadow-lg">
             <ScanLine size={40} className="text-emerald-300 opacity-80" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        {/* ── Scanner / Search Card ── */}
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
                placeholder="Nhập Mã Đám (vd: 260122, 240510)..."
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
            <div className="mt-6 px-5 py-4 rounded-xl bg-red-50/50 border border-red-100 text-red-600 text-sm font-medium flex items-center gap-3 animate-in slide-in-from-top-2">
              <div className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
              {error}
            </div>
          )}

          {funeralData && (
            <div className="mt-6 p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 animate-in slide-in-from-top-2">
              <h3 className="text-xs font-bold uppercase text-indigo-800 tracking-wider mb-4 border-b border-indigo-100 pb-2 flex items-center justify-between">
                <span>Thông tin Đám (Lô): {funeralData.ma_dam}</span>
                {isOrderConfirmed && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-black tracking-widest border border-emerald-200">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    ĐÃ XÁC NHẬN OK
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)] border border-indigo-50/50 flex flex-col justify-center">
                  <span className="block text-[9px] uppercase font-extrabold text-indigo-400 tracking-wider mb-0.5">Người Mất / Khách Hàng</span>
                  <p className="text-sm font-bold text-slate-800 line-clamp-1 truncate">{funeralData.nguoi_mat || '—'}</p>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)] border border-indigo-50/50 flex flex-col justify-center">
                  <span className="block text-[9px] uppercase font-extrabold text-indigo-400 tracking-wider mb-0.5">Loại Tang Lễ</span>
                  <p className="text-sm font-bold text-slate-800 line-clamp-1 truncate">{funeralData.loai || '—'}</p>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)] border border-indigo-50/50 flex flex-col justify-center">
                  <span className="block text-[9px] uppercase font-extrabold text-indigo-400 tracking-wider mb-0.5">Chi Nhánh</span>
                  <p className="text-sm font-bold text-slate-800 line-clamp-1 truncate">{formatChiNhanh(funeralData.chi_nhanh)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-3 rounded-xl transition-colors shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)] flex items-center justify-center gap-2 h-full"
                >
                  <Eye size={16} />
                  <span className="font-bold text-sm whitespace-nowrap">Xem chi tiết</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Step 2: Coffin Info Card (from fact_dam) + Issue Button ── */}
        {isOrderConfirmed && funeralData && !success && (
          <div className="max-w-lg mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-500">

            {/* ─ Coffin Info Card ─ Data = fact_dam directly ─ */}
            <div className="rounded-2xl overflow-hidden border border-indigo-200 shadow-xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#1B2A4A] to-teal-700 px-6 py-5">
                <p className="text-teal-200 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <Package size={12} /> Hòm cần xuất — Đám {funeralData.ma_dam}
                </p>
                <h2 className="text-white text-xl font-bold leading-snug">
                  {funeralData.hom_loai || '— Chưa có thông tin hòm —'}
                </h2>
              </div>

              {/* Coffin image */}
              <div className="bg-slate-50 border-x border-indigo-100 px-6 py-5 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getCoffinImage(funeralData.ma_hom || funeralData.ma_dam)}
                  alt="Hòm"
                  className="max-h-44 w-full object-contain drop-shadow-md"
                />
              </div>

              {/* Info from fact_dam */}
              <div className="bg-white border border-indigo-100 divide-y divide-indigo-50/60">
                <div className="flex items-center justify-between px-6 py-3.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Mã Hòm</span>
                  <span className="font-mono font-extrabold text-indigo-800 text-lg">{funeralData.ma_hom || '—'}</span>
                </div>
                <div className="flex items-start justify-between px-6 py-3.5 gap-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400 flex-shrink-0">Loại Hòm</span>
                  <span className="font-semibold text-slate-800 text-right text-sm leading-snug">{funeralData.hom_loai || '—'}</span>
                </div>
                <div className="flex items-start justify-between px-6 py-3.5 gap-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400 flex-shrink-0">NCC / Kho nguồn</span>
                  <span className="font-semibold text-slate-700 text-right text-sm">{funeralData.hom_ncc_hay_kho || '—'}</span>
                </div>

                {/* Warehouse from inventory (if found) */}
                <div className="flex items-center justify-between px-6 py-3.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Kho hiện có</span>
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
                  ) : selectedItem ? (
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                      📍 {selectedItem.warehouse_name} &nbsp;·&nbsp; {selectedItem.quantity_available} cái
                    </span>
                  ) : (
                    <span className="text-amber-600 font-semibold text-sm">Chưa có trong kho</span>
                  )}
                </div>
              </div>
            </div>

            {/* ─ Issue confirm panel ─ */}
            <div className="rounded-2xl border border-indigo-100 bg-white shadow-lg p-6">
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 mb-5 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2 font-semibold text-slate-500"><User size={13}/> Người xuất:</span>
                  <span className="font-bold text-slate-800">{userName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2 font-semibold text-slate-500"><Clock size={13}/> Thời gian:</span>
                  <span className="font-mono font-bold text-indigo-700 text-xs bg-indigo-50 px-2 py-0.5 rounded-md tabular-nums">{nowStr}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2 font-semibold text-slate-500"><Package size={13}/> Số lượng:</span>
                  <span className="font-bold text-indigo-600 bg-indigo-50 px-3 py-0.5 rounded-md">1 Hòm</span>
                </div>
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
                  {error}
                </div>
              )}

              {selectedItem ? (
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
                    <><Truck size={20} /> Xuất hàng</>
                  )}
                </button>
              ) : (
                <div className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 px-6 py-5 text-center">
                  <Truck size={24} className="text-amber-400" />
                  <p className="text-sm font-bold text-amber-700">Hòm chưa có trong kho</p>
                  <p className="text-xs text-amber-600">Vui lòng nhập kho mã hòm <strong>{funeralData.ma_hom}</strong> trước khi xuất.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Success */}
        {isOrderConfirmed && success && (
          <div className="max-w-lg mx-auto rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg p-10 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-5 border-4 border-emerald-200 shadow-md">
              <CheckCircle2 size={48} className="text-emerald-500" />
            </div>
            <h3 className="text-2xl font-black text-emerald-800 mb-2">Xuất hàng thành công!</h3>
            <p className="text-emerald-700 font-semibold">Mã hòm <strong>{funeralData?.ma_hom}</strong> đã được trừ kho và ghi nhận.</p>
            <p className="text-sm text-emerald-500 mt-5 opacity-80">Đang chuyển sang trang Quản lý giao hàng...</p>
          </div>
        )}
      </div>

      {/* ── Modal Chi tiết đám ── */}
      {isModalOpen && funeralData && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6 transition-opacity duration-300">
            <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[85vh] flex flex-col shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
               <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 bg-gray-50/80 backdrop-blur-md relative gap-2 sm:gap-4">
                 <div className="flex flex-col gap-1 w-[35%]">
                   <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                     <span className="w-1.5 h-6 bg-indigo-500 rounded-full inline-block max-sm:hidden"></span>
                     <span className="truncate">Thông tin Đám</span>
                   </h2>
                   <p className="text-[11px] sm:text-[13px] text-gray-500 font-medium tracking-wide">Mã: <span className="text-indigo-600 font-extrabold ml-1">{funeralData.ma_dam}</span></p>
                 </div>
                 
                 <div className="flex-1 w-[45%] flex justify-center">
                   <button 
                     onClick={handleConfirmOrder}
                     disabled={submitting}
                     className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 sm:px-8 py-2.5 rounded-full transition-all shadow-md flex items-center justify-center gap-2 text-xs sm:text-[15px] border border-emerald-500/30"
                   >
                     <Truck size={18} className="hidden sm:block" />
                     <span className="whitespace-nowrap">Xác nhận đơn hàng</span>
                   </button>
                 </div>

                 <div className="flex w-[20%] justify-end">
                   <button onClick={() => setIsModalOpen(false)} className="p-2 sm:p-2.5 bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 hover:text-red-600 rounded-full transition-all shadow-sm cursor-pointer hover:shadow hover:rotate-90 flex-shrink-0">
                     <X size={20} className="max-sm:w-4 max-sm:h-4" />
                   </button>
                 </div>
               </div>
               
               <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#f8fafc] modal-scrollbar">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start">
                   {/* Khối 1: Thông tin chung */}
                   <div className="space-y-4 md:space-y-6">
                     <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-100 hover:shadow-md transition-all">
                       <h3 className="text-[13px] font-black uppercase text-indigo-700 tracking-widest mb-4 flex items-center gap-2 border-b border-indigo-50 pb-3">
                         <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                         Thông tin chung & Thời gian
                       </h3>
                       <div className="space-y-3">
                         <DetailRow label="Người Mất" value={funeralData.nguoi_mat} />
                         <DetailRow label="Phân Loại" value={funeralData.loai} />
                         <DetailRow label="Chi Nhánh" value={formatChiNhanh(funeralData.chi_nhanh)} />
                         <div className="h-px bg-gray-50 my-1"></div>
                         <DetailRow label="Ngày giờ liệm" value={`${funeralData.gio_liem || ''} ${funeralData.ngay_liem || ''}`.trim()} />
                         <DetailRow label="Ngày giờ di quan" value={`${funeralData.gio_di_quan || ''} ${funeralData.ngay_di_quan || ''}`.trim()} />
                         <DetailRow label="Tổ chức tại" value={funeralData.dia_chi_to_chuc} />
                         <DetailRow label="Chôn/Thiêu tại" value={funeralData.dia_chi_chon_thieu || funeralData.chon_thieu} />
                       </div>
                     </div>

                     {/* Khối 2: Nhân sự & Dịch vụ */}
                     <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-pink-100 hover:shadow-md transition-all">
                       <h3 className="text-[13px] font-black uppercase text-pink-700 tracking-widest mb-4 flex items-center gap-2 border-b border-pink-50 pb-3">
                         <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span>
                         Nhân sự & Bố trí
                       </h3>
                       <div className="space-y-3">
                         <DetailRow label="Sale" value={funeralData.sale} />
                         <DetailRow label="Điều Phối" value={funeralData.dieu_phoi} />
                         <DetailRow label="Thầy" value={funeralData.thay_ten} sub={funeralData.thay_so_luong ? `SL: ${funeralData.thay_so_luong} (${funeralData.thay_ncc || ''})` : ''} />
                         <DetailRow label="Bảo Đồn" value={funeralData.bao_don} />
                         <DetailRow label="Thuê NV trực" value={funeralData.thue_nv_truc} />
                       </div>
                     </div>
                   </div>

                   {/* Khối 3: Vật phẩm & Logistics */}
                   <div className="space-y-4 md:space-y-6">
                     <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-emerald-100 hover:shadow-md transition-all">
                       <h3 className="text-[13px] font-black uppercase text-emerald-700 tracking-widest mb-4 flex items-center gap-2 border-b border-emerald-50 pb-3">
                         <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                         Vật phẩm, Thiết bị & Xe
                       </h3>
                       <div className="space-y-3">
                         <DetailRow label="Hòm" value={funeralData.hom_loai} sub={funeralData.hom_ncc_hay_kho} />
                         <DetailRow label="Hoa" value={funeralData.hoa} />
                         <DetailRow label="Focmol/Đá khô" value={funeralData.da_kho_tiem_focmol} />
                         <DetailRow label="Kèn tây" value={funeralData.ken_tay_so_le} sub={funeralData.ken_tay_ncc} />
                         <DetailRow label="Mâm cúng" value={funeralData.mam_cung_so_luong} sub={funeralData.mam_cung_ncc} />
                         <DetailRow label="Rạp bàn ghế" value={funeralData.thue_rap_ban_ghe_so_luong} sub={funeralData.thue_rap_ban_ghe_ncc} />
                         <DetailRow label="Hủ tro cút" value={funeralData.hu_tro_cot} />
                         <div className="h-px bg-gray-50 my-1"></div>
                         <DetailRow label="Xe tang lễ" value={funeralData.xe_tang_le_loai} sub={`${funeralData.xe_tang_le_ncc || ''} ${funeralData.xe_tang_le_dao_ty ? `(Đạo tỳ: ${funeralData.xe_tang_le_dao_ty})` : ''}`.trim()} />
                         <DetailRow label="Xe khách" value={funeralData.xe_khach_loai} sub={funeralData.xe_khach_ncc} />
                         <DetailRow label="Xe cấp cứu" value={funeralData.xe_cap_cuu} />
                         <DetailRow label="Xe khác" value={funeralData.xe_khac} />
                       </div>
                     </div>

                     <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-amber-100 hover:shadow-md transition-all">
                       <h3 className="text-[13px] font-black uppercase text-amber-700 tracking-widest mb-4 flex items-center gap-2 border-b border-amber-50 pb-3">
                         <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                         Dịch vụ khác & Media
                       </h3>
                       <div className="space-y-3">
                         <DetailRow label="Quay phim/Chụp hình" value={funeralData.quay_phim_chup_hinh_goi_dv} sub={funeralData.quay_phim_chup_hinh_ncc} />
                         <DetailRow label="Nhạc" value={funeralData.nhac} />
                         <DetailRow label="Di ảnh / Cáo phó" value={funeralData.di_anh_cao_pho} />
                         <DetailRow label="Băng rôn" value={funeralData.bang_ron} />
                         <DetailRow label="Lá triệu / Bài vị" value={funeralData.la_trieu_bai_vi} />
                         <DetailRow label="Teabreak" value={funeralData.teabreak} />
                         {funeralData.ghi_chu && funeralData.ghi_chu !== 'null' && funeralData.ghi_chu !== '—' && (
                           <>
                             <div className="h-px bg-gray-50 my-2"></div>
                             <div className="pt-1">
                               <span className="block text-[10px] font-black text-amber-600/70 uppercase tracking-widest mb-1.5 pl-1">Ghi chú khác</span>
                               <p className="text-sm font-semibold text-amber-900 bg-amber-50/50 p-4 rounded-xl border border-amber-100/30 leading-relaxed shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">{funeralData.ghi_chu}</p>
                             </div>
                           </>
                         )}
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
            </div>
         </div>
      )}
      {/* ── Lịch sử xuất hàng ── */}
      <div className="max-w-4xl mx-auto pb-12 mt-10">
        <div className="rounded-[2rem] bg-white border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
          {/* Header */}
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

          {/* Body */}
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
                    {/* Icon */}
                    <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                      <Package size={18} className="text-indigo-500" />
                    </div>

                    {/* Main info */}
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

                    {/* Date */}
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
