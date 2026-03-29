'use client';


import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PackageCheck, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import type { PurchaseOrder } from '@/types';
import nextDynamic from 'next/dynamic';
import { ScanLine, Keyboard, Search } from 'lucide-react';

const Scanner = nextDynamic(() => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner), {
  ssr: false,
});

interface DimKhoItem {
  id: string;
  ma_kho: string;
  ten_kho: string;
}

interface ReceiptItem {
  product_code: string;
  product_name: string;
  expected_qty: number;
  received_qty: number;
  note: string;
}

function CreateGoodsReceiptForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [warehouses, setWarehouses] = useState<DimKhoItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [poId, setPoId] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<ReceiptItem[]>([
    { product_code: '', product_name: '', expected_qty: 0, received_qty: 0, note: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [searchInput, setSearchInput] = useState('');
  const [inputMode, setInputMode] = useState<'type' | 'scan'>('type');

  const handleSearchPO = (code: string) => {
    let searchCode = code.trim();
    
    // Hỗ trợ quét URL từ mã QR (ví dụ: http://localhost:3000/scan/po/uuid...)
    if (searchCode.includes('/scan/po/')) {
      const parts = searchCode.split('/scan/po/');
      searchCode = parts[parts.length - 1];
    }

    if (!searchCode) {
      setError('Vui lòng nhập mã PO.');
      return;
    }
    const found = purchaseOrders.find(
      (p) => p.po_code.toLowerCase() === searchCode.toLowerCase() || p.id === searchCode
    );
    if (found) {
      setPoId(found.id);
      setSearchInput(found.po_code);
      setError('');
    } else {
      setError(`Không tìm thấy PO với từ khóa "${searchCode}".`);
      setPoId('');
    }
  };

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return;
    const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

    Promise.all([
      // Fetch warehouses from dim_kho instead of warehouses table
      fetch(`${supabaseUrl}/rest/v1/dim_kho?select=id,ma_kho,ten_kho&order=ten_kho.asc`, { headers }).then(r => r.json()),
      fetch('/api/purchase-orders').then(r => r.json()),
    ]).then(([khoData, poRes]) => {
      setWarehouses(Array.isArray(khoData) ? khoData : []);
      // Accept ALL POs (no status filtering)
      const allPOs = poRes.data || [];
      setPurchaseOrders(allPOs);

      // Pre-fill from URL query params (coming from PO Detail page)
      const qPoId = searchParams.get('po_id');
      const qPoCode = searchParams.get('po_code');
      const qWarehouseId = searchParams.get('warehouse_id');
      if (qPoId) {
        setPoId(qPoId);
        if (qPoCode) setSearchInput(qPoCode);
      }
      if (qWarehouseId) setWarehouseId(qWarehouseId);
    }).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When PO is selected, auto-fill items from PO
  useEffect(() => {
    if (!poId) return;
    fetch(`/api/purchase-orders/${poId}`)
      .then((r) => r.json())
      .then((res) => {
        const po = res.data;
        if (po?.items?.length) {
          setItems(po.items.map((item: { product_code: string; product_name: string; quantity: number }) => ({
            product_code: item.product_code,
            product_name: item.product_name,
            expected_qty: item.quantity,
            received_qty: item.quantity,
            note: '',
          })));
        }
        if (po?.warehouse_id) {
          setWarehouseId(po.warehouse_id);
        }
      })
      .catch(console.error);
  }, [poId]);

  const addItem = () => {
    setItems([...items, { product_code: '', product_name: '', expected_qty: 0, received_qty: 0, note: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ReceiptItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    if (!warehouseId) {
      setError('Vui lòng chọn kho nhận.');
      setSubmitting(false);
      return;
    }

    let receivedBy = 'unknown';
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) receivedBy = JSON.parse(raw).email || 'unknown';
    } catch { /* ignore */ }

    const validItems = items.filter((item) => item.product_code.trim() && item.product_name.trim());

    if (validItems.length === 0) {
      setError('Vui lòng thêm ít nhất 1 sản phẩm có mã SP và tên SP.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/goods-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          po_id: poId || null,
          warehouse_id: warehouseId,
          note: note || null,
          received_by: receivedBy,
          items: validItems,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Có lỗi xảy ra khi tạo phiếu.');
        return;
      }

      const qrCount = result.qr_codes?.length || 0;
      setSuccessMsg(`Nhập kho hoàn tất! Mã: ${result.gr_code || ''}. ${qrCount > 0 ? `${qrCount} mã QR lô hàng đã được tạo.` : ''}`);
      // Navigate after a short delay so user sees the success message
      setTimeout(() => {
        if (result.data?.id) {
          router.push(`/goods-receipt/${result.data.id}`);
        } else {
          router.push('/goods-receipt');
        }
      }, 1500);
    } catch (err) {
      setError('Lỗi kết nối server. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout title="Tạo phiếu nhập kho" icon={<PackageCheck size={16} className="text-orange-500" />}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <button
          onClick={() => router.push('/goods-receipt')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Danh sách phiếu nhập
        </button>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Tạo phiếu nhập kho</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Thông tin chung</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Liên kết mã PO (Quét QR hoặc nhập mã)</label>
                
                <div className="flex rounded-xl border border-gray-200 bg-white p-1 gap-1 mb-3">
                  <button
                    type="button"
                    onClick={() => setInputMode('type')}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-all ${
                      inputMode === 'type'
                        ? 'bg-orange-100 text-orange-700 shadow-sm'
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
                        ? 'bg-orange-100 text-orange-700 shadow-sm'
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
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchPO(searchInput);
                        }
                      }}
                      placeholder="Nhập mã PO (vd: PO-123)..."
                      className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleSearchPO(searchInput)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 shadow-md transition-all"
                    >
                      <Search size={16} />
                      Tìm PO
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl overflow-hidden border-2 border-orange-200 bg-black relative aspect-[4/3] w-full max-w-sm mx-auto flex items-center justify-center">
                    <Scanner
                      onScan={(result) => {
                        if (result && result.length > 0 && result[0].rawValue) {
                          setSearchInput(result[0].rawValue);
                          setInputMode('type');
                          handleSearchPO(result[0].rawValue);
                        }
                      }}
                      formats={['qr_code']}
                      components={{ onOff: true, torch: true, zoom: true, finder: true }}
                    />
                  </div>
                )}
                {poId && (
                  <div className="mt-3 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 font-medium">
                    ✅ Đã liên kết thành công với PO: <strong>{purchaseOrders.find(p => p.id === poId)?.po_code || poId}</strong>
                    {' '}
                    <span className="text-green-500 text-xs">
                      ({purchaseOrders.find(p => p.id === poId)?.status || ''})
                    </span>
                  </div>
                )}

                {/* Available PO list for quick selection */}
                {!poId && purchaseOrders.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-400 mb-1.5">Chọn nhanh PO có sẵn:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {purchaseOrders.slice(0, 8).map((po) => (
                        <button
                          key={po.id}
                          type="button"
                          onClick={() => {
                            setPoId(po.id);
                            setSearchInput(po.po_code);
                            setError('');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-600 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 transition-all"
                        >
                          {po.po_code}
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            po.status === 'confirmed' ? 'bg-purple-100 text-purple-700' :
                            po.status === 'received' ? 'bg-emerald-100 text-emerald-700' :
                            po.status === 'closed' ? 'bg-gray-100 text-gray-500' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {po.status === 'confirmed' ? 'Xác nhận' :
                             po.status === 'received' ? 'Đã nhận' :
                             po.status === 'closed' ? 'Hoàn thành' :
                             po.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Kho nhận *</label>
                {poId && warehouseId ? (
                  <div className="w-full px-3 py-2.5 rounded-xl border border-orange-200 bg-orange-50 text-sm font-semibold text-orange-800 flex items-center gap-2 cursor-not-allowed select-none">
                    <span className="text-orange-500">🔒</span>
                    {warehouses.find(w => w.id === warehouseId)?.ten_kho || warehouseId}
                  </div>
                ) : (
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all"
                  >
                    <option value="">— Chọn kho —</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.ten_kho} ({w.ma_kho})</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ghi chú</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú phiếu nhập..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Hàng hóa</h2>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-semibold hover:bg-orange-100 transition-colors"
              >
                <Plus size={14} />
                Thêm
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="col-span-3">
                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Mã SP</label>
                    <input
                      type="text"
                      value={item.product_code}
                      onChange={(e) => updateItem(i, 'product_code', e.target.value)}
                      className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Tên SP</label>
                    <input
                      type="text"
                      value={item.product_name}
                      onChange={(e) => updateItem(i, 'product_name', e.target.value)}
                      className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">SL yêu cầu</label>
                    {poId ? (
                      <div className="w-full px-2 py-2 rounded-lg border border-orange-200 bg-orange-50 text-sm font-bold text-center text-orange-800 cursor-not-allowed">{item.expected_qty}</div>
                    ) : (
                      <input
                        type="number"
                        min={0}
                        value={item.expected_qty}
                        onChange={(e) => updateItem(i, 'expected_qty', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                      />
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">SL nhận</label>
                    <input
                        type="number"
                        min={0}
                        value={item.received_qty}
                        onChange={(e) => updateItem(i, 'received_qty', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                      />
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      disabled={items.length <= 1}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
              ✅ {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 disabled:opacity-50 shadow-lg shadow-orange-200 transition-all"
          >
            {submitting ? 'Đang xử lý...' : 'Xác nhận nhập kho'}
          </button>
        </form>
      </div>
    </PageLayout>
  );
}

export default function CreateGoodsReceiptPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Đang tải...</div>}>
      <CreateGoodsReceiptForm />
    </Suspense>
  );
}
