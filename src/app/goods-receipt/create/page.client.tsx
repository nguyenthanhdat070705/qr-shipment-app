'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PackageCheck, ArrowLeft, Plus, Trash2, Search, Calendar, Building, Warehouse, User, FileText, ClipboardCheck, AlertTriangle, CheckCircle2, X, ClipboardList } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import type { PurchaseOrder } from '@/types';

interface DimKhoItem {
  id: string;
  ma_kho: string;
  ten_kho: string;
}

interface DimHom {
  id: string;
  ma_hom: string;
  ten_hom: string;
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
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const isTemporary = searchParams.get('temporary') === 'true';

  // Product autocomplete
  const [allProducts, setAllProducts] = useState<DimHom[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState<number | null>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);

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
      fetch(`${supabaseUrl}/rest/v1/dim_hom?select=id,ma_hom,ten_hom&is_active=eq.true&order=ma_hom`, { headers }).then(r => r.json()),
      fetch('/api/purchase-orders').then(r => r.json()),
    ]).then(([khoData, homData, poRes]) => {
      setWarehouses(Array.isArray(khoData) ? khoData : []);
      setAllProducts(Array.isArray(homData) ? homData : []);
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

  const handleOpenCheck = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!warehouseId) { setError('Vui lòng chọn kho nhận.'); return; }
    const validItems = items.filter((item) => item.product_code.trim() && item.product_name.trim());
    if (validItems.length === 0) { setError('Cần ít nhất 1 sản phẩm.'); return; }
    // For temporary mode, items must have received_qty > 0
    if (isTemporary) {
      const hasQty = validItems.some(i => i.received_qty > 0);
      if (!hasQty) { setError('Cần nhập số lượng thực tế đã nhận.'); return; }
    }
    setConfirmed(false);
    setShowCheckModal(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    let email = 'unknown';
    try { const raw = localStorage.getItem('auth_user'); if (raw) email = JSON.parse(raw).email || 'unknown'; } catch { /* */ }

    const validItems = items.filter((item) => item.product_code.trim() && item.product_name.trim());

    try {
      const res = await fetch('/api/goods-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          po_id: isTemporary ? null : (poId || null),
          warehouse_id: warehouseId,
          note: note || null,
          received_by: email,
          items: validItems,
          is_temporary: isTemporary,
        }),
      });
      const result = await res.json();
      if (!res.ok) { setShowCheckModal(false); setError(result.error || 'Có lỗi xảy ra.'); return; }

      setShowCheckModal(false);
      if (result.is_temporary) {
        setSuccessMsg(`Phiếu nhập tạm đã tạo! Mã: ${result.gr_code || ''}. Đang thông báo tới bộ phận thu mua để tạo PO.`);
      } else {
        const qrCount = result.qr_codes?.length || 0;
        setSuccessMsg(`Nhập kho hoàn tất! Mã: ${result.gr_code || ''}. ${qrCount > 0 ? `${qrCount} mã QR đã tạo.` : ''}`);
      }
      setTimeout(() => {
        router.push(result.data?.id ? `/goods-receipt/${result.data.id}` : '/goods-receipt');
      }, 1800);
    } catch { setError('Lỗi kết nối server.'); } finally { setSubmitting(false); }
  };

  const selectedPo = purchaseOrders.find(p => p.id === poId);
  const selectedKho = warehouses.find(w => w.id === warehouseId);

  return (
    <PageLayout title={isTemporary ? 'Tạo phiếu nhập tạm' : 'Tạo phiếu nhập kho'} icon={isTemporary ? <ClipboardList size={16} className="text-amber-500" /> : <PackageCheck size={16} className="text-orange-500" />}>
      <div className="max-w-2xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <button
          onClick={() => router.push('/goods-receipt')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Danh sách phiếu nhập
        </button>

        {isTemporary && (
          <div className="mb-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 flex-shrink-0">
                <ClipboardList size={20} className="text-amber-600" />
              </div>
              <div>
                <h2 className="font-extrabold text-amber-900 text-base">Phiếu nhập hàng tạm</h2>
                <p className="text-xs text-amber-700 mt-0.5">Hàng đã đến nhưng chưa có PO. Phiếu này sẽ <strong>không cộng tồn kho</strong> — thông báo sẽ gửi đến thu mua để tạo PO.</p>
              </div>
            </div>
          </div>
        )}

        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-4">{isTemporary ? 'Nhập hàng tạm (chưa có PO)' : 'Tạo phiếu nhập kho'}</h1>

        <form onSubmit={handleOpenCheck} className="space-y-4">

          {/* ── PO Search (compact) ── */}
          {!isTemporary && !poId ? (
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

          {/* Warehouse selector — when temporary or no PO linked */}
          {(isTemporary || !poId) && (
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
              {items.map((item, i) => {
                // Filter suggestions based on what user typed
                const q = (item.product_code + ' ' + item.product_name).toLowerCase().trim();
                const suggestions = activeSuggestion === i && q
                  ? allProducts.filter(p =>
                      p.ma_hom.toLowerCase().includes(q) ||
                      p.ten_hom.toLowerCase().includes(q) ||
                      (item.product_code && p.ma_hom.toLowerCase().includes(item.product_code.toLowerCase())) ||
                      (item.product_name && p.ten_hom.toLowerCase().includes(item.product_name.toLowerCase()))
                    ).slice(0, 8)
                  : [];

                return (
                <div key={i} className="p-3 rounded-lg bg-gray-50 border border-gray-100 space-y-2">
                  {/* Row 1: Product info with autocomplete */}
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0" style={{ minWidth: '100px' }}>
                      <p className="text-[10px] font-bold uppercase text-gray-400 mb-0.5">Mã SP</p>
                      <input
                        type="text"
                        value={item.product_code}
                        onChange={(e) => { updateItem(i, 'product_code', e.target.value); setActiveSuggestion(i); }}
                        onFocus={() => setActiveSuggestion(i)}
                        placeholder="Nhập mã..."
                        className="w-full px-2 py-1.5 rounded-md border border-gray-200 bg-white text-sm font-mono font-bold text-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 placeholder:text-gray-300 placeholder:font-normal"
                      />
                    </div>
                    <div className="flex-1 min-w-0 relative" ref={(el) => { suggestionRefs.current[i] = el; }}>
                      <p className="text-[10px] font-bold uppercase text-gray-400 mb-0.5">Tên SP</p>
                      <input
                        type="text"
                        value={item.product_name}
                        onChange={(e) => { updateItem(i, 'product_name', e.target.value); setActiveSuggestion(i); }}
                        onFocus={() => setActiveSuggestion(i)}
                        placeholder="Nhập tên sản phẩm..."
                        className="w-full px-2 py-1.5 rounded-md border border-gray-200 bg-white text-sm text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 placeholder:text-gray-300 placeholder:font-normal"
                      />
                      {/* Suggestion dropdown */}
                      {suggestions.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
                          <div className="max-h-48 overflow-y-auto">
                            {suggestions.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  const updated = [...items];
                                  updated[i] = { ...updated[i], product_code: p.ma_hom, product_name: p.ten_hom };
                                  setItems(updated);
                                  setActiveSuggestion(null);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 transition-colors flex items-center gap-2 border-b border-gray-50 last:border-0"
                              >
                                <span className="font-mono text-xs font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded flex-shrink-0">{p.ma_hom}</span>
                                <span className="flex-1 truncate text-gray-700">{p.ten_hom}</span>
                              </button>
                            ))}
                          </div>
                          <div className="border-t border-gray-100 px-3 py-1 flex justify-between items-center">
                            <span className="text-[10px] text-gray-400">{suggestions.length} gợi ý</span>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); setActiveSuggestion(null); }} className="text-[10px] text-gray-400 hover:text-gray-600">Đóng</button>
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      disabled={items.length <= 1}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-20 transition-colors flex-shrink-0 mt-4"
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
              );
              })}
            </div>
          </div>

          {/* Click outside to close suggestions */}
          {activeSuggestion !== null && (
            <div className="fixed inset-0 z-40" onMouseDown={() => setActiveSuggestion(null)} />
          )}

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
            className={`w-full py-3.5 text-white rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
              isTemporary 
                ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200'
                : 'bg-[#1B2A4A] hover:bg-[#162240] shadow-[#1B2A4A]/20'
            }`}
          >
            {isTemporary ? <ClipboardList size={16} /> : <ClipboardCheck size={16} />}
            {isTemporary ? 'Tạo phiếu nhập tạm →' : 'Kiểm tra đơn hàng →'}
          </button>
        </form>
      </div>

      {/* ══ MODAL KIỂM TRA ĐƠN HÀNG ══ */}
      {showCheckModal && (() => {
        const validItems = items.filter(i => i.product_code.trim() && i.product_name.trim());
        const hasMissing = validItems.some(i => i.received_qty < i.expected_qty);
        const hasExcess  = validItems.some(i => i.received_qty > i.expected_qty);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 rounded-t-2xl" style={{ background: isTemporary ? '#f59e0b' : '#1B2A4A' }}>
                <div className="flex items-center gap-2">
                  {isTemporary ? <ClipboardList size={18} className="text-white" /> : <ClipboardCheck size={18} className="text-orange-300" />}
                  <h2 className="font-extrabold text-white text-base tracking-wide">{isTemporary ? 'XÁC NHẬN NHẬP TẠM' : 'KIỂM TRA ĐƠN HÀNG'}</h2>
                </div>
                <button onClick={() => setShowCheckModal(false)} className="text-gray-300 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

                {/* PO & Kho info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase text-gray-400">PO liên kết</p>
                    <p className="font-bold text-purple-700 font-mono mt-0.5">{selectedPo?.po_code || searchInput || '—'}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase text-gray-400">Kho nhận</p>
                    <p className="font-bold text-gray-800 mt-0.5">{selectedKho?.ten_kho || '—'}</p>
                  </div>
                </div>

                {/* Status banner */}
                {hasMissing ? (
                  <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-800 text-sm font-semibold">Có sản phẩm <span className="font-extrabold">nhận thiếu</span> so với yêu cầu. Vui lòng xác nhận trước khi tiếp tục.</p>
                  </div>
                ) : hasExcess ? (
                  <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-200">
                    <AlertTriangle size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-blue-800 text-sm font-semibold">Có sản phẩm <span className="font-extrabold">nhận dư</span> so với yêu cầu. Vui lòng kiểm tra lại.</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                    <p className="text-emerald-800 text-sm font-semibold">Tất cả hàng hóa <span className="font-extrabold">đầy đủ</span> — số lượng khớp với đơn đặt hàng.</p>
                  </div>
                )}

                {/* Product table */}
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-3 py-2 text-left font-bold uppercase text-gray-400 tracking-wide">Mã SP</th>
                        <th className="px-3 py-2 text-left font-bold uppercase text-gray-400 tracking-wide">Tên SP</th>
                        <th className="px-3 py-2 text-right font-bold uppercase text-gray-400 tracking-wide">YC</th>
                        <th className="px-3 py-2 text-right font-bold uppercase text-gray-400 tracking-wide">Nhận</th>
                        <th className="px-3 py-2 text-center font-bold uppercase text-gray-400 tracking-wide">KQ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validItems.map((item, idx) => {
                        const diff = item.received_qty - item.expected_qty;
                        const ok   = diff === 0;
                        const miss = diff < 0;
                        return (
                          <tr key={idx} className="border-b border-gray-50 last:border-0">
                            <td className="px-3 py-2.5 font-mono font-bold text-orange-600">{item.product_code}</td>
                            <td className="px-3 py-2.5 text-gray-700 max-w-[140px]">
                              <span className="line-clamp-2 leading-snug">{item.product_name}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-gray-600">{item.expected_qty}</td>
                            <td className="px-3 py-2.5 text-right font-extrabold text-gray-900">{item.received_qty}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                ok   ? 'bg-emerald-100 text-emerald-700' :
                                miss ? 'bg-amber-100 text-amber-700' :
                                       'bg-blue-100 text-blue-700'
                              }`}>
                                {ok ? '✓ Đủ' : miss ? `▼ ${Math.abs(diff)}` : `▲ +${diff}`}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Confirm checkbox */}
                <label className="flex items-start gap-3 cursor-pointer select-none p-3 rounded-xl border-2 border-dashed transition-colors"
                  style={{ borderColor: confirmed ? '#10b981' : '#e5e7eb', background: confirmed ? '#f0fdf4' : '#fafafa' }}
                >
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={e => setConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded accent-emerald-600 flex-shrink-0"
                  />
                  <span className="text-sm font-semibold text-gray-700 leading-snug">
                    {isTemporary
                      ? <>Tôi xác nhận hàng <span className="font-extrabold text-gray-900">đã nhận vào kho</span> và chưa có PO liên kết. Phiếu này sẽ <span className="font-extrabold text-amber-700">không cộng tồn kho</span>.</>
                      : <>Tôi xác nhận đã <span className="font-extrabold text-gray-900">kiểm tra và đếm đúng</span> số lượng hàng hóa thực tế nhận vào kho.</>
                    }
                  </span>
                </label>

              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => setShowCheckModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  ← Quay lại chỉnh sửa
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!confirmed || submitting}
                  className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2 ${
                    isTemporary
                      ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200'
                      : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'
                  }`}
                >
                  {isTemporary ? <ClipboardList size={15} /> : <CheckCircle2 size={15} />}
                  {submitting ? 'Đang xử lý...' : (isTemporary ? 'Xác nhận nhập tạm' : 'Xác nhận nhập kho')}
                </button>
              </div>

            </div>
          </div>
        );
      })()}

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
