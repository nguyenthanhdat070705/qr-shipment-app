'use client';
// Force Turbopack refresh

import { useState, useEffect } from 'react';
import { Truck, Search, CheckCircle2, Package, MapPin, FileText, Calendar } from 'lucide-react';
import { getWarehouseFilter } from '@/config/roles.config';

interface InventoryItemData {
  inventory_id: string;
  ma_lo: string;
  product_id: string;
  product_code: string;
  product_name: string;
  warehouse_id: string;
  warehouse_name: string;
  quantity_available: number;
  image_url?: string;
}

export default function ExportTab() {
  const [searchInput, setSearchInput] = useState('');
  const [lockedWarehouse, setLockedWarehouse] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');

  const [scannedItems, setScannedItems] = useState<InventoryItemData[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');

  const [maDam, setMaDam] = useState('');
  const [error, setError] = useState('');

  // Đọc warehouse của user từ localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        setUserRole(u.role || '');
        const name = u.name || u.user_metadata?.name || u.ho_ten || '';
        const wf = getWarehouseFilter(u.email || '', name);
        if (wf) setLockedWarehouse(wf);
      }
    } catch {}
  }, []);

  const [recentExports, setRecentExports] = useState<any[]>([]);
  const [exportsLoading, setExportsLoading] = useState(true);

  const fetchRecentExports = async () => {
    setExportsLoading(true);
    try {
      const warehouseParam = lockedWarehouse ? `?warehouse=${encodeURIComponent(lockedWarehouse)}` : '';
      const res = await fetch(`/api/goods-issue/history${warehouseParam}`);
      const json = await res.json();
      if (res.ok) setRecentExports((json.data || []).slice(0, 8));
    } catch {}
    finally { setExportsLoading(false); }
  };

  useEffect(() => { fetchRecentExports(); }, [lockedWarehouse]);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<false | 'temporary' | 'completed'>(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const handleCancelExport = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy phiếu xuất này? Số lượng tồn kho sẽ được hoàn lại.')) return;
    
    setCancelingId(id);
    try {
      const res = await fetch(`/api/goods-issue/${id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi hủy phiếu xuất');
      alert('Hủy phiếu xuất thành công!');
      fetchRecentExports();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCancelingId(null);
    }
  };

  const getCoffinImage = (code: string) => {
    if (!code) return '/coffin-1.png';
    let hash = 0;
    for (let i = 0; i < code.length; i++) hash = ((hash << 5) - hash + code.charCodeAt(i)) | 0;
    return `/coffin-${(Math.abs(hash) % 5) + 1}.png`;
  };

  // Search logic
  const handleSearchProductOrLot = async (code: string) => {
    setError('');
    setScannedItems([]);
    setSelectedInventoryId('');
    setSuccess(false);

    if (!code) return;

    try {
      // Truyền warehouse filter để API chỉ trả về hàng trong kho của user
      const warehouseParam = lockedWarehouse ? `&warehouse=${encodeURIComponent(lockedWarehouse)}` : '';
      const res = await fetch(`/api/goods-issue/search?q=${encodeURIComponent(code)}${warehouseParam}`);
      const result = await res.json();

      // Nếu lỗi kỹ thuật 500 → báo lỗi server. Còn 404 (không tìm thấy) → im lặng
      if (!res.ok) {
        if (res.status === 404) {
          setError(result.error || `Không tìm thấy mã "${code}" trong kho.`);
        } else {
          setError('Lỗi kết nối cơ sở dữ liệu.');
        }
        return;
      }

      // Nếu có ma_dam → auto-fill
      if (result.dam_data?.ma_dam) {
        setMaDam(result.dam_data.ma_dam);
      }

      let data = (result.data || []) as InventoryItemData[];

      // Lọc chỉ hiển hàng thuộc kho của user (client-side safety check)
      if (lockedWarehouse) {
        const filterLower = lockedWarehouse.toLowerCase();
        const filtered = data.filter(item =>
          item.warehouse_name?.toLowerCase().includes(filterLower) ||
          filterLower.includes(item.warehouse_name?.toLowerCase() || '')
        );
        // Nếu sau filter không còn hàng nào trong kho mình
        if (filtered.length === 0 && data.length > 0) {
          setError(`Sản phẩm này không có trong ${lockedWarehouse} (chỉ có ở: ${data.map(d => d.warehouse_name).join(', ')}).`);
          return;
        }
        data = filtered.length > 0 ? filtered : data;
      }

      if (data.length === 0) {
        setError(`Sản phẩm "${code}" hiện không có sẵn trong kho của bạn.`);
        return;
      }

      setScannedItems(data);
      setSelectedInventoryId(data[0].inventory_id);
      setSearchInput(code);
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối server.');
    }
  };


  const selectedItem = scannedItems.find(i => i.inventory_id === selectedInventoryId);

  const handleSubmit = async (isTemporary: boolean = false) => {
    if (!selectedItem) {
      setError('Không có sản phẩm tồn kho khả dụng!');
      return;
    }

    if (!maDam.trim()) {
      setError('Vui lòng nhập Mã Đám.');
      return;
    }

    if (1 > selectedItem.quantity_available) {
      setError(`Số lượng xuất không hợp lệ (Tồn khả dụng: ${selectedItem.quantity_available})`);
      return;
    }

    setSubmitting(true);
    setError('');

    let createdBy = 'unknown';
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) createdBy = JSON.parse(raw).email || 'unknown';
    } catch {}

    try {
      const res = await fetch('/api/goods-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory_id: selectedItem.inventory_id,
          product_code: selectedItem.product_code,
          quantity: 1,
          ma_dam: maDam.trim(),
          note: `Xuất cho đám ${maDam.trim()}`,
          created_by: createdBy,
          is_temporary: isTemporary,
        })
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Có lỗi xảy ra khi tạo đơn xuất hàng.');
        return;
      }

      setSuccess(isTemporary ? 'temporary' : 'completed');
      fetchRecentExports();
      setTimeout(() => {
        // Reset form for next transfer
        setScannedItems([]);
        setSelectedInventoryId('');
        setMaDam('');
        setSearchInput('');
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="@container">
      {/* Header */}
      <div className="mb-6 p-5 @lg:p-8 rounded-[1.5rem] @lg:rounded-[2rem] bg-gradient-to-br from-[#1B2A4A] via-indigo-900 to-[#1e3a8a] text-white shadow-xl shadow-indigo-900/20 max-w-4xl mx-auto relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/20 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md shadow-sm">
              <Truck size={12} className="text-emerald-400" />
              <span className="text-[10px] font-bold text-white tracking-widest uppercase">Xuất Kho</span>
            </div>
            {lockedWarehouse && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 backdrop-blur-md shadow-sm">
                <MapPin size={11} className="text-emerald-300" />
                <span className="text-[10px] font-bold text-emerald-200 tracking-wide">{lockedWarehouse}</span>
              </div>
            )}
          </div>
          <h1 className="text-2xl @lg:text-3xl font-extrabold mb-2 tracking-tight">Xuất hàng</h1>
          <p className="text-indigo-100 text-xs @lg:text-sm max-w-md leading-relaxed">
            {lockedWarehouse
              ? `Chỉ xuất hàng từ ${lockedWarehouse}. Nhập mã SP, tên sản phẩm hoặc mã đám để tìm kiếm.`
              : 'Nhập mã SP, tên sản phẩm hoặc mã đám để tìm kiếm.'}
          </p>
        </div>
      </div>


      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        {/* Success message */}
        {success && (
          <div className="max-w-lg mx-auto rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg p-10 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-5 border-4 border-emerald-200 shadow-md">
              <CheckCircle2 size={48} className="text-emerald-500" />
            </div>
            <h3 className="text-2xl font-black text-emerald-800 mb-2">
              {success === 'temporary' ? 'Tạo phiếu xuất tạm thành công!' : 'Xuất hàng thành công!'}
            </h3>
            <p className="text-emerald-700 font-semibold">
              {success === 'temporary' ? 'Phiếu đã được lưu tạm, chưa trừ tồn kho.' : 'Sản phẩm đã được trừ kho và ghi nhận.'}
            </p>
            <p className="text-sm text-emerald-500 mt-3 opacity-80">Tự động làm mới sau 3 giây...</p>
          </div>
        )}

        {/* Search Card */}
          {!success && (
          <div className="rounded-[1.5rem] @lg:rounded-[2rem] bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-xl shadow-gray-200/50 dark:shadow-none p-4 @lg:p-6 relative overflow-hidden transition-all">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-emerald-500"></div>

            <div className="mb-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-gray-900 dark:text-white flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs">1</span>
                Tìm kiếm sản phẩm
              </h2>
            </div>

            <div className="relative">
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
                placeholder="Nhập mã SP, tên sản phẩm hoặc mã đám..."
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-slate-900 border-2 border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 rounded-xl text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => handleSearchProductOrLot(searchInput.trim())}
                className="mt-3 w-full @lg:w-auto @lg:mt-0 @lg:absolute @lg:right-2 @lg:top-1.5 @lg:bottom-1.5 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all"
              >
                Tìm kiếm
              </button>
            </div>

            {error && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-red-50/50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* Product card + Transfer form */}
        {selectedItem && !success && (
          <div className="max-w-lg mx-auto space-y-4">
            {/* Product info card */}
            <div className="rounded-2xl overflow-hidden border border-indigo-200 shadow-xl">
              <div className="bg-gradient-to-r from-[#1B2A4A] to-teal-700 px-6 py-5">
                <p className="text-teal-200 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <Package size={12} /> Sản phẩm
                </p>
                <h2 className="text-white text-xl font-bold leading-snug">
                  {selectedItem.product_name}
                </h2>
              </div>

              {/* Coffin image */}
              <div className="bg-slate-50 border-x border-indigo-100 px-6 py-5 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedItem.image_url || getCoffinImage(selectedItem.product_code)}
                  alt="Sản phẩm"
                  className="max-h-44 w-full object-contain drop-shadow-md"
                  onError={(e) => { (e.target as HTMLImageElement).src = getCoffinImage(selectedItem.product_code); }}
                />
              </div>

              <div className="bg-white border border-indigo-100 divide-y divide-indigo-50/60">
                <div className="flex items-center justify-between px-6 py-3.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Mã SP</span>
                  <span className="font-mono font-extrabold text-indigo-800 text-lg">{selectedItem.product_code}</span>
                </div>
                <div className="flex items-center justify-between px-6 py-3.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Kho</span>
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
                  ) : (
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                      {selectedItem.warehouse_name} — {selectedItem.quantity_available} cái
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Transfer form */}
            <div className="rounded-2xl border border-indigo-100 bg-white shadow-lg p-6 space-y-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-gray-900 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs">2</span>
                Thông tin chuyển kho
              </h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Mã Đám *</label>
                <input
                  type="text"
                  value={maDam}
                  onChange={(e) => setMaDam(e.target.value)}
                  placeholder="Nhập mã đám (vd: 260122)..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                />
              </div>

              <div className="mt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmit(false)}
                  className="w-full inline-flex items-center justify-center gap-3 rounded-xl
                            bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4
                            text-sm @lg:text-base font-bold text-white shadow-xl shadow-emerald-800/20
                            hover:from-emerald-700 hover:to-teal-700 hover:scale-[1.02] active:scale-95
                            disabled:opacity-70 disabled:pointer-events-none transition-all duration-200"
                >
                  {submitting ? (
                    <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span> Đang xử lý...</>
                  ) : (
                    <><Truck size={20} /> Xác nhận xuất hàng</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Phiếu xuất gần đây */}
      {!success && (
        <div className="max-w-4xl mx-auto pb-8 mt-10">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
                <FileText size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">Phiếu xuất gần đây</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Lịch sử xuất hàng mới nhất</p>
              </div>
            </div>
          </div>

          {exportsLoading ? (
            <div className="grid grid-cols-1 @md:grid-cols-2 gap-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 animate-pulse">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-9 w-9 rounded-xl bg-gray-200 dark:bg-slate-700" />
                    <div className="flex-1 space-y-2"><div className="h-4 w-24 bg-gray-200 dark:bg-slate-700 rounded" /><div className="h-3 w-16 bg-gray-100 dark:bg-slate-600 rounded" /></div>
                  </div>
                  <div className="h-3 w-full bg-gray-100 dark:bg-slate-700 rounded mt-2" />
                </div>
              ))}
            </div>
          ) : recentExports.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 p-10 text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                <Truck size={24} className="text-gray-400" />
              </div>
              <p className="font-bold text-gray-500 dark:text-gray-400">Chưa có phiếu xuất nào</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Tìm kiếm sản phẩm ở trên để bắt đầu xuất hàng.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 @md:grid-cols-2 gap-3">
              {recentExports.map((exp: any, idx: number) => {
                const statusMap: Record<string, { label: string; color: string; bg: string }> = {
                  completed: { label: 'Hoàn thành', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800' },
                  pending: { label: 'Hoàn thành xuất', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800' },
                  draft: { label: 'Tạm', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600' },
                  cancelled: { label: 'Đã hủy', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800' },
                };
                const status = statusMap[exp.trang_thai] || statusMap.pending;
                const items = exp.fact_xuat_hang_items || [];
                const productName = items[0]?.ten_hom || '—';
                const createdAt = exp.created_at ? new Date(exp.created_at) : null;
                const timeStr = createdAt ? createdAt.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

                return (
                  <div
                    key={exp.id || idx}
                    className={`group rounded-2xl border ${exp.trang_thai === 'cancelled' ? 'border-red-100 opacity-60' : 'border-gray-100'} dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:shadow-lg hover:shadow-indigo-500/5 hover:border-indigo-200 dark:hover:border-indigo-700 transition-all duration-300 cursor-default`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0 mt-0.5 transition-colors ${exp.trang_thai === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/60'}`}>
                        <Package size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`font-mono text-xs font-bold truncate ${exp.trang_thai === 'cancelled' ? 'text-red-600 line-through' : 'text-indigo-600 dark:text-indigo-400'}`}>{exp.ma_phieu_xuat}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.bg} ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className={`text-sm font-semibold truncate leading-snug ${exp.trang_thai === 'cancelled' ? 'text-gray-500' : 'text-gray-900 dark:text-white'}`}>{productName}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
                            <span className="inline-flex items-center gap-1"><Calendar size={10} />{timeStr}</span>
                            {exp.kho_xuat && <span className="inline-flex items-center gap-1"><MapPin size={10} />{exp.kho_xuat}</span>}
                          </div>
                          
                          {exp.trang_thai !== 'cancelled' && userRole === 'admin' && (
                            <button
                              type="button"
                              onClick={() => handleCancelExport(exp.id)}
                              disabled={cancelingId === exp.id}
                              className="text-[10px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg border border-red-200 transition-colors disabled:opacity-50"
                            >
                              {cancelingId === exp.id ? 'Đang hủy...' : 'Hủy phiếu xuất'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
