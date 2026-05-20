'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ClipboardCheck, ArrowLeft, Barcode, CheckCircle2, Save, XCircle } from 'lucide-react';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';

interface StocktakeItem {
  id: string;
  product_code: string;
  product_name: string;
  system_quantity: number;
  actual_quantity: number;
  difference: number;
}

export default function StocktakeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [stocktake, setStocktake] = useState<any>(null);
  const [items, setItems] = useState<StocktakeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanValue, setScanValue] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/stocktakes/${id}`);
      const json = await res.json();
      if (json.success) {
        setStocktake(json.data);
        setItems(json.items || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanValue.trim()) return;

    const code = scanValue.trim();
    setScanValue('');
    setScanning(true);
    setScanMessage(null);

    try {
      const res = await fetch(`/api/stocktakes/${id}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_code: code, quantity: 1 })
      });
      const json = await res.json();
      
      if (json.success) {
        // play success sound
        new Audio('/sounds/success.mp3').play().catch(() => {});
        setScanMessage({ type: 'success', text: `Quét thành công: ${code}` });
        // Refresh items smoothly
        fetchDetail();
      } else {
        // play error sound
        new Audio('/sounds/error.mp3').play().catch(() => {});
        setScanMessage({ type: 'error', text: json.error || 'Lỗi khi quét mã' });
      }
    } catch (err) {
      setScanMessage({ type: 'error', text: 'Mất kết nối mạng' });
    } finally {
      setScanning(false);
      inputRef.current?.focus();
    }
  };

  const completeStocktake = async () => {
    if (!confirm("Sau khi chốt, bạn sẽ không thể quét thêm mã vào phiếu này. Xác nhận hoàn thành?")) return;
    try {
      const res = await fetch(`/api/stocktakes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
      const json = await res.json();
      if (json.success) {
        alert("Đã chốt phiếu kiểm kho thành công!");
        fetchDetail();
      } else {
        alert("Lỗi: " + json.error);
      }
    } catch (err) {
      alert("Lỗi kết nối");
    }
  };

  if (loading && !stocktake) {
    return (
      <PageLayout title="Chi tiết Kiểm kho" icon={<ClipboardCheck size={15} />}>
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-pink-200 border-t-pink-600"></div>
        </div>
      </PageLayout>
    );
  }

  if (!stocktake) {
    return (
      <PageLayout title="Lỗi" icon={<XCircle size={15} />}>
        <div className="text-center py-20">Không tìm thấy phiếu kiểm kho.</div>
      </PageLayout>
    );
  }

  const isCompleted = stocktake.status === 'completed';

  return (
    <PageLayout title={`Phiếu: ${stocktake.stocktake_code}`} icon={<ClipboardCheck size={15} className="text-pink-500" />}>
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
          <Link
            href="/stocktake"
            className="flex flex-shrink-0 items-center justify-center w-10 h-10 rounded-full bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 transition-colors shadow-sm"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 break-all">{stocktake.stocktake_code}</h1>
              <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {isCompleted ? 'Đã chốt' : 'Đang kiểm'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Kho: <strong className="text-gray-700">{stocktake.warehouse_name}</strong> • Ngày: {new Date(stocktake.stocktake_date).toLocaleDateString('vi-VN')}</p>
          </div>
        </div>

        {!isCompleted && (
          <button
            onClick={completeStocktake}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] w-full sm:w-auto bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-md transition-all"
          >
            <Save size={18} />
            Chốt số lượng
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Col: Scanner (if not completed) */}
        {!isCompleted && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 lg:sticky lg:top-6">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <Barcode size={20} className="text-pink-500" />
                Quét mã sản phẩm
              </h2>
              
              <form onSubmit={handleScan}>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={scanValue}
                    onChange={(e) => setScanValue(e.target.value)}
                    placeholder="Nhập hoặc quét mã vạch..."
                    disabled={scanning}
                    className="w-full pl-4 pr-12 py-3 sm:py-4 min-h-[48px] bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-pink-500 focus:ring-0 text-base sm:text-lg font-mono placeholder:font-sans transition-colors"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {scanning && <div className="animate-spin rounded-full h-5 w-5 border-2 border-pink-200 border-t-pink-600"></div>}
                  </div>
                </div>
                {/* Ẩn nút submit, form sẽ trigger khi Enter (máy quét luôn gửi Enter cuối mã) */}
                <button type="submit" className="hidden" />
              </form>

              {scanMessage && (
                <div className={`mt-3 sm:mt-4 p-3 sm:p-4 rounded-xl flex items-start gap-3 ${scanMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                  {scanMessage.type === 'success' ? <CheckCircle2 size={20} className="shrink-0 mt-0.5" /> : <XCircle size={20} className="shrink-0 mt-0.5" />}
                  <span className="text-sm font-medium">{scanMessage.text}</span>
                </div>
              )}

              <div className="mt-4 sm:mt-6 text-xs sm:text-sm text-gray-500 bg-gray-50 p-3 sm:p-4 rounded-xl">
                <strong>Hướng dẫn:</strong> Kết nối máy quét mã vạch qua Bluetooth/USB. Để con trỏ vào ô nhập và tiến hành quét liên tục. Hệ thống sẽ tự động cộng dồn số lượng.
              </div>
            </div>
          </div>
        )}

        {/* Right Col: Items List */}
        <div className={isCompleted ? "lg:col-span-3" : "lg:col-span-2"}>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base">Chi tiết sản phẩm đã kiểm</h3>
              <span className="text-xs sm:text-sm font-bold bg-pink-100 text-pink-700 px-2 sm:px-3 py-1 rounded-full whitespace-nowrap">
                {items.length} mặt hàng
              </span>
            </div>

            {/* Mobile: card list */}
            <div className="sm:hidden divide-y divide-gray-100">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-gray-500 text-sm">Chưa có sản phẩm nào được quét.</p>
              ) : items.map((item) => (
                <div key={item.id} className="p-3">
                  <div className="font-bold text-gray-900 text-sm break-words">{item.product_name}</div>
                  <div className="font-mono text-xs text-pink-600 mt-1 break-all">{item.product_code}</div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-gray-50 rounded-lg px-2 py-1.5">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Tồn HT</p>
                      <p className="font-mono font-bold text-gray-700">{item.system_quantity}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg px-2 py-1.5">
                      <p className="text-[10px] font-bold text-blue-400 uppercase">Thực tế</p>
                      <p className="font-mono font-bold text-blue-700">{item.actual_quantity}</p>
                    </div>
                    <div className={`rounded-lg px-2 py-1.5 ${
                      item.difference === 0 ? 'bg-gray-100' :
                      item.difference > 0 ? 'bg-emerald-50' : 'bg-red-50'
                    }`}>
                      <p className={`text-[10px] font-bold uppercase ${
                        item.difference === 0 ? 'text-gray-400' :
                        item.difference > 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>Lệch</p>
                      <p className={`font-mono font-bold ${
                        item.difference === 0 ? 'text-gray-600' :
                        item.difference > 0 ? 'text-emerald-700' : 'text-red-700'
                      }`}>{item.difference > 0 ? '+' : ''}{item.difference}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-gray-500">
                    <th className="px-6 py-4 font-semibold">Sản phẩm</th>
                    <th className="px-6 py-4 font-semibold text-center w-24">Tồn HT</th>
                    <th className="px-6 py-4 font-semibold text-center w-24">Thực tế</th>
                    <th className="px-6 py-4 font-semibold text-center w-24">Lệch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                        Chưa có sản phẩm nào được quét.
                      </td>
                    </tr>
                  ) : items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{item.product_name}</div>
                        <div className="font-mono text-xs text-pink-600 mt-1">{item.product_code}</div>
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-medium text-gray-500">
                        {item.system_quantity}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg font-mono">
                          {item.actual_quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-2 py-1 rounded font-bold font-mono text-xs ${
                          item.difference === 0 ? 'bg-gray-100 text-gray-600' :
                          item.difference > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {item.difference > 0 ? '+' : ''}{item.difference}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
