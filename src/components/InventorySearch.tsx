'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Package, ChevronDown, MapPin, Warehouse, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { getWarehouseFilter } from '@/config/roles.config';

interface WarehouseBreakdown {
  khoId: string;
  name: string;
  code: string;
  qty: number;
  avail: number;
}

interface InventoryItem {
  code: string;
  name: string;
  price: number;
  giaVon?: number;
  status: string;
  tonKho: string;
  khaDung?: string;
  warehouse: string;
  warehouseCode?: string;
  serial: string;
  imageUrl: string;
  isExported: boolean;
  isOutOfStock: boolean;
  available: boolean;
  lots?: string[];
  warehouseBreakdown?: WarehouseBreakdown[];
  supplierName?: string;
  supplierContact?: string;
  supplierPhone?: string;
  supplierAddress?: string;
}

type FilterType = 'all' | 'available' | 'exported' | 'out_of_stock';
type SortType = 'name' | 'price_asc' | 'price_desc' | 'code';

export default function InventorySearch({ items, showStats = false }: { items: InventoryItem[]; showStats?: boolean }) {
  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get('filter') as FilterType) || 'all';
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>(initialFilter);
  const [sort, setSort] = useState<SortType>('name');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [lockedWarehouse, setLockedWarehouse] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      if (stored) {
        const user = JSON.parse(stored);
        if (user.email) {
          const filterValue = getWarehouseFilter(user.email);
          if (filterValue) {
            setLockedWarehouse(filterValue);
            // Không set warehouseFilter ngay — chờ uniqueWarehouses tính xong
            // sẽ được set trong useEffect bên dưới theo uniqueWarehouses thực tế
          }
        }
      }
    } catch (e) {
      console.error('Error reading auth_user', e);
    }
  }, []);

  const uniqueWarehouses = useMemo(() => {
    const ws = new Set<string>();
    items.forEach(i => {
      if (i.warehouse && i.warehouse !== '—') {
        i.warehouse.split(', ').forEach(w => ws.add(w.trim()));
      }
    });
    return Array.from(ws).sort();
  }, [items]);

  // Sau khi uniqueWarehouses có dữ liệu, tìm tên kho thực tế match với lockedWarehouse
  useEffect(() => {
    if (!lockedWarehouse || uniqueWarehouses.length === 0) return;
    // Tìm tên kho trong DB chứa chuỗi lockedWarehouse (case-insensitive)
    const matched = uniqueWarehouses.find(
      w => w.toLowerCase().includes(lockedWarehouse.toLowerCase()) ||
           lockedWarehouse.toLowerCase().includes(w.toLowerCase())
    );
    if (matched) {
      setWarehouseFilter(matched);
    } else {
      // Nếu không tìm thấy tên khớp, giữ lockedWarehouse để filter
      setWarehouseFilter(lockedWarehouse);
    }
  }, [lockedWarehouse, uniqueWarehouses]);

  const filtered = useMemo(() => {
    let result: InventoryItem[];

    // Warehouse Filter: nếu có filter kho, re-map items theo tồn kho riêng của kho đó
    if (warehouseFilter !== 'all') {
      const filterLower = warehouseFilter.toLowerCase().trim();

      result = items
        .map(item => {
          // Tìm breakdown của đúng kho này
          const breakdown = item.warehouseBreakdown?.find(w =>
            w.name.toLowerCase().includes(filterLower) ||
            filterLower.includes(w.name.toLowerCase())
          );
          if (!breakdown) return null; // Sản phẩm không có trong kho này → loại bỏ

          // Override quantities với dữ liệu riêng của kho
          const avail = breakdown.avail;
          const qty = breakdown.qty;
          return {
            ...item,
            tonKho: String(qty),
            khaDung: String(avail),
            warehouse: breakdown.name,
            warehouseBreakdown: [breakdown], // Chỉ show kho này
            available: avail > 0,
            isOutOfStock: avail <= 0,
            isExported: qty > 0 && avail <= 0,
          } as InventoryItem;
        })
        .filter((item): item is InventoryItem => item !== null);
    } else {
      result = [...items];
    }

    // Search
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q) ||
          item.serial.toLowerCase().includes(q)
      );
    }

    // Status Filter (dùng sau khi đã re-map quantities)
    switch (filter) {
      case 'available':
        result = result.filter((i) => i.available);
        break;
      case 'exported':
        result = result.filter((i) => i.isExported);
        break;
      case 'out_of_stock':
        result = result.filter((i) => i.isOutOfStock);
        break;
    }

    // Sort
    switch (sort) {
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
        break;
      case 'price_asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'code':
        result.sort((a, b) => a.code.localeCompare(b.code));
        break;
    }

    return result;
  }, [items, query, filter, sort, warehouseFilter]);


  // Stats tính từ filtered — đã có per-warehouse quantities chính xác
  const warehouseStats = useMemo(() => {
    // Khi có search/filter status, stats vẫn nên dựa trên tất cả items của kho (không bị ảnh hưởng bởi search)
    // Nên tính riêng từ base warehouse-filtered items
    const baseItems = warehouseFilter === 'all'
      ? items
      : items
          .map(item => {
            const filterLower = warehouseFilter.toLowerCase().trim();
            const bd = item.warehouseBreakdown?.find(w =>
              w.name.toLowerCase().includes(filterLower) ||
              filterLower.includes(w.name.toLowerCase())
            );
            if (!bd) return null;
            return { ...item, available: bd.avail > 0, isOutOfStock: bd.avail <= 0, isExported: bd.qty > 0 && bd.avail <= 0 } as InventoryItem;
          })
          .filter((i): i is InventoryItem => i !== null);
    return {
      total: baseItems.length,
      available: baseItems.filter(i => i.available).length,
      outOfStock: baseItems.filter(i => i.isOutOfStock).length,
      warehouseName: lockedWarehouse || 'Tất cả kho',
    };
  }, [items, warehouseFilter, lockedWarehouse]);

  return (
    <div className="space-y-4">
      {/* Stat cards — hiển thị khi showStats=true hoặc khi có lockedWarehouse */}
      {(showStats || lockedWarehouse) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
          <div className="rounded-2xl bg-white border border-[#d5dbe9] p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#eef1f7] flex-shrink-0">
              <Warehouse size={22} className="text-[#1B2A4A]" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-gray-900 leading-none">{warehouseStats.total}</p>
              <p className="text-xs font-semibold text-gray-400 mt-1 uppercase tracking-wide">Tổng SP</p>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-emerald-200 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 flex-shrink-0">
              <CheckCircle size={22} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-gray-900 leading-none">{warehouseStats.available}</p>
              <p className="text-xs font-semibold text-gray-400 mt-1 uppercase tracking-wide">Còn hàng</p>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-red-200 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 flex-shrink-0">
              <AlertTriangle size={22} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-gray-900 leading-none">{warehouseStats.outOfStock}</p>
              <p className="text-xs font-semibold text-gray-400 mt-1 uppercase tracking-wide">Hết hàng</p>
            </div>
          </div>
        </div>
      )}
      {/* Search bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo tên sản phẩm hoặc mã SP..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-3 text-sm
                       focus:outline-none focus:ring-2 focus:ring-[#2d4a7a] focus:border-transparent
                       shadow-sm transition"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2">
          {[
            { key: 'all' as FilterType, label: 'Tất cả' },
            { key: 'available' as FilterType, label: 'Còn hàng' },
            { key: 'exported' as FilterType, label: 'Đã xuất' },
            { key: 'out_of_stock' as FilterType, label: 'Hết hàng' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap
                ${filter === f.key
                  ? 'bg-[#1B2A4A] text-white border-[#1B2A4A] shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#7b8db3]'
                }`}
            >
              {f.label}
            </button>
          ))}
          
          {/* Warehouse Dropdown */}
          {uniqueWarehouses.length > 0 && (
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              disabled={lockedWarehouse !== null}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#2d4a7a] ${lockedWarehouse ? 'opacity-70 cursor-not-allowed bg-gray-50' : ''}`}
            >
              {!lockedWarehouse && <option value="all">Tất cả kho</option>}
              {uniqueWarehouses
                .filter(w => !lockedWarehouse || w.toLowerCase().includes(lockedWarehouse.toLowerCase()) || lockedWarehouse.toLowerCase().includes(w.toLowerCase()))
                .map(w => (
                  <option key={w} value={w}>{w}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Sort + count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          <span className="font-bold text-gray-800">{filtered.length}</span> sản phẩm
          {query && <span> cho &quot;{query}&quot;</span>}
        </p>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortType)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#2d4a7a]"
        >
          <option value="name">Sắp xếp: Tên A-Z</option>
          <option value="code">Sắp xếp: Mã SP</option>
          <option value="price_asc">Giá: Thấp → Cao</option>
          <option value="price_desc">Giá: Cao → Thấp</option>
        </select>
      </div>

      {/* Product table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <Package size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Không tìm thấy sản phẩm nào</p>
          <p className="text-gray-400 text-sm mt-1">Thử từ khóa khác hoặc thay đổi bộ lọc</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-[35%]">Sản phẩm</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Mã SP</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Tổng SL</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Kho</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Loại hàng</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Tình trạng</th>
                  <th className="py-3 px-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((item, idx) => {
                  const rowKey = `${item.code}-${idx}`;
                  const isExpanded = expandedRow === rowKey;
                  const breakdown = item.warehouseBreakdown || [];

                  return (
                    <tr key={rowKey} className="hover:bg-gray-50 transition-colors align-top">
                      <td className="py-3 px-3">
                        <div className="flex items-start gap-2.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-10 h-10 object-contain rounded-lg border border-gray-100 bg-gray-50 flex-shrink-0 mt-0.5"
                          />
                          <span className="text-sm font-medium text-gray-800 leading-snug break-words">{item.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono text-xs font-bold text-[#1B2A4A] bg-[#eef1f7] px-2 py-1 rounded-lg">
                          {item.code}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold text-gray-800 text-base">{item.khaDung || '0'}</span>
                      </td>
                      <td className="py-3 px-3 text-center relative">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setExpandedRow(isExpanded ? null : rowKey); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100 border border-sky-200 transition-all"
                        >
                          <MapPin size={12} />
                          {breakdown.length} kho
                          <ChevronDown size={12} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        {isExpanded && breakdown.length > 0 && (
                          <div className="absolute z-20 top-full mt-1 right-0 w-56 bg-white border border-gray-200 rounded-xl shadow-xl p-2 space-y-1 text-left">
                            {breakdown.map((w, i) => (
                              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100">
                                <span className="text-xs font-medium text-gray-700">{w.name}</span>
                                <span className={`text-xs font-bold ${w.avail > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  Tồn {w.avail}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.status ? (
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full
                            ${item.status === 'Ký gửi'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-indigo-100 text-indigo-700'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'Ký gửi' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                            {item.status}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full
                          ${item.available
                            ? 'bg-emerald-100 text-emerald-700'
                            : item.isExported
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-red-100 text-red-700'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${item.available ? 'bg-emerald-500' : item.isExported ? 'bg-orange-500' : 'bg-red-500'}`} />
                          {item.available ? 'Còn hàng' : item.isExported ? 'Đã xuất' : 'Hết hàng'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <Link
                          href={`/inventory/${encodeURIComponent(item.code)}`}
                          className="text-xs font-semibold text-[#1B2A4A] hover:text-[#111a33] hover:bg-[#eef1f7] px-3 py-1.5 rounded-lg transition-all"
                        >
                          Chi tiết →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {filtered.map((item, idx) => {
              const rowKey = `m-${item.code}-${idx}`;
              const isExpanded = expandedRow === rowKey;
              const breakdown = item.warehouseBreakdown || [];

              return (
                <div key={rowKey} className="p-4 hover:bg-gray-50 transition-colors">
                  <Link href={`/inventory/${encodeURIComponent(item.code)}`} className="flex items-start gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-12 h-12 object-contain rounded-xl border border-gray-100 bg-gray-50 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm leading-snug break-words">{item.name}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="font-mono text-[10px] font-bold text-[#1B2A4A] bg-[#eef1f7] px-1.5 py-0.5 rounded">
                          {item.code}
                        </span>
                        <span className="text-xs font-bold text-gray-800">Tồn: {item.khaDung || '0'}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                          ${item.available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
                        >
                          {item.available ? 'Còn hàng' : 'Hết hàng'}
                        </span>
                      </div>
                    </div>
                  </Link>
                  {/* Warehouse button */}
                  {breakdown.length > 0 && (
                    <div className="mt-2 ml-[60px]">
                      <button
                        type="button"
                        onClick={() => setExpandedRow(isExpanded ? null : rowKey)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100 border border-sky-200 transition-all"
                      >
                        <MapPin size={11} />
                        Xem {breakdown.length} kho
                        <ChevronDown size={11} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      {isExpanded && (
                        <div className="mt-1.5 space-y-1">
                          {breakdown.map((w, i) => (
                            <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                              <span className="text-xs font-medium text-gray-700">📍 {w.name}</span>
                              <span className={`text-xs font-bold ${w.avail > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                Tồn {w.avail}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
