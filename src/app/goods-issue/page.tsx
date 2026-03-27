'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Search, ScanLine, Keyboard, ArrowLeft } from 'lucide-react';
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
  quantity_total: number;
}

export default function GoodsIssuePage() {
  const router = useRouter();
  const [inputMode, setInputMode] = useState<'type' | 'scan'>('type');
  const [searchInput, setSearchInput] = useState('');
  
  const [scannedItems, setScannedItems] = useState<InventoryItemData[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  
  const [error, setError] = useState('');
  
  // Delivery form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [note, setNote] = useState('');
  const [quantityToExport, setQuantityToExport] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Search logic
  const handleSearchProductOrLot = async (code: string) => {
    setError('');
    setScannedItems([]);
    setSelectedInventoryId('');

    if (!code) return;

    try {
      const res = await fetch(`/api/goods-issue/search?q=${encodeURIComponent(code)}`);
      const result = await res.json();

      if (!res.ok) {
        setError(result.error || `Mã "${code}" không tồn tại hoặc đã hết hàng.`);
        return;
      }

      let data = result.data as InventoryItemData[];

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
        setError(`Lỗi: Không tìm thấy lô hàng khả dụng nào phù hợp với quyền truy cập kho của bạn.`);
        return;
      }

      setScannedItems(data);
      // Auto-select first item
      setSelectedInventoryId(data[0].inventory_id);
      setQuantityToExport(data[0].quantity_available > 0 ? 1 : 0);
      setSearchInput(code);

    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối cơ sở dữ liệu khi tra cứu tồn kho.');
    }
  };

  const selectedItem = scannedItems.find(i => i.inventory_id === selectedInventoryId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    
    if (quantityToExport <= 0 || quantityToExport > selectedItem.quantity_available) {
      setError(`Số lượng xuất không hợp lệ (Tồn khả dụng: ${selectedItem.quantity_available})`);
      return;
    }

    setSubmitting(true);
    let createdBy = 'unknown';
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) createdBy = JSON.parse(raw).email || 'unknown';
    } catch { /* ignore */ }

    try {
      const res = await fetch('/api/goods-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory_id: selectedItem.inventory_id,
          product_code: selectedItem.product_code,
          quantity: quantityToExport,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_address: customerAddress,
          note,
          created_by: createdBy
        })
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Có lỗi xảy ra khi tạo Đơn xuất hàng.');
        return;
      }

      // Success
      router.push(`/operations`); // Redirect to operations page to view Delivery Orders
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
                placeholder="Nhập mã Sản phẩm (vd: 2AQ0075) hoặc mã lô / đám..."
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
        </div>

        {/* ── Form Section ── */}
        {scannedItems.length > 0 && selectedItem && (
          <form onSubmit={handleSubmit} className="rounded-[2rem] bg-white border border-gray-100 shadow-xl shadow-emerald-900/5 p-6 sm:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[100px] -z-0"></div>
            
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-gray-900 flex items-center gap-2 relative z-10">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs">2</span>
              Điền thông tin xuất kho
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
              {/* Product Info Panel */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60">
                  <h3 className="text-xs font-bold uppercase text-slate-500 mb-4 tracking-wider">Thông tin sản phẩm chọn xuất</h3>
                  
                  {scannedItems.length > 1 && (
                    <div className="mb-4">
                      <select
                        value={selectedInventoryId}
                        onChange={(e) => {
                          setSelectedInventoryId(e.target.value);
                          const it = scannedItems.find(i => i.inventory_id === e.target.value);
                          if (it && quantityToExport > it.quantity_available) {
                            setQuantityToExport(it.quantity_available);
                          }
                        }}
                        className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer transition-all"
                      >
                        {scannedItems.map((item) => (
                          <option key={item.inventory_id} value={item.inventory_id}>
                            Kho {item.warehouse_name} — Tồn: {item.quantity_available} SP
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-200/60">
                      <span className="text-xs font-semibold text-slate-500">Mã Sản Phẩm</span>
                      <span className="text-sm font-bold font-mono text-indigo-700">{selectedItem.product_code}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-200/60">
                      <span className="text-xs font-semibold text-slate-500">Tên SP</span>
                      <span className="text-sm font-bold text-slate-900 truncate max-w-[150px]" title={selectedItem.product_name}>
                        {selectedItem.product_name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-200/60">
                      <span className="text-xs font-semibold text-slate-500">Kho / Vị trí</span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md">
                        {selectedItem.warehouse_name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-xs font-semibold text-slate-500">Mã Lô (Đám)</span>
                      <span className="text-sm font-bold text-slate-900">{selectedItem.ma_lo || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-bold uppercase text-emerald-800 tracking-wider">Số Lượng Xuất</label>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Tối đa: {selectedItem.quantity_available}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={selectedItem.quantity_available}
                      value={quantityToExport}
                      onChange={(e) => setQuantityToExport(parseInt(e.target.value) || 0)}
                      required
                      className="w-full text-center px-4 py-3 rounded-xl border border-transparent bg-white text-xl font-extrabold text-emerald-700 outline-none focus:ring-4 focus:ring-emerald-500/20 shadow-sm transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Info Panel */}
              <div className="lg:col-span-7 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-px bg-gray-100 flex-1"></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Thông tin giao hàng</span>
                  <div className="h-px bg-gray-100 flex-1"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 ml-1">Tên khách hàng</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nguyễn Văn A..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-gray-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 ml-1">Số điện thoại</label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="09..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-gray-400"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 ml-1">Địa chỉ nhận hàng</label>
                    <input
                      type="text"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Số nhà, Tên đường, Phường/Xã..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-gray-400"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 ml-1">Ghi chú vận hành</label>
                    <textarea
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Giao siêu tốc, gọi trước khi đến..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-gray-400 resize-none"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="group relative w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold text-sm hover:from-emerald-600 hover:to-teal-700 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/30 transition-all overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                    <Truck size={18} className="relative z-10" />
                    <span className="relative z-10">{submitting ? 'Đang xử lý...' : 'Xác nhận tạo Đơn xuất hàng'}</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </PageLayout>
  );
}
