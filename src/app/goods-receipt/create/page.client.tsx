'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PackageCheck, ArrowLeft, Plus, Trash2, Search, Calendar, Building, Warehouse, User, FileText } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import type { PurchaseOrder } from '@/types';

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
  const [receivedBy, setReceivedBy] = useState('');

  // Get current user
  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const user = JSON.parse(raw);
        setReceivedBy(user.email?.split('@')[0] || user.email || 'unknown');
      }
    } catch { /* ignore */ }
  }, []);

  const handleSearchPO = (code: string) => {
    let searchCode = code.trim();
    if (searchCode.includes('/scan/po/')) {
      const parts = searchCode.split('/scan/po/');
      searchCode = parts[parts.length - 1];
    }
    if (!searchCode) { setError('Vui lòng nhập mã PO.'); return; }
    const found = purchaseOrders.find(
      (p) => p.po_code.toLowerCase() === searchCode.toLowerCase() || p.id === searchCode
    );
    if (found) {
      setPoId(found.id);
      setSearchInput(found.po_code);
      setError('');
    } else {
      setError(`Không tìm thấy PO "${searchCode}".`);
      setPoId('');
    }
  };

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return;
    const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

    Promise.all([
      fetch(`${supabaseUrl}/rest/v1/dim_kho?select=id,ma_kho,ten_kho&order=ten_kho.asc`, { headers }).then(r => r.json()),
      fetch('/api/purchase-orders').then(r => r.json()),
    ]).then(([khoData, poRes]) => {
      setWarehouses(Array.isArray(khoData) ? khoData : []);
      const allPOs = poRes.data || [];
      setPurchaseOrders(allPOs);

      const qPoId = searchParams.get('po_id');
      const qPoCode = searchParams.get('po_code');
      const qWarehouseId = searchParams.get('warehouse_id');
      if (qPoId) { setPoId(qPoId); if (qPoCode) setSearchInput(qPoCode); }
      if (qWarehouseId) setWarehouseId(qWarehouseId);
    }).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When PO is selected, auto-fill items
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
        if (po?.warehouse_id) setWarehouseId(po.warehouse_id);
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

    if (!warehouseId) { setError('Vui lòng chọn kho nhận.'); setSubmitting(false); return; }

    let email = 'unknown';
    try { const raw = localStorage.getItem('auth_user'); if (raw) email = JSON.parse(raw).email || 'unknown'; } catch { /* */ }

    const validItems = items.filter((item) => item.product_code.trim() && item.product_name.trim());
    if (validItems.length === 0) { setError('Cần ít nhất 1 sản phẩm.'); setSubmitting(false); return; }

    try {
      const res = await fetch('/api/goods-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          po_id: poId || null, warehouse_id: warehouseId,
          note: note || null, received_by: email, items: validItems,
        }),
      });
      const result = await res.json();
      if (!res.ok) { setError(result.error || 'Có lỗi xảy ra.'); return; }

      const qrCount = result.qr_codes?.length || 0;
      setSuccessMsg(`Nhập kho hoàn tất! Mã: ${result.gr_code || ''}. ${qrCount > 0 ? `${qrCount} mã QR đã tạo.` : ''}`);
      setTimeout(() => {
        router.push(result.data?.id ? `/goods-receipt/${result.data.id}` : '/goods-receipt');
      }, 1500);
    } catch { setError('Lỗi kết nối server.'); } finally { setSubmitting(false); }
  };

  const selectedPo = purchaseOrders.find(p => p.id === poId);
  const selectedKho = warehouses.find(w => w.id === warehouseId);

  return (
    <PageLayout title="Tạo phiếu nhập kho" icon={<PackageCheck size={16} className="text-orange-500" />}>
      <div className="max-w-2xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <button
          onClick={() => router.push('/goods-receipt')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Danh sách phiếu nhập
        </button>

        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-4">Tạo phiếu nhập kho</h1>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── PO Search (compact) ── */}
          {!poId ? (
            <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3 space-y-2">
              <label className="block text-xs font-bold text-gray-600">Liên kết mã PO</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchPO(searchInput); } }}
                  placeholder="Nhập mã PO..."
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
                <button
                  type="button"
                  onClick={() => handleSearchPO(searchInput)}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-orange-500 text-white rounded-lg font-bold text-xs hover:bg-orange-600 transition-all"
                >
                  <Search size={14} />
                  Tìm
                </button>
              </div>
              {purchaseOrders.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {purchaseOrders.filter(p => p.status === 'confirmed').slice(0, 6).map((po) => (
                    <button
                      key={po.id}
                      type="button"
                      onClick={() => { setPoId(po.id); setSearchInput(po.po_code); setError(''); }}
                      className="px-2 py-1 rounded-md bg-white border border-gray-200 text-[11px] font-semibold text-gray-600 hover:border-orange-300 hover:text-orange-600 transition-all"
                    >
                      {po.po_code}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ── Info summary when PO is linked ── */
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-orange-50 border-b border-orange-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600">Thông tin phiếu nhập</span>
                <button
                  type="button"
                  onClick={() => { setPoId(''); setSearchInput(''); setItems([{ product_code: '', product_name: '', expected_qty: 0, received_qty: 0, note: '' }]); }}
                  className="text-[11px] text-orange-500 font-bold hover:text-orange-700"
                >
                  Đổi PO
                </button>
              </div>

              {/* Info rows */}
              <div className="divide-y divide-gray-50">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-gray-500 flex items-center gap-2"><FileText size={13} className="text-orange-400" /> Mã PO</span>
                  <span className="font-bold text-orange-700 font-mono text-sm">{selectedPo?.po_code || searchInput}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-gray-500 flex items-center gap-2"><Building size={13} className="text-gray-400" /> Nhà cung cấp</span>
                  <span className="font-semibold text-gray-800 text-sm text-right max-w-[55%]">{selectedPo?.supplier?.name || '—'}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-gray-500 flex items-center gap-2"><Warehouse size={13} className="text-gray-400" /> Kho nhận</span>
                  <span className="font-semibold text-gray-800 text-sm">{selectedKho?.ten_kho || '—'}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-gray-500 flex items-center gap-2"><Calendar size={13} className="text-gray-400" /> Ngày nhập</span>
                  <span className="font-semibold text-gray-800 text-sm">{new Date().toLocaleDateString('vi-VN')}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-gray-500 flex items-center gap-2"><User size={13} className="text-gray-400" /> Người nhập</span>
                  <span className="font-semibold text-gray-800 text-sm">{receivedBy || '—'}</span>
                </div>
              </div>

              {/* Note field */}
              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú (không bắt buộc)..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-200"
                />
              </div>
            </div>
          )}

          {/* Warehouse selector — only when no PO linked */}
          {!poId && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Kho nhận *</label>
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    required
                    className="w-full px-2.5 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  >
                    <option value="">— Chọn kho —</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.ten_kho} ({w.ma_kho})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Ghi chú</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ghi chú phiếu nhập..."
                    className="w-full px-2.5 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Items — mobile-friendly cards ── */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Hàng hóa ({items.length} SP)
              </h2>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-600 rounded-lg text-xs font-semibold hover:bg-orange-100 transition-colors"
              >
                <Plus size={12} />
                Thêm
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="p-3 rounded-lg bg-gray-50 border border-gray-100 space-y-2">
                  {/* Row 1: Product info */}
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0">
                      <p className="text-[10px] font-bold uppercase text-gray-400">Mã SP</p>
                      <p className="font-mono text-sm font-bold text-orange-700">{item.product_code || '—'}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase text-gray-400">Tên SP</p>
                      <p className="text-sm text-gray-800 font-medium leading-snug break-words">{item.product_name || '—'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      disabled={items.length <= 1}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-20 transition-colors flex-shrink-0 mt-2"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Row 2: Quantities */}
                  <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">SL yêu cầu</label>
                      {poId ? (
                        <div className="px-2 py-1.5 rounded-md border border-orange-200 bg-orange-50 text-sm font-bold text-center text-orange-800">{item.expected_qty}</div>
                      ) : (
                        <input
                          type="number" min={0} value={item.expected_qty}
                          onChange={(e) => updateItem(i, 'expected_qty', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 rounded-md border border-gray-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-200"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">SL nhận thực tế</label>
                      <input
                        type="number" min={0} value={item.received_qty}
                        onChange={(e) => updateItem(i, 'received_qty', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 rounded-md border border-gray-200 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-orange-200"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="px-3 py-2.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
              ✅ {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 disabled:opacity-50 shadow-lg shadow-orange-200 transition-all"
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
