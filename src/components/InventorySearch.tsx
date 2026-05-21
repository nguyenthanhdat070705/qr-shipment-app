'use client';

import { useState, useMemo, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Package, ChevronDown, MapPin, Warehouse, CheckCircle, XCircle } from 'lucide-react';
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
  isActive: boolean;
  lots?: string[];
  warehouseBreakdown?: WarehouseBreakdown[];
  typeBreakdown?: Record<string, number>;
}

type FilterType = 'all' | 'available' | 'exported' | 'out_of_stock';
type SortType = 'name' | 'price_asc' | 'price_desc' | 'code';

function getLockedWarehouseFromStorage() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('auth_user');
    if (!stored) return null;
    const user = JSON.parse(stored);
    return user.email ? getWarehouseFilter(user.email) : null;
  } catch (e) {
    console.error('Error reading auth_user', e);
    return null;
  }
}

export default function InventorySearch({ items, showStats = false }: { items: InventoryItem[]; showStats?: boolean }) {
  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get('filter') as FilterType) || 'all';
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>(initialFilter);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Đã mua' | 'Ký gửi'>('all');
  const sort: SortType = 'name';
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const lockedWarehouse = useSyncExternalStore(
    () => () => {},
    getLockedWarehouseFromStorage,
    () => null
  );
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const uniqueWarehouses = useMemo(() => {
    const ws = new Set<string>();
    items.forEach(i => {
      if (i.warehouse && i.warehouse !== '—') {
        i.warehouse.split(', ').forEach(w => ws.add(w.trim()));
      }
    });
    return Array.from(ws).sort();
  }, [items]);

  const effectiveWarehouseFilter = useMemo(() => {
    if (!lockedWarehouse || uniqueWarehouses.length === 0) return warehouseFilter;
    const matched = uniqueWarehouses.find(
      w => w.toLowerCase().includes(lockedWarehouse.toLowerCase()) ||
           lockedWarehouse.toLowerCase().includes(w.toLowerCase())
    );
    return matched || lockedWarehouse;
  }, [lockedWarehouse, uniqueWarehouses, warehouseFilter]);

  const filtered = useMemo(() => {
    let result: InventoryItem[];

    // Warehouse Filter: nếu có filter kho, re-map items theo tồn kho riêng của kho đó
    if (effectiveWarehouseFilter !== 'all') {
      const filterLower = effectiveWarehouseFilter.toLowerCase().trim();

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

    // Status Filter — tính trực tiếp từ tonKho/khaDung để tránh flag stale
    switch (filter) {
      case 'available':
        result = result.filter((i) => Number(i.khaDung || '0') > 0);
        break;
      case 'exported':
        // Đã xuất: còn hàng trong kho (tonKho > 0) nhưng không khả dụng (khaDung = 0)
        result = result.filter((i) => Number(i.tonKho || '0') > 0 && Number(i.khaDung || '0') <= 0);
        break;
      case 'out_of_stock':
        // Hết hàng thật sự: không còn gì cả (tonKho = 0 và khaDung = 0)
        result = result.filter((i) => Number(i.tonKho || '0') <= 0 && Number(i.khaDung || '0') <= 0);
        break;
    }
    
    // Active filter
    if (activeFilter === 'active') {
      result = result.filter((i) => i.isActive);
    } else if (activeFilter === 'inactive') {
      result = result.filter((i) => !i.isActive);
    }
    
    // Type filter (Đã mua / Ký gửi)
    if (typeFilter !== 'all') {
      result = result.filter((i) => {
        if (i.typeBreakdown) {
          return Object.keys(i.typeBreakdown).includes(typeFilter);
        }
        return i.status && i.status.includes(typeFilter);
      });
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
  }, [items, query, filter, sort, effectiveWarehouseFilter, activeFilter, typeFilter]);


  // Stats tính từ dữ liệu kho — dùng bd.qty/avail trực tiếp để nhất quán
  const warehouseStats = useMemo(() => {
    const baseItems = effectiveWarehouseFilter === 'all'
      ? items
      : items
          .map(item => {
            const filterLower = effectiveWarehouseFilter.toLowerCase().trim();
            const bd = item.warehouseBreakdown?.find(w =>
              w.name.toLowerCase().includes(filterLower) ||
              filterLower.includes(w.name.toLowerCase())
            );
            if (!bd) return null;
            // Override tonKho/khaDung với giá trị của kho cụ thể
            return { ...item, tonKho: String(bd.qty), khaDung: String(bd.avail) } as InventoryItem;
          })
          .filter((i): i is InventoryItem => i !== null);

    return {
      total: baseItems.length,
      active: baseItems.filter(i => i.isActive).length,
      inactive: baseItems.filter(i => !i.isActive).length,
      totalStock: baseItems.reduce((sum, i) => sum + Number(i.khaDung || '0'), 0),
      warehouseName: lockedWarehouse || 'Tất cả kho',
    };
  }, [items, effectiveWarehouseFilter, lockedWarehouse]);

  return (
    <div className="space-y-4 px-2 sm:px-0 w-full max-w-full">
      {/* Stat cards — hiển thị khi showStats=true hoặc khi có lockedWarehouse */}
      {(showStats || lockedWarehouse) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 w-full">
          {/* Card 1: Tổng SP */}
          <div className="rounded-2xl bg-white dark:bg-[#162240] border border-[#d5dbe9] dark:border-white/10 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#eef1f7] dark:bg-white/5 flex-shrink-0">
              <Warehouse size={22} className="text-[#1B2A4A] dark:text-gray-300" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white leading-none">{warehouseStats.total}</p>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wide">LOẠI HÒM</p>
            </div>
          </div>
          {/* Card 2: SP Đang bán */}
          <div className="rounded-2xl bg-white dark:bg-[#162240] border border-blue-200 dark:border-blue-500/30 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10 flex-shrink-0">
              <CheckCircle size={22} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white leading-none">{warehouseStats.active}</p>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wide">SP Đang bán</p>
            </div>
          </div>
          {/* Card 3: SP Ngừng bán */}
          <div className="rounded-2xl bg-white dark:bg-[#162240] border border-red-200 dark:border-red-500/30 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10 flex-shrink-0">
              <XCircle size={22} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white leading-none">{warehouseStats.inactive}</p>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wide">SP Ngừng bán</p>
            </div>
          </div>
          {/* Card 4: Tổng tồn kho */}
          <div className="rounded-2xl bg-white dark:bg-[#162240] border border-emerald-200 dark:border-emerald-500/30 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex-shrink-0">
              <Package size={22} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white leading-none">{warehouseStats.totalStock}</p>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wide">Tổng tồn kho</p>
            </div>
          </div>
        </div>
      )}
      {/* Search bar */}
      <div className="flex flex-col xl:flex-row gap-3">
        <div className="relative w-full xl:w-[500px] lg:w-[400px]">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Tìm theo tên sản phẩm hoặc mã SP..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#162240] pl-10 pr-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500
                       focus:outline-none focus:ring-2 focus:ring-[#2d4a7a] dark:focus:ring-indigo-500/30 focus:border-transparent
                       shadow-sm transition"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2 flex-1">
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
                  ? 'bg-[#1B2A4A] dark:bg-indigo-600 text-white border-[#1B2A4A] dark:border-indigo-500 shadow-sm'
                  : 'bg-white dark:bg-[#162240] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-[#7b8db3] dark:hover:border-white/20'
                }`}
            >
              {f.label}
            </button>
          ))}
          
          {/* Warehouse Dropdown */}
          {uniqueWarehouses.length > 0 && (
            <select
              value={effectiveWarehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              disabled={lockedWarehouse !== null}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-white/10 bg-white dark:bg-[#162240] text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#2d4a7a] dark:focus:ring-indigo-500/30 ${lockedWarehouse ? 'opacity-70 cursor-not-allowed bg-gray-50 dark:bg-white/5' : ''}`}
            >
              {!lockedWarehouse && <option value="all">Tất cả kho</option>}
              {uniqueWarehouses
                .filter(w => !lockedWarehouse || w.toLowerCase().includes(lockedWarehouse.toLowerCase()) || lockedWarehouse.toLowerCase().includes(w.toLowerCase()))
                .map(w => (
                  <option key={w} value={w}>{w}</option>
              ))}
            </select>
          )}

          {/* Active Status Dropdown */}
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-white/10 bg-white dark:bg-[#162240] text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#2d4a7a] dark:focus:ring-indigo-500/30`}
          >
            <option value="all">Tất cả hoạt động</option>
            <option value="active">Đang bán</option>
            <option value="inactive">Ngừng bán</option>
          </select>

          {/* Type Dropdown (Đã mua / Ký gửi) */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'Đã mua' | 'Ký gửi')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-white/10 bg-white dark:bg-[#162240] text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#2d4a7a] dark:focus:ring-indigo-500/30`}
          >
            <option value="all">Tất cả hàng hoá</option>
            <option value="Đã mua">Hàng đã mua</option>
            <option value="Ký gửi">Hàng ký gửi</option>
          </select>
        </div>
      </div>

      {/* Count */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-1 sm:px-0">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <span className="font-bold text-gray-800 dark:text-white">{filtered.length}</span> sản phẩm
          {query && <span> cho &quot;{query}&quot;</span>}
        </p>
      </div>

      {/* Product table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#162240] rounded-2xl border border-gray-200 dark:border-white/10 mx-2 sm:mx-0">
          <Package size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Không tìm thấy sản phẩm nào</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Thử từ khóa khác hoặc thay đổi bộ lọc</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#162240] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm mx-2 sm:mx-0 w-full">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[1040px] text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                  <th className="text-left py-3 px-5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Sản phẩm</th>
                  <th className="text-center py-3 px-5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Mã SP</th>
                  <th className="text-center py-3 px-5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Giá bán</th>
                  <th className="text-center py-3 px-5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Tổng SL</th>
                  <th className="text-center py-3 px-5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Kho</th>
                  <th className="text-center py-3 px-5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Loại hàng</th>
                  <th className="text-center py-3 px-5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Tình trạng</th>
                  <th className="text-center py-3 px-5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Hoạt động</th>
                  <th className="text-center py-3 px-5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filtered.map((item, idx) => {
                  const rowKey = `${item.code}-${idx}`;
                  const isExpanded = expandedRow === rowKey;
                  const breakdown = item.warehouseBreakdown || [];

                  return (
                    <tr key={rowKey} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors align-top">
                      <td className="py-3 px-5">
                        <div className="flex items-start gap-2.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-10 h-10 object-contain rounded-lg border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex-shrink-0 mt-0.5"
                          />
                          <span className="text-sm font-medium text-gray-800 dark:text-white leading-snug break-words">{item.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-center">
                        <span className="font-mono text-xs font-bold text-[#1B2A4A] dark:text-indigo-300 bg-[#eef1f7] dark:bg-indigo-500/20 px-2 py-1 rounded-lg">
                          {item.code}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-center">
                        <span className="text-gray-700 dark:text-gray-300 font-semibold">{item.price ? new Intl.NumberFormat('vi-VN').format(item.price) + 'đ' : '—'}</span>
                      </td>
                      <td className="py-3 px-5 text-center">
                        <span className="font-bold text-gray-800 dark:text-white text-base">{item.khaDung || '0'}</span>
                      </td>
                      <td className="py-3 px-5 text-center relative">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setExpandedRow(isExpanded ? null : rowKey); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 text-xs font-semibold hover:bg-sky-100 dark:hover:bg-sky-500/20 border border-sky-200 dark:border-sky-500/30 transition-all"
                        >
                          <MapPin size={12} />
                          {breakdown.length} kho
                          <ChevronDown size={12} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        {isExpanded && breakdown.length > 0 && (
                          <div className="absolute z-20 top-full mt-1 right-0 w-56 bg-white dark:bg-[#1e2f5c] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl p-2 space-y-1 text-left">
                            {breakdown.map((w, i) => (
                              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{w.name}</span>
                                <span className={`text-xs font-bold ${w.avail > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                  Tồn {w.avail}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-5 text-center">
                        {item.typeBreakdown && Object.keys(item.typeBreakdown).length > 0 ? (
                          <div className="flex flex-col gap-1 items-center">
                            {Object.entries(item.typeBreakdown).map(([type, qty]) => (
                              <span key={type} className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap
                                ${type === 'Ký gửi'
                                  ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                  : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${type === 'Ký gửi' ? 'bg-amber-500 dark:bg-amber-400' : 'bg-indigo-500 dark:bg-indigo-400'}`} />
                                {type}: {qty}
                              </span>
                            ))}
                          </div>
                        ) : item.status ? (
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full
                            ${item.status === 'Ký gửi'
                              ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                              : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'Ký gửi' ? 'bg-amber-500 dark:bg-amber-400' : 'bg-indigo-500 dark:bg-indigo-400'}`} />
                            {item.status}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-center">
                        {(() => {
                          const _avail = Number(item.khaDung || '0');
                          const _qty   = Number(item.tonKho   || '0');
                          const _ok  = _avail > 0;
                          const _exp = !_ok && _qty > 0;
                          return (
                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap
                              ${_ok  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                              : _exp ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400'
                              :        'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${_ok ? 'bg-emerald-500 dark:bg-emerald-400' : _exp ? 'bg-orange-500 dark:bg-orange-400' : 'bg-red-500 dark:bg-red-400'}`} />
                              {_ok ? 'Còn hàng' : _exp ? 'Đã xuất' : 'Hết hàng'}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-5 text-center">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap
                          ${item.isActive ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300'}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${item.isActive ? 'bg-blue-500 dark:bg-blue-400' : 'bg-gray-400 dark:bg-gray-500'}`} />
                          {item.isActive ? 'Đang bán' : 'Ngừng bán'}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-center">
                        <Link
                          href={`/inventory/${encodeURIComponent(item.code.trim())}`}
                          className="text-xs font-semibold text-[#1B2A4A] dark:text-indigo-300 hover:text-[#111a33] dark:hover:text-indigo-200 hover:bg-[#eef1f7] dark:hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all"
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
          <div className="md:hidden divide-y divide-gray-100 dark:divide-white/5">
            {filtered.map((item, idx) => {
              const rowKey = `m-${item.code}-${idx}`;
              const isExpanded = expandedRow === rowKey;
              const breakdown = item.warehouseBreakdown || [];

              return (
                <div key={rowKey} className="p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <Link href={`/inventory/${encodeURIComponent(item.code.trim())}`} className="flex items-start gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-12 h-12 object-contain rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 dark:text-white text-sm leading-snug break-words">{item.name}</p>
                      <p className="text-[#1B2A4A] dark:text-indigo-300 font-semibold text-xs mt-0.5">{item.price ? new Intl.NumberFormat('vi-VN').format(item.price) + 'đ' : '—'}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="font-mono text-[10px] font-bold text-[#1B2A4A] dark:text-indigo-300 bg-[#eef1f7] dark:bg-indigo-500/20 px-1.5 py-0.5 rounded">
                          {item.code}
                        </span>
                        <span className="text-xs font-bold text-gray-800 dark:text-white">Tồn: {item.khaDung || '0'}</span>
                        {(() => {
                          const _avail = Number(item.khaDung || '0');
                          const _qty   = Number(item.tonKho   || '0');
                          const _ok  = _avail > 0;
                          const _exp = !_ok && _qty > 0;
                          return (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                              ${_ok ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : _exp ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}
                            >
                              {_ok ? 'Còn hàng' : _exp ? 'Đã xuất' : 'Hết hàng'}
                            </span>
                          );
                        })()}
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${item.isActive ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300'}`}>
                          {item.isActive ? 'Đang bán' : 'Ngừng bán'}
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
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 text-xs font-semibold hover:bg-sky-100 dark:hover:bg-sky-500/20 border border-sky-200 dark:border-sky-500/30 transition-all"
                      >
                        <MapPin size={11} />
                        Xem {breakdown.length} kho
                        <ChevronDown size={11} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      {isExpanded && (
                        <div className="mt-1.5 space-y-1">
                          {breakdown.map((w, i) => (
                            <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">📍 {w.name}</span>
                              <span className={`text-xs font-bold ${w.avail > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
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
