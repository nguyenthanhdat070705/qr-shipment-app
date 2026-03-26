'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Search, ScanLine, Keyboard, ArrowLeft } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { getWarehouseFilter } from '@/config/roles.config';
import dynamic from 'next/dynamic';

const Scanner = dynamic(() => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner), {
  ssr: false,
});

interface QRCodeData {
  id: string;
  qr_code: string;
  reference_id: string;
  quantity: number;
  warehouse: string;
  warehouse_name?: string;
}

export default function GoodsIssuePage() {
  const router = useRouter();
  const [inputMode, setInputMode] = useState<'type' | 'scan'>('type');
  const [searchInput, setSearchInput] = useState('');
  
  const [scannedQR, setScannedQR] = useState<QRCodeData | null>(null);
  const [error, setError] = useState('');
  
  // Delivery form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [note, setNote] = useState('');
  const [quantityToExport, setQuantityToExport] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Search logic
  const handleSearchQR = async (code: string) => {
    setError('');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return;

    try {
      // Find qr_code
      const res = await fetch(`${supabaseUrl}/rest/v1/qr_codes?qr_code=eq.${encodeURIComponent(code)}&status=eq.active&select=*,warehouses!warehouse(name)`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
      });
      const data = await res.json();

      if (data && data.length > 0) {
        const qr = data[0];
        const qrName = qr.warehouses?.name || qr.warehouse;
        
        let allowed = true;
        try {
          const auth = localStorage.getItem('auth_user');
          if (auth) {
            const user = JSON.parse(auth);
            const filter = getWarehouseFilter(user.email);
            if (filter && !qrName?.includes(filter)) {
              allowed = false;
            }
          }
        } catch(e) {}

        if (!allowed) {
          setError(`Lỗi: Bạn không có quyền xuất kho từ "${qrName}".`);
          setScannedQR(null);
          return;
        }

        setScannedQR({
          id: qr.id,
          qr_code: qr.qr_code,
          reference_id: qr.reference_id,
          quantity: qr.quantity,
          warehouse: qr.warehouse,
          warehouse_name: qrName
        });
        setQuantityToExport(qr.quantity);
        setSearchInput(qr.qr_code);
      } else {
        setError(`Mã Đám "${code}" không tồn tại hoặc đã hết/được sử dụng.`);
        setScannedQR(null);
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối cơ sở dữ liệu.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedQR) return;
    if (quantityToExport <= 0 || quantityToExport > scannedQR.quantity) {
      setError(`Số lượng xuất không hợp lệ (Tồn: ${scannedQR.quantity})`);
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
          qr_code: scannedQR.qr_code,
          qr_id: scannedQR.id,
          product_code: scannedQR.reference_id,
          quantity: quantityToExport,
          warehouse_id: scannedQR.warehouse,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_address: customerAddress,
          note,
          created_by: createdBy
        })
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Có lỗi xảy ra.');
        return;
      }

      // Success
      router.push(`/operations/${result.data.id}`);
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
          <p className="text-sm text-gray-500 mt-0.5">Quét QR hoặc nhập mã Đám để ghi nhận hàng ra khỏi kho</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Scanner Card */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Bước 1: Quét mã lô hàng (Mã Đám)</h2>
            
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
                  placeholder="Nhập mã QR lô (vd: INV-2023...)"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
                <button
                  type="button"
                  onClick={() => handleSearchQR(searchInput.trim())}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 shadow-md transition-all"
                >
                  <Search size={16} />
                  Tìm lô
                </button>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden border-2 border-emerald-200 bg-black relative aspect-[4/3] w-full max-w-sm mx-auto flex items-center justify-center">
                <Scanner
                  onScan={(result) => {
                    if (result && result.length > 0 && result[0].rawValue) {
                      setSearchInput(result[0].rawValue);
                      setInputMode('type');
                      handleSearchQR(result[0].rawValue);
                    }
                  }}
                  formats={['qr_code']}
                  components={{ onOff: true, torch: true, zoom: true, finder: true }}
                />
              </div>
            )}
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Form */}
          {scannedQR && (
            <form onSubmit={handleSubmit} className="rounded-2xl border border-emerald-200 bg-emerald-50 shadow-sm p-6 space-y-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-800">Bước 2: Xác nhận thông tin xuất</h2>
              
              <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-emerald-100">
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">Mã lô (Đám)</p>
                  <p className="text-sm font-bold font-mono text-emerald-600">{scannedQR.qr_code}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">Mã Sản phẩm</p>
                  <p className="text-sm font-bold text-gray-900">{scannedQR.reference_id}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">Kho xuất</p>
                  <p className="text-sm font-bold text-gray-900">{scannedQR.warehouse_name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">Tồn trong lô</p>
                  <p className="text-sm font-bold text-emerald-600">{scannedQR.quantity}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Số lượng xuất *</label>
                  <input
                    type="number"
                    min={1}
                    max={scannedQR.quantity}
                    value={quantityToExport}
                    onChange={(e) => setQuantityToExport(parseInt(e.target.value) || 0)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all font-bold"
                  />
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
