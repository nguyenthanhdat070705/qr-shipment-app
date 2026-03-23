'use client';

import { useState, useMemo } from 'react';
import { Search, Package, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

interface InventoryItem {
  code: string;
  name: string;
  price: number;
  status: string;
  tonKho: string;
  warehouse: string;
  serial: string;
  imageUrl: string;
  isExported: boolean;
  isOutOfStock: boolean;
  available: boolean;
}

type FilterType = 'all' | 'available' | 'exported' | 'out_of_stock';
type SortType = 'name' | 'price_asc' | 'price_desc' | 'code';

export default function InventorySearch({ items }: { items: InventoryItem[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('name');

  const filtered = useMemo(() => {
    let result = [...items];

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

    // Filter
    switch (filter) {
      case 'available':
        result = result.filter((i) => i.available);
        break;
      case 'exported':
        result = result.filter((i) => i.isExported);
        break;
      case 'out_of_stock':
        result = result.filter((i) => i.isOutOfStock && !i.isExported);
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
  }, [items, query, filter, sort]);

  return (
    <div className="space-y-4">
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
                  <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide">Sản phẩm</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide">Mã SP</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide">Giá bán</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide">Kho</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide">Tình trạng</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((item) => (
                  <tr key={item.code} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-12 h-12 object-contain rounded-lg border border-gray-100 bg-gray-50 flex-shrink-0"
                        />
                        <span className="font-medium text-gray-800 line-clamp-2 leading-tight">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-bold text-[#1B2A4A] bg-[#eef1f7] px-2 py-1 rounded-lg">
                        {item.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {item.price > 0 ? (
                        <span className="font-bold text-gray-800">
                          {item.price.toLocaleString('vi-VN')}
                          <span className="text-gray-400 font-normal text-xs ml-0.5">₫</span>
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs text-gray-600">{item.warehouse}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full
                        ${item.isExported
                          ? 'bg-green-100 text-green-700'
                          : item.available
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-red-100 text-red-700'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          item.isExported ? 'bg-green-500' : item.available ? 'bg-blue-500' : 'bg-red-500'
                        }`} />
                        {item.isExported ? 'Đã xuất' : item.available ? 'Còn hàng' : 'Hết hàng'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/product/${encodeURIComponent(item.code)}`}
                        className="text-xs font-semibold text-[#1B2A4A] hover:text-[#111a33] transition-colors"
                      >
                        Chi tiết →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {filtered.map((item) => (
              <Link
                key={item.code}
                href={`/product/${encodeURIComponent(item.code)}`}
                className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-14 h-14 object-contain rounded-xl border border-gray-100 bg-gray-50 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm line-clamp-1">{item.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-[10px] font-bold text-[#1B2A4A] bg-[#eef1f7] px-1.5 py-0.5 rounded">
                      {item.code}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                      ${item.isExported
                        ? 'bg-green-100 text-green-700'
                        : item.available
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {item.isExported ? 'Đã xuất' : item.available ? 'Còn hàng' : 'Hết hàng'}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {item.price > 0 ? (
                    <p className="font-bold text-sm text-gray-800">
                      {item.price.toLocaleString('vi-VN')}₫
                    </p>
                  ) : (
                    <p className="text-gray-300 text-sm">—</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
