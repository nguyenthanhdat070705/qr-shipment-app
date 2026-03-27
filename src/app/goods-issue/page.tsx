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
      <div className="mb-6 flex items-center justify-between max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Tính năng xuất kho</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tìm Mã Sản phẩm, Mã Đám hoặc quét QR để ghi nhận xuất kho</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Scanner Card */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Bước 1: Quét mã SP hoặc Mã Đám</h2>
            
            <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 gap-1 mb-3">
              <button
                type="button"
                onClick={() => setInputMode('type')}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-all ${
                  inputMode === 'type'
                    ? 'bg-blue-100 text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Keyboard size={14} />
                Nhập mã
              </button>
              <button
                type="button"
                onClick={() => setInputMode('scan')}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-all ${
                  inputMode === 'scan'
                    ? 'bg-blue-100 text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ScanLine size={14} />
                Quét QR
              </button>
            </div>

            {inputMode === 'type' ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearchProductOrLot(searchInput.trim());
                  }}
                  placeholder="Tra cứu: Mã Sản phẩm (vd: 2AQ0075) hoặc Mã Lô"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
                <button
                  type="button"
                  onClick={() => handleSearchProductOrLot(searchInput.trim())}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 shadow-md transition-all whitespace-nowrap"
                >
                  <Search size={16} />
                  Tìm
                </button>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden border-2 border-emerald-200 bg-black relative aspect-[4/3] w-full max-w-sm mx-auto flex items-center justify-center">
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
              </div>
            )}
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium transition-all">
              {error}
            </div>
          )}

          {/* Form */}
          {scannedItems.length > 0 && selectedItem && (
            <form onSubmit={handleSubmit} className="rounded-2xl border border-emerald-200 bg-emerald-50 shadow-sm p-6 space-y-5 animate-in slide-in-from-bottom-4 relative">
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-800">Bước 2: Xác nhận xuất kho</h2>
              
              <div className="grid grid-cols-1 gap-4 bg-white p-4 rounded-xl border border-emerald-100">
                {scannedItems.length > 1 && (
                  <div className="mb-2">
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Chọn Lô / Kho xuất</label>
                    <select
                      value={selectedInventoryId}
                      onChange={(e) => {
                        setSelectedInventoryId(e.target.value);
                        const it = scannedItems.find(i => i.inventory_id === e.target.value);
                        if (it && quantityToExport > it.quantity_available) {
                          setQuantityToExport(it.quantity_available);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-sm font-medium focus:ring-2 focus:ring-emerald-200"
                    >
                      {scannedItems.map((item) => (
                        <option key={item.inventory_id} value={item.inventory_id}>
                          Kho: {item.warehouse_name} — Tồn: {item.quantity_available} (SP: {item.product_name})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-gray-400">Mã SP</p>
                    <p className="text-sm font-bold font-mono text-emerald-600">{selectedItem.product_code}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-gray-400">Tên sản phẩm</p>
                    <p className="text-sm font-bold text-gray-900 line-clamp-1" title={selectedItem.product_name}>{selectedItem.product_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-gray-400">Kho xuất</p>
                    <p className="text-sm font-bold text-gray-900">{selectedItem.warehouse_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-gray-400">Mã lô (Đám)</p>
                    <p className="text-sm font-bold text-gray-900">{selectedItem.ma_lo}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <div className="flex justify-between items-end mb-1">
                    <label className="block text-sm font-semibold text-gray-700">Số lượng xuất *</label>
                    <span className="text-xs font-bold text-emerald-600">
                      Tồn khả dụng: {selectedItem.quantity_available}
                    </span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={selectedItem.quantity_available}
                    value={quantityToExport}
                    onChange={(e) => setQuantityToExport(parseInt(e.target.value) || 0)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all font-bold text-lg"
                  />
                </div>
                
                <div className="sm:col-span-2 border-t border-emerald-100 pt-4 mt-2">
                  <h3 className="text-xs font-bold uppercase text-emerald-700 mb-3">Thông tin Đơn giao hàng (Tuỳ chọn)</h3>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tên Khách hàng</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Số Điện thoại</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="09..."
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Địa chỉ giao hàng</label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="123 ABC..."
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Ghi chú (Vận hành)</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Giao đúng giờ..."
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
              >
                <Truck size={18} />
                {submitting ? 'Đang xử lý...' : 'Xác nhận xuất & Tạo đơn giao hàng'}
              </button>
            </form>
          )}
        </div>
    </PageLayout>
  );
}
