'use client';

import { Search, RotateCcw } from 'lucide-react';
import type { CrmColumn } from '@/config/crmModules';

interface ModuleFiltersProps {
  filterCols: CrmColumn[];
  /** distinct values cho cột select (key = col.key) */
  distinct: Record<string, string[]>;
  /** giá trị filter hiện tại; date dùng key `${col}__from` / `${col}__to` */
  values: Record<string, string>;
  onChange: (key: string, val: string) => void;
  search: string;
  onSearch: (v: string) => void;
  onReset: () => void;
  hasActive: boolean;
  total: number;
  shown: number;
  searchPlaceholder?: string;
}

const inputCls =
  'px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/15 focus:border-[#1B2A4A] dark:text-gray-100 shadow-sm';

export default function ModuleFilters({
  filterCols, distinct, values, onChange, search, onSearch, onReset, hasActive, total, shown, searchPlaceholder,
}: ModuleFiltersProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder || 'Tìm kiếm...'}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/15 focus:border-[#1B2A4A]
                       placeholder:text-gray-400 dark:text-gray-100 transition-all shadow-sm`}
          />
        </div>

        {/* Filters */}
        {filterCols.map((col) => {
          if (col.filter === 'date') {
            return (
              <div key={col.key} className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide hidden lg:inline">{col.label}</span>
                <input
                  type="date"
                  value={values[`${col.key}__from`] || ''}
                  onChange={(e) => onChange(`${col.key}__from`, e.target.value)}
                  className={inputCls}
                  title={`${col.label} từ`}
                />
                <span className="text-gray-300">–</span>
                <input
                  type="date"
                  value={values[`${col.key}__to`] || ''}
                  onChange={(e) => onChange(`${col.key}__to`, e.target.value)}
                  className={inputCls}
                  title={`${col.label} đến`}
                />
              </div>
            );
          }
          // select
          const opts = distinct[col.key] || [];
          return (
            <select
              key={col.key}
              value={values[col.key] || ''}
              onChange={(e) => onChange(col.key, e.target.value)}
              className={`${inputCls} max-w-[180px]`}
              title={col.label}
            >
              <option value="">{col.label}: Tất cả</option>
              {opts.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          );
        })}

        {hasActive && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors shadow-sm"
          >
            <RotateCcw size={14} /> Xoá lọc
          </button>
        )}
      </div>

      <div className="text-xs text-gray-400 dark:text-gray-500">
        Hiển thị <span className="font-semibold text-gray-600 dark:text-gray-300">{shown.toLocaleString('vi-VN')}</span>
        {shown !== total && <> / {total.toLocaleString('vi-VN')}</>} bản ghi
      </div>
    </div>
  );
}
