'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  /** Ẩn cột này trên mobile (giảm noise) */
  hideOnMobile?: boolean;
  /** Cột này là tiêu đề chính của card trên mobile (in đậm, cỡ to) */
  primaryOnMobile?: boolean;
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
  /** Custom render cho mỗi row khi xem trên mobile (card layout).
   *  Nếu không truyền, sẽ auto-stack columns thành cặp label/value. */
  mobileCardRender?: (row: T) => React.ReactNode;
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
  mobileCardRender,
}: DataTableProps<T>) {
  const [search,   setSearch]  = useState('');
  const [sortKey,  setSortKey] = useState<string | null>(null);
  const [sortAsc,  setSortAsc] = useState(true);
  const [page,     setPage]    = useState(1);
  const [sortPickerOpen, setSortPickerOpen] = useState(false);

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

  const sortableCols = columns.filter((c) => c.sortable);
  const primaryCol = columns.find((c) => c.primaryOnMobile) || columns[0];
  const secondaryCols = columns.filter((c) => c !== primaryCol && !c.hideOnMobile);

  return (
    <div className="space-y-3">

      {/* ── Toolbar ────────────────────────────────────── */}
      {(searchable || toolbarExtra) && (
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {searchable && (
            <div className="relative flex-1 min-w-[180px] sm:min-w-[220px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder={searchPlaceholder}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/15 focus:border-[#1B2A4A]
                           placeholder:text-gray-400 dark:placeholder:text-gray-500 dark:text-gray-100 transition-all shadow-sm"
              />
            </div>
          )}

          {toolbarExtra && (
            <div className="flex items-center gap-2 flex-wrap">{toolbarExtra}</div>
          )}

          {/* Sort picker for mobile (visible only on small screens, when there are sortable cols) */}
          {sortableCols.length > 0 && (
            <div className="relative sm:hidden">
              <button
                onClick={() => setSortPickerOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors shadow-sm"
              >
                <SlidersHorizontal size={15} className="text-gray-400 dark:text-gray-500" />
                Sắp xếp
              </button>
              {sortPickerOpen && (
                <div className="absolute right-0 top-12 z-30 w-56 bg-white dark:bg-[#162240] rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
                  {sortableCols.map((col) => (
                    <button
                      key={col.key}
                      onClick={() => { handleSort(col.key); setSortPickerOpen(false); }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                        sortKey === col.key ? 'text-[#1B2A4A] dark:text-indigo-400 font-semibold' : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      <span>{col.label}</span>
                      {sortKey === col.key && (
                        sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Mobile: Card list ─────────────────────────── */}
      <div className="sm:hidden space-y-2">
        {paged.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#162240] py-12 text-center">
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                <Search size={20} className="text-gray-300 dark:text-gray-500" />
              </div>
              <div className="text-sm font-medium">{emptyMessage}</div>
            </div>
          </div>
        ) : (
          paged.map((row, i) => (
            <div
              key={i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#162240] p-4 shadow-sm transition-all
                ${onRowClick ? 'cursor-pointer active:scale-[0.98] hover:border-[#1B2A4A]/30 hover:shadow-md' : ''}
              `}
            >
              {mobileCardRender ? (
                mobileCardRender(row)
              ) : (
                <>
                  {/* Primary heading */}
                  <div className="font-bold text-gray-900 dark:text-gray-100 text-base mb-2 truncate">
                    {primaryCol.render ? primaryCol.render(row) : String(row[primaryCol.key] ?? '—')}
                  </div>
                  {/* Secondary fields */}
                  <div className="space-y-1.5">
                    {secondaryCols.map((col) => {
                      const content = col.render ? col.render(row) : String(row[col.key] ?? '—');
                      return (
                        <div key={col.key} className="flex items-start justify-between gap-3 text-sm">
                          <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 flex-shrink-0 pt-0.5">
                            {col.label}
                          </span>
                          <span className="text-gray-700 dark:text-gray-200 text-right min-w-0 break-words">
                            {content}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Desktop: Table card ───────────────────────── */}
      <div className="hidden sm:block rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#162240] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/70 dark:bg-transparent">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                    className={`px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500
                      ${col.sortable ? 'cursor-pointer select-none hover:text-gray-600 dark:hover:text-gray-300' : ''}
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
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-5 py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                        <Search size={20} className="text-gray-300 dark:text-gray-500" />
                      </div>
                      <div className="text-sm font-medium">{emptyMessage}</div>
                    </div>
                  </td>
                </tr>
              ) : (
                paged.map((row, i) => (
                  <tr
                    key={i}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-[#f5f6fa] dark:hover:bg-white/5' : ''}`}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={`px-5 py-3.5 dark:text-gray-200 ${col.className || ''}`}>
                        {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination (shared) ──────────────────────── */}
      {(searchable || filtered.length > 0) && (
        <div className="flex items-center justify-between px-3 py-2.5 sm:px-5 sm:py-3 rounded-xl sm:rounded-none sm:border-t border border-gray-200 sm:border-x-0 sm:border-b-0 dark:border-white/10 sm:dark:border-white/5 bg-gray-50/60 dark:bg-white/[0.02] sm:bg-transparent">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {filtered.length} kết quả
            {totalPages > 1 && ` · Trang ${safeP}/${totalPages}`}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, safeP - 1))}
                disabled={safeP <= 1}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                      ${pg === safeP ? 'bg-[#1B2A4A] dark:bg-indigo-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400'}`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(Math.min(totalPages, safeP + 1))}
                disabled={safeP >= totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
