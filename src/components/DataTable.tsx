'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  /** Optional extra controls rendered next to the search bar */
  toolbarExtra?: React.ReactNode;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchable = true,
  searchPlaceholder = 'Tìm kiếm...',
  pageSize = 10,
  onRowClick,
  emptyMessage = 'Không có dữ liệu.',
  toolbarExtra,
}: DataTableProps<T>) {
  const [search,   setSearch]  = useState('');
  const [sortKey,  setSortKey] = useState<string | null>(null);
  const [sortAsc,  setSortAsc] = useState(true);
  const [page,     setPage]    = useState(1);

  const filtered = useMemo(() => {
    let result = data;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          const val = row[col.key];
          return val != null && String(val).toLowerCase().includes(q);
        })
      );
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const va = a[sortKey] ?? '';
        const vb = b[sortKey] ?? '';
        const cmp = String(va).localeCompare(String(vb), 'vi');
        return sortAsc ? cmp : -cmp;
      });
    }
    return result;
  }, [data, search, sortKey, sortAsc, columns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safeP = Math.min(page, totalPages);
  const paged = filtered.slice((safeP - 1) * pageSize, safeP * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  return (
    <div className="space-y-3">

      {/* ── Toolbar ────────────────────────────────────── */}
      {(searchable || toolbarExtra) && (
        <div className="flex items-center gap-3 flex-wrap">
          {searchable && (
            <div className="relative flex-1 min-w-[220px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder={searchPlaceholder}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/15 focus:border-[#1B2A4A]
                           placeholder:text-gray-400 transition-all shadow-sm"
              />
            </div>
          )}

          {toolbarExtra && (
            <div className="flex items-center gap-2">{toolbarExtra}</div>
          )}

          <button className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
            <SlidersHorizontal size={15} className="text-gray-400" />
            Bộ lọc
          </button>
        </div>
      )}

      {/* ── Table card ─────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                    className={`px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400
                      ${col.sortable ? 'cursor-pointer select-none hover:text-gray-600' : ''}
                      ${col.className || ''}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.sortable && sortKey === col.key && (
                        sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-5 py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                        <Search size={20} className="text-gray-300" />
                      </div>
                      <p className="text-sm font-medium">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paged.map((row, i) => (
                  <tr
                    key={i}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-[#f5f6fa]' : ''}`}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={`px-5 py-3.5 ${col.className || ''}`}>
                        {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ───────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/40">
          <span className="text-xs text-gray-400">
            {filtered.length} kết quả
            {totalPages > 1 && ` · Trang ${safeP}/${totalPages}`}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, safeP - 1))}
                disabled={safeP <= 1}
                className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pg = Math.max(1, Math.min(safeP - 2, totalPages - 4)) + i;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors
                      ${pg === safeP ? 'bg-[#1B2A4A] text-white' : 'hover:bg-gray-200 text-gray-600'}`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(Math.min(totalPages, safeP + 1))}
                disabled={safeP >= totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
