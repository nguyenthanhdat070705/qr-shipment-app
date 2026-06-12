'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import DataTable from '@/components/DataTable';
import ModuleFilters from './ModuleFilters';
import { cellText, isImageUrl } from './cell';
import type { CrmModule } from '@/config/crmModules';

type Row = Record<string, string>;

export default function ModuleTab({ module }: { module: CrmModule }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Row | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setSearch('');
    setFilters({});
    setSelected(null);
    fetch(`/api/crm/${module.key}?limit=20000`)
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (d.error) setError(d.error);
        else setRows(d.rows || []);
      })
      .catch((e) => active && setError(String(e)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [module.key]);

  const filterCols = useMemo(() => module.columns.filter((c) => c.filter), [module]);
  const tableCols = useMemo(() => module.columns.filter((c) => c.table), [module]);

  const distinct = useMemo(() => {
    const d: Record<string, string[]> = {};
    for (const col of filterCols) {
      if (col.filter !== 'select') continue;
      const set = new Set<string>();
      for (const r of rows) {
        const v = String(r[col.key] ?? '').trim();
        if (v) set.add(v);
      }
      d[col.key] = Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
    }
    return d;
  }, [rows, filterCols]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Cho SĐT/CCCD: so khớp theo chữ số, bỏ số 0 đầu → tìm "0975..." ⇄ "975..." đều ra.
    const qDigits = q.replace(/\D/g, '').replace(/^0+/, '');
    return rows.filter((r) => {
      if (q) {
        const hit = module.searchKeys.some((k) => {
          const val = String(r[k] ?? '').toLowerCase();
          if (val.includes(q)) return true;
          if (qDigits) {
            const vDigits = val.replace(/\D/g, '').replace(/^0+/, '');
            if (vDigits && vDigits.includes(qDigits)) return true;
          }
          return false;
        });
        if (!hit) return false;
      }
      for (const col of filterCols) {
        if (col.filter === 'select') {
          const fv = filters[col.key];
          if (fv && String(r[col.key] ?? '') !== fv) return false;
        } else if (col.filter === 'date') {
          const from = filters[`${col.key}__from`];
          const to = filters[`${col.key}__to`];
          const val = String(r[col.key] ?? '').slice(0, 10);
          if (from && (!val || val < from)) return false;
          if (to && (!val || val > to)) return false;
        }
      }
      return true;
    });
  }, [rows, search, filters, filterCols, module.searchKeys]);

  const hasActive = !!search || Object.values(filters).some(Boolean);

  const columns = tableCols.map((col, i) => ({
    key: col.key,
    label: col.label,
    sortable: true,
    primaryOnMobile: i === 0,
    hideOnMobile: i > 2,
    render: (row: Row) => {
      const text = cellText(col, row[col.key]);
      if (col.type === 'money') return <span className="font-semibold tabular-nums whitespace-nowrap">{text}</span>;
      if (i === 0) return <span className="font-semibold text-[#1B2A4A] dark:text-indigo-300">{text}</span>;
      return <span className={text === '—' ? 'text-gray-300 dark:text-gray-600' : ''}>{text}</span>;
    },
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-gray-400">
        <Loader2 size={18} className="animate-spin" /> Đang tải {module.label}...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <AlertTriangle size={28} className="text-amber-500" />
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">Không tải được dữ liệu</div>
        <div className="text-xs text-gray-400 max-w-md">{error}</div>
        <div className="text-xs text-gray-400">Có thể bảng <code>{module.table}</code> chưa được tạo — chạy SQL & bấm “Sync ngay”.</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ModuleFilters
        filterCols={filterCols}
        distinct={distinct}
        values={filters}
        onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        search={search}
        onSearch={setSearch}
        onReset={() => { setSearch(''); setFilters({}); }}
        hasActive={hasActive}
        total={rows.length}
        shown={filtered.length}
        searchPlaceholder={`Tìm trong ${module.label}...`}
      />
      <DataTable
        data={filtered}
        columns={columns}
        searchable={false}
        pageSize={15}
        onRowClick={(r) => setSelected(r)}
        emptyMessage={rows.length ? 'Không có bản ghi khớp bộ lọc.' : `Chưa có dữ liệu ${module.label}. Bấm “Sync ngay” để nạp từ Google Sheets.`}
      />
      {selected && <RecordDetail module={module} row={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function RecordDetail({ module, row, onClose }: { module: CrmModule; row: Row; onClose: () => void }) {
  const tableCols = module.columns.filter((c) => c.table);
  const title = tableCols.length ? cellText(tableCols[0], row[tableCols[0].key]) : module.label;
  const subtitle = tableCols.length > 1 ? cellText(tableCols[1], row[tableCols[1].key]) : '';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative w-full sm:max-w-xl bg-white dark:bg-[#101a33] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/10 shrink-0">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#1B2A4A] dark:text-indigo-300">{module.label}</div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{title}</div>
            {subtitle && subtitle !== '—' && <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 shrink-0">
            <X size={18} />
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-2 flex-1">
          {module.columns.map((col) => {
            const v = String(row[col.key] ?? '');
            const empty = v.trim() === '';
            return (
              <div key={col.key} className="grid grid-cols-3 gap-3 py-2.5 border-b border-gray-50 dark:border-white/5">
                <span className="col-span-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 pt-0.5">{col.label}</span>
                <span className="col-span-2 text-sm dark:text-gray-200 break-words">
                  {col.type === 'image' && !empty && isImageUrl(v) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v} alt={col.label} className="h-24 rounded-lg border border-gray-200 dark:border-white/10 object-cover" />
                  ) : empty ? (
                    <span className="text-gray-300 dark:text-gray-600">—</span>
                  ) : col.type === 'money' || col.type === 'percent' ? (
                    <span className="font-semibold tabular-nums">{cellText(col, v)}</span>
                  ) : (
                    cellText(col, v)
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
