'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PackageCheck, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import type { Warehouse, PurchaseOrder } from '@/types';
import dynamic from 'next/dynamic';
import { ScanLine, Keyboard, Search } from 'lucide-react';

const Scanner = dynamic(() => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner), {
  ssr: false,
});


interface ReceiptItem {
  product_code: string;
  product_name: string;
  expected_qty: number;
  received_qty: number;
  note: string;
}

export default function CreateGoodsReceiptPage() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [poId, setPoId] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<ReceiptItem[]>([
    { product_code: '', product_name: '', expected_qty: 0, received_qty: 0, note: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [searchInput, setSearchInput] = useState('');
  const [inputMode, setInputMode] = useState<'type' | 'scan'>('type');

  const handleSearchPO = (code: string) => {
    const found = purchaseOrders.find(
      (p) => p.po_code.toLowerCase() === code.toLowerCase() || p.id === code
    );
    if (found) {
      setPoId(found.id);
      setSearchInput(found.po_code);
      setError('');
    } else {
      setError(`Không tìm thấy PO với mã "${code}" hoặc PO chưa được duyệt.`);
      setPoId('');
    }
  };

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return;
    const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

    Promise.all([
      fetch(`${supabaseUrl}/rest/v1/warehouses?is_active=eq.true&select=*`, { headers }).then(r => r.json()),
      fetch('/api/purchase-orders').then(r => r.json()),
    ]).then(([w, poRes]) => {
      setWarehouses(Array.isArray(w) ? w : []);
      const approvedPOs = (poRes.data || []).filter((po: PurchaseOrder) =>
        po.status === 'approved' || po.status === 'submitted'
      );
      setPurchaseOrders(approvedPOs);
    }).catch(console.error);
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

    let receivedBy = 'unknown';
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) receivedBy = JSON.parse(raw).email || 'unknown';
    } catch { /* ignore */ }

    const validItems = items.filter((item) => item.product_code.trim() && item.product_name.trim());

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
        setError(result.error || 'Có lỗi xảy ra.');
        return;
      }

      router.push(`/goods-receipt/${result.data.id}`);
    } catch (err) {
      setError('Lỗi kết nối server.');
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
                  <div className="mt-3 text-sm text-green-700 font-medium">
                    Đã liên kết thành công với PO: {purchaseOrders.find(p => p.id === poId)?.po_code}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Kho nhận *</label>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all"
                >
                  <option value="">— Chọn kho —</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
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
                    <input
                      type="number"
                      min={0}
                      value={item.expected_qty}
                      onChange={(e) => updateItem(i, 'expected_qty', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                    />
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

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 disabled:opacity-50 shadow-lg shadow-orange-200 transition-all"
          >
            {submitting ? 'Đang tạo...' : 'Tạo phiếu nhập kho'}
          </button>
        </form>
      </div>
    </PageLayout>
  );
}
