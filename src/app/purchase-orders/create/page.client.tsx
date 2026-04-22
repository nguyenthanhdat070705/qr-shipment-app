'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, ArrowLeft, Plus, Trash2, Search, X } from 'lucide-react';
import PageLayout from '@/components/PageLayout';

interface DimNcc {
  id: string;
  ma_ncc: string;
  ten_ncc: string;
  nguoi_lien_he: string | null;
  sdt: string | null;
  dia_chi: string | null;
}

interface DimKho {
  id: string;
  ma_kho: string;
  ten_kho: string;
  dia_chi: string | null;
}

interface DimHom {
  id: string;
  ma_hom: string;
  ten_hom: string;
  gia_ban_1: number | null;
  gia_ban: number | null;
  NCC: string | null; // FK → dim_ncc.id
}

interface OrderItem {
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  hang_ky_gui: boolean;
  note: string;
}

export default function CreatePurchaseOrderPage() {
  const router = useRouter();
  const [nccList, setNccList] = useState<DimNcc[]>([]);
  const [khoList, setKhoList] = useState<DimKho[]>([]);
  const [homList, setHomList] = useState<DimHom[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<OrderItem[]>([
    { product_code: '', product_name: '', quantity: 1, unit_price: 0, hang_ky_gui: false, note: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Custom dropdown cho Nhà cung cấp
  const [nccSearch, setNccSearch] = useState('');
  const [isNccDropdownOpen, setIsNccDropdownOpen] = useState(false);

  // Search state per item — để filter dropdown sản phẩm
  const [itemSearches, setItemSearches] = useState<string[]>(['']);
  const [openDropdowns, setOpenDropdowns] = useState<boolean[]>([false]);
  const dropdownRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Products filtered by selected NCC
  const filteredProducts = supplierId
    ? homList.filter(h => h.NCC === supplierId)
    : homList;

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return;

    const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

    Promise.all([
      fetch(`${supabaseUrl}/rest/v1/dim_ncc?select=*&order=ma_ncc`, { headers }).then(r => r.json()),
      fetch(`${supabaseUrl}/rest/v1/dim_kho?select=*&order=ma_kho`, { headers }).then(r => r.json()),
      fetch(`${supabaseUrl}/rest/v1/dim_hom?select=id,ma_hom,ten_hom,gia_ban_1,gia_ban,NCC&is_active=eq.true&order=ma_hom`, { headers }).then(r => r.json()),
    ]).then(([ncc, kho, hom]) => {
      setNccList(Array.isArray(ncc) ? ncc : []);
      setKhoList(Array.isArray(kho) ? kho : []);
      setHomList(Array.isArray(hom) ? hom : []);
    }).catch(console.error);
  }, []);

  const addItem = () => {
    setItems([...items, { product_code: '', product_name: '', quantity: 1, unit_price: 0, hang_ky_gui: false, note: '' }]);
    setItemSearches([...itemSearches, '']);
    setOpenDropdowns([...openDropdowns, false]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
    setItemSearches(itemSearches.filter((_, i) => i !== index));
    setOpenDropdowns(openDropdowns.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OrderItem, value: string | number | boolean) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  // When user selects a product from dropdown, auto-fill code, name, price
  const handleSelectProduct = (index: number, homId: string) => {
    const hom = homList.find(h => h.id === homId);
    if (hom) {
      const updated = [...items];
      updated[index] = {
        ...updated[index],
        product_code: hom.ma_hom,
        product_name: hom.ten_hom,
        unit_price: hom.gia_ban_1 || hom.gia_ban || 0,
      };
      setItems(updated);
      // Cập nhật search text thành tên sản phẩm đã chọn + đóng dropdown
      const searches = [...itemSearches];
      searches[index] = `${hom.ma_hom} — ${hom.ten_hom}`;
      setItemSearches(searches);
      const opens = [...openDropdowns];
      opens[index] = false;
      setOpenDropdowns(opens);
    }
  };

  const toggleDropdown = (index: number, open: boolean) => {
    const opens = [...openDropdowns];
    opens[index] = open;
    setOpenDropdowns(opens);
    // Khi mở dropdown, reset search về rỗng để dễ tìm
    if (open) {
      const searches = [...itemSearches];
      searches[index] = '';
      setItemSearches(searches);
    }
  };

  const clearProduct = (index: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], product_code: '', product_name: '', unit_price: 0 };
    setItems(updated);
    const searches = [...itemSearches];
    searches[index] = '';
    setItemSearches(searches);
    const opens = [...openDropdowns];
    opens[index] = true;
    setOpenDropdowns(opens);
  };

  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    if (!supplierId) {
      setError('Vui lòng chọn nhà cung cấp.');
      setSubmitting(false);
      return;
    }

    if (!warehouseId) {
      setError('Vui lòng chọn kho nhận hàng.');
      setSubmitting(false);
      return;
    }

    let createdBy = 'unknown';
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) createdBy = JSON.parse(raw).email || 'unknown';
    } catch { /* ignore */ }

    const validItems = items.filter((item) => item.product_code.trim() && item.product_name.trim());
    if (validItems.length === 0) {
      setError('Cần ít nhất một sản phẩm trong đơn hàng.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: supplierId || null,
          warehouse_id: warehouseId || null,
          expected_date: expectedDate || null,
          note: note || null,
          created_by: createdBy,
          items: validItems,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Có lỗi xảy ra.');
        return;
      }

      router.push(`/purchase-orders/${result.data.id}`);
    } catch (err) {
      setError('Lỗi kết nối server.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Quick product search: search hòm → auto-select NCC ──
  const [quickSearch, setQuickSearch] = useState('');
  const [quickOpen, setQuickOpen] = useState(false);
  const quickRef = useRef<HTMLDivElement>(null);

  const quickFiltered = (() => {
    const q = quickSearch.toLowerCase().trim();
    if (!q) return homList.slice(0, 30);
    return homList.filter(h =>
      h.ma_hom.toLowerCase().includes(q) ||
      h.ten_hom.toLowerCase().includes(q)
    );
  })();

  const handleQuickSelect = (hom: DimHom) => {
    // Auto set NCC if product has one
    if (hom.NCC) {
      setSupplierId(hom.NCC);
    }
    // Add product to items list (replace first empty row or add new)
    const emptyIdx = items.findIndex(item => !item.product_code);
    if (emptyIdx >= 0) {
      const updated = [...items];
      updated[emptyIdx] = {
        ...updated[emptyIdx],
        product_code: hom.ma_hom,
        product_name: hom.ten_hom,
        unit_price: hom.gia_ban_1 || hom.gia_ban || 0,
      };
      setItems(updated);
      const searches = [...itemSearches];
      searches[emptyIdx] = `${hom.ma_hom} — ${hom.ten_hom}`;
      setItemSearches(searches);
    } else {
      setItems([...items, {
        product_code: hom.ma_hom,
        product_name: hom.ten_hom,
        quantity: 1,
        unit_price: hom.gia_ban_1 || hom.gia_ban || 0,
        hang_ky_gui: false,
        note: '',
      }]);
      setItemSearches([...itemSearches, `${hom.ma_hom} — ${hom.ten_hom}`]);
      setOpenDropdowns([...openDropdowns, false]);
    }
    setQuickSearch(`${hom.ma_hom} — ${hom.ten_hom}`);
    setQuickOpen(false);
  };

  const selectedNcc = nccList.find(n => n.id === supplierId);
  const selectedKho = khoList.find(k => k.id === warehouseId);

  return (
    <PageLayout title="Tạo đơn mua hàng" icon={<ShoppingCart size={16} className="text-purple-500" />}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <button
          onClick={() => router.push('/purchase-orders')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Danh sách PO
        </button>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Tạo đơn mua hàng mới</h1>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Quick Product Search — tìm hòm trước, auto set NCC ── */}
          <div className="rounded-2xl border-2 border-dashed border-purple-200 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-purple-100 rounded-lg">
                <Search size={14} className="text-purple-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-purple-900">Tìm nhanh theo sản phẩm</h2>
                <p className="text-[11px] text-purple-500">Chọn sản phẩm → tự động xác định nhà cung cấp</p>
              </div>
            </div>
            <div ref={quickRef} className="relative">
              <div
                className={`flex items-center w-full px-3 py-2.5 rounded-xl border bg-white text-sm gap-2 cursor-text transition-all ${
                  quickOpen ? 'border-purple-400 ring-2 ring-purple-100 shadow-sm' : 'border-gray-200 hover:border-purple-300'
                }`}
                onClick={() => setQuickOpen(true)}
              >
                <Search size={14} className="text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={quickSearch}
                  onChange={(e) => { setQuickSearch(e.target.value); setQuickOpen(true); }}
                  onFocus={() => setQuickOpen(true)}
                  placeholder="Gõ mã hoặc tên hòm để tìm nhanh..."
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400 min-w-0"
                  onClick={(e) => e.stopPropagation()}
                />
                {quickSearch && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setQuickSearch(''); setQuickOpen(true); }}
                    className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {quickOpen && (
                <>
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      {quickFiltered.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-gray-400 text-center">Không tìm thấy sản phẩm</div>
                      ) : (
                        quickFiltered.map((h) => {
                          const ncc = nccList.find(n => n.id === h.NCC);
                          return (
                            <button
                              key={h.id}
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); handleQuickSelect(h); }}
                              className="w-full text-left px-3 py-2.5 text-sm hover:bg-purple-50 transition-colors flex items-center gap-3 group border-b border-gray-50 last:border-0"
                            >
                              <span className="font-mono text-xs font-bold text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded flex-shrink-0">{h.ma_hom}</span>
                              <span className="flex-1 truncate">{h.ten_hom}</span>
                              {ncc && (
                                <span className="text-[10px] text-gray-400 flex-shrink-0 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {ncc.ten_ncc}
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                    <div className="border-t border-gray-100 px-3 py-1.5 flex justify-between items-center">
                      <span className="text-[10px] text-gray-400">{quickFiltered.length} sản phẩm</span>
                      <button type="button" onMouseDown={(e) => { e.preventDefault(); setQuickOpen(false); }} className="text-xs text-gray-400 hover:text-gray-600">Đóng</button>
                    </div>
                  </div>
                  <div className="fixed inset-0 z-40" onMouseDown={() => setQuickOpen(false)} />
                </>
              )}
            </div>
          </div>

          {/* General Info */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Thông tin chung</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* NCC Dropdown */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nhà cung cấp *</label>
                <div
                  className={`flex items-center w-full px-3 py-2 rounded-xl border bg-white text-sm gap-2 cursor-text transition-all ${
                    isNccDropdownOpen ? 'border-purple-400 ring-2 ring-purple-100 shadow-sm' : 'border-gray-200 hover:border-purple-300'
                  }`}
                  onClick={() => setIsNccDropdownOpen(true)}
                >
                  <Search size={14} className="text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={isNccDropdownOpen ? nccSearch : (selectedNcc ? `${selectedNcc.ten_ncc} (${selectedNcc.ma_ncc})` : '')}
                    onChange={(e) => {
                      setNccSearch(e.target.value);
                      setIsNccDropdownOpen(true);
                      if (supplierId && !isNccDropdownOpen) {
                        setSupplierId('');
                      }
                    }}
                    onFocus={() => {
                      setIsNccDropdownOpen(true);
                      setNccSearch('');
                    }}
                    placeholder="— Gõ tên hoặc mã để tìm —"
                    className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-500 min-w-0 py-0.5"
                  />
                  {supplierId && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSupplierId(''); setNccSearch(''); setIsNccDropdownOpen(true); }}
                      className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {isNccDropdownOpen && (
                  <>
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                      <div className="max-h-60 overflow-y-auto">
                        {(() => {
                           const q = nccSearch.toLowerCase().trim();
                           const filteredNcc = nccList.filter(n =>
                             !q ||
                             n.ten_ncc.toLowerCase().includes(q) ||
                             n.ma_ncc.toLowerCase().includes(q)
                           );

                           if (filteredNcc.length === 0) {
                             return <div className="px-3 py-4 text-sm text-gray-400 text-center">Không tìm thấy nhà cung cấp</div>;
                           }

                           return filteredNcc.map(n => (
                             <button
                               key={n.id}
                               type="button"
                               onMouseDown={(e) => {
                                 e.preventDefault();
                                 setSupplierId(n.id);
                                 setNccSearch('');
                                 setIsNccDropdownOpen(false);
                               }}
                               className={`w-full text-left px-3 py-2.5 text-sm hover:bg-purple-50 transition-colors flex items-center gap-2 border-b border-gray-50 last:border-0 ${
                                 supplierId === n.id ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                               }`}
                             >
                                <span className="font-mono text-xs font-bold text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded flex-shrink-0">{n.ma_ncc}</span>
                                <span className="flex-1 truncate">{n.ten_ncc}</span>
                             </button>
                           ));
                        })()}
                      </div>
                      <div className="border-t border-gray-100 px-3 py-1.5 flex justify-end">
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); setIsNccDropdownOpen(false); }} className="text-xs text-gray-400 hover:text-gray-600 font-medium px-2 py-1">Đóng</button>
                      </div>
                    </div>
                  </>
                )}
                {isNccDropdownOpen && (
                   <div className="fixed inset-0 z-40" onMouseDown={() => setIsNccDropdownOpen(false)} />
                )}

                {/* NCC detail card */}
                {selectedNcc && (
                  <div className="mt-2 p-3 rounded-xl bg-purple-50 border border-purple-100 text-xs space-y-1">
                    <p className="font-bold text-purple-800">{selectedNcc.ten_ncc}</p>
                    {selectedNcc.nguoi_lien_he && <p className="text-purple-600">👤 {selectedNcc.nguoi_lien_he}</p>}
                    {selectedNcc.sdt && <p className="text-purple-600">📞 {selectedNcc.sdt}</p>}
                    {selectedNcc.dia_chi && <p className="text-purple-600 line-clamp-2">📍 {selectedNcc.dia_chi}</p>}
                  </div>
                )}
              </div>

              {/* Kho Dropdown */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Kho nhận hàng *</label>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all"
                >
                  <option value="">— Chọn kho —</option>
                  {khoList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.ten_kho} ({k.ma_kho})
                    </option>
                  ))}
                </select>
                {/* Kho detail card */}
                {selectedKho && (
                  <div className="mt-2 p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs space-y-1">
                    <p className="font-bold text-blue-800">{selectedKho.ten_kho}</p>
                    <p className="text-blue-600 font-mono">{selectedKho.ma_kho}</p>
                    {selectedKho.dia_chi && <p className="text-blue-600 line-clamp-2">📍 {selectedKho.dia_chi}</p>}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ngày dự kiến nhận *</label>
                <input
                  type="date"
                  lang="vi"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ghi chú</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú cho đơn hàng..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                Sản phẩm
                {supplierId && (
                  <span className="ml-2 text-purple-500 normal-case tracking-normal font-medium">
                    ({filteredProducts.length} SP từ {selectedNcc?.ten_ncc})
                  </span>
                )}
              </h2>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs font-semibold hover:bg-purple-100 transition-colors"
              >
                <Plus size={14} />
                Thêm SP
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
                  {/* Product selector — searchable combobox */}
                  <div ref={(el) => { dropdownRefs.current[i] = el; }} className="relative">
                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Chọn sản phẩm</label>
                    {/* Input hiển thị sản phẩm đã chọn hoặc ô tìm kiếm */}
                    <div
                      className={`flex items-center w-full px-2 py-2 rounded-lg border text-sm bg-white gap-2 cursor-pointer transition-all ${
                        openDropdowns[i] ? 'border-purple-400 ring-2 ring-purple-100' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleDropdown(i, !openDropdowns[i])}
                    >
                      <Search size={14} className="text-gray-400 flex-shrink-0" />
                      <input
                        type="text"
                        value={openDropdowns[i] ? itemSearches[i] ?? '' : (item.product_code ? `${item.product_code} — ${item.product_name}` : '')}
                        onChange={(e) => {
                          const searches = [...itemSearches];
                          searches[i] = e.target.value;
                          setItemSearches(searches);
                          const opens = [...openDropdowns];
                          opens[i] = true;
                          setOpenDropdowns(opens);
                        }}
                        onFocus={() => toggleDropdown(i, true)}
                        placeholder="Tìm theo mã SP hoặc tên..."
                        className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400 min-w-0"
                        onClick={(e) => e.stopPropagation()}
                      />
                      {item.product_code && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); clearProduct(i); }}
                          className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {/* Dropdown list */}
                    {openDropdowns[i] && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                        <div className="max-h-56 overflow-y-auto">
                          {(() => {
                            const q = (itemSearches[i] ?? '').toLowerCase().trim();
                            const filtered = filteredProducts.filter(h =>
                              !q ||
                              h.ma_hom.toLowerCase().includes(q) ||
                              h.ten_hom.toLowerCase().includes(q)
                            );
                            if (filtered.length === 0) return (
                              <div className="px-3 py-4 text-sm text-gray-400 text-center">Không tìm thấy sản phẩm</div>
                            );
                            return filtered.map((h) => (
                              <button
                                key={h.id}
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); handleSelectProduct(i, h.id); }}
                                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-purple-50 transition-colors flex items-center gap-3 ${
                                  item.product_code === h.ma_hom ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                                }`}
                              >
                                <span className="font-mono text-xs font-bold text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded flex-shrink-0">{h.ma_hom}</span>
                                <span className="flex-1 truncate">{h.ten_hom}</span>
                                {h.gia_ban_1 && <span className="text-xs text-gray-400 flex-shrink-0">{h.gia_ban_1.toLocaleString('vi-VN')}₫</span>}
                              </button>
                            ));
                          })()}
                        </div>
                        {/* Footer: đóng dropdown */}
                        <div className="border-t border-gray-100 px-3 py-1.5 flex justify-end">
                          <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); toggleDropdown(i, false); }}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >Đóng</button>
                        </div>
                      </div>
                    )}

                    {/* Click outside để đóng */}
                    {openDropdowns[i] && (
                      <div
                        className="fixed inset-0 z-40"
                        onMouseDown={() => toggleDropdown(i, false)}
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Mã SP</label>
                      <input
                        type="text"
                        value={item.product_code}
                        readOnly
                        className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm bg-gray-100 font-mono focus:outline-none"
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Tên SP</label>
                      <div className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm bg-gray-100 min-h-[38px] break-words leading-snug">
                        {item.product_name || <span className="text-gray-400">Tên sản phẩm</span>}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">SL</label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Đơn giá (₫)</label>
                      <input
                        type="number"
                        min={0}
                        value={item.unit_price}
                        onChange={(e) => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                      />
                    </div>
                    <div className="col-span-1 pt-[22px]">
                       <label className="flex items-center gap-1.5 cursor-pointer bg-white border border-gray-200 py-1.5 px-2 rounded-lg shadow-sm hover:border-purple-300 transition-colors h-[38px] group">
                          <input
                            type="checkbox"
                            checked={item.hang_ky_gui}
                            onChange={(e) => updateItem(i, 'hang_ky_gui', e.target.checked)}
                            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                          />
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight group-hover:text-purple-600">Ký gửi</span>
                       </label>
                    </div>
                    <div className="col-span-1 flex justify-center pt-[22px]">
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        disabled={items.length <= 1}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors h-[38px] w-[38px] flex items-center justify-center"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex justify-end pt-2 border-t border-gray-100">
              <div className="text-right">
                <span className="text-xs text-gray-400 uppercase">Tổng cộng: </span>
                <span className="text-xl font-extrabold text-gray-900 ml-2">
                  {total.toLocaleString('vi-VN')} ₫
                </span>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 disabled:opacity-50 shadow-lg shadow-purple-200 transition-all"
          >
            {submitting ? 'Đang xử lý...' : 'Xác nhận đơn hàng'}
          </button>
        </form>
      </div>
    </PageLayout>
  );
}
