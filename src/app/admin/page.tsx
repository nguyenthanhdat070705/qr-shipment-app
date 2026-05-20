'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Filter,
  LayoutGrid,
  RefreshCw,
  Search,
  Shield,
  Wallet,
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';

type DashboardRow = {
  id: string;
  ma_hom: string;
  ten_hom: string;
  ten_goc: string;
  serviceType: string;
  dimensions: Record<string, string>;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  totalImport: number;
  totalExport: number;
  stockQty: number;
  importValue: number;
  exportValue: number;
  stockValue: number;
  isActive: boolean;
};

type DashboardData = {
  totals: {
    productTypes: number;
    totalImport: number;
    totalExport: number;
    stockQty: number;
    importValue: number;
    exportValue: number;
    stockValue: number;
  };
  groups: {
    label: string;
    productTypes: number;
    totalImport: number;
    totalExport: number;
    stockQty: number;
    stockValue: number;
  }[];
  filters: Record<string, string[]>;
  rows: DashboardRow[];
  warnings?: Record<string, string | null>;
};

const filterFields = [
  { key: 'serviceType', label: 'Nghi thức' },
  { key: 'Muc_dich', label: 'Mục đích' },
  { key: 'nhom_hang_hoa', label: 'Nhóm hàng' },
  { key: 'loai_san_pham', label: 'Loại SP' },
  { key: 'loai_go', label: 'Loại gỗ' },
  { key: 'Goi_dich_vu', label: 'Gói dịch vụ' },
  { key: 'Ton_giao', label: 'Tôn giáo' },
  { key: 'Nguon_goc', label: 'Nguồn gốc' },
];

function formatNumber(value: number): string {
  return value.toLocaleString('vi-VN');
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString('vi-VN');
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function metricColor(label: string): string {
  if (label === 'Hỏa táng') return 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20';
  if (label === 'An táng') return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20';
  return 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-white/5 dark:text-gray-300 dark:border-white/10';
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#162240]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-3 text-3xl font-black leading-none tracking-tight text-gray-950 dark:text-white">{value}</p>
          <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">{sub}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="min-w-0">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:ring-red-500/10"
      >
        <option value="">Tất cả</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/hom-dashboard', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không tải được dữ liệu dashboard.');
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const filteredRows = useMemo(() => {
    const q = normalize(search.trim());
    return (data?.rows || []).filter((row) => {
      if (q) {
        const haystack = normalize([
          row.ma_hom,
          row.ten_hom,
          row.ten_goc,
          row.serviceType,
          ...Object.values(row.dimensions || {}),
        ].join(' '));
        if (!haystack.includes(q)) return false;
      }

      return filterFields.every(({ key }) => {
        const selected = filters[key];
        if (!selected) return true;
        const value = key === 'serviceType' ? row.serviceType : row.dimensions?.[key];
        return value === selected;
      });
    });
  }, [data?.rows, filters, search]);

  const filteredTotals = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        acc.productTypes += 1;
        acc.totalImport += row.totalImport;
        acc.totalExport += row.totalExport;
        acc.stockQty += row.stockQty;
        acc.importValue += row.importValue;
        acc.exportValue += row.exportValue;
        acc.stockValue += row.stockValue;
        return acc;
      },
      {
        productTypes: 0,
        totalImport: 0,
        totalExport: 0,
        stockQty: 0,
        importValue: 0,
        exportValue: 0,
        stockValue: 0,
      }
    );
  }, [filteredRows]);

  const activeWarnings = Object.values(data?.warnings || {}).filter(Boolean);

  return (
    <PageLayout title="Admin Dashboard" icon={<Shield size={15} className="text-red-500" />}>
      <div className="space-y-6 pb-8">
        <section className="rounded-2xl border border-gray-200/70 bg-white px-6 py-7 shadow-sm dark:border-white/10 dark:bg-[#162240] sm:px-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                <Shield size={13} />
                Quản trị hòm
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-gray-950 dark:text-white sm:text-4xl">
                  Admin Dashboard
                </h1>
                <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-gray-500 dark:text-gray-400">
                  Tổng nhập, tổng xuất, giá trị và phân loại từng mã hòm theo dữ liệu Dim Hòm.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchDashboard}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-950 px-4 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white dark:text-gray-950"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </button>
          </div>
        </section>

        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {activeWarnings.length > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            Một phần dữ liệu nhập/xuất/tồn chưa đọc được. Bảng vẫn hiển thị các phần dữ liệu còn lại.
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={<Boxes size={22} />}
            label="Loại hòm"
            value={loading ? '...' : formatNumber(filteredTotals.productTypes)}
            sub={`${formatNumber(data?.totals.productTypes || 0)} mã trong Dim Hòm`}
            tone="bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white"
          />
          <KpiCard
            icon={<ArrowDownToLine size={22} />}
            label="Tổng nhập"
            value={loading ? '...' : formatNumber(filteredTotals.totalImport)}
            sub={`${formatCurrency(filteredTotals.importValue)}₫ giá trị nhập`}
            tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
          />
          <KpiCard
            icon={<ArrowUpFromLine size={22} />}
            label="Tổng xuất"
            value={loading ? '...' : formatNumber(filteredTotals.totalExport)}
            sub={`${formatCurrency(filteredTotals.exportValue)}₫ giá trị xuất`}
            tone="bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
          />
          <KpiCard
            icon={<Wallet size={22} />}
            label="Giá trị tồn"
            value={loading ? '...' : `${formatCurrency(filteredTotals.stockValue)}₫`}
            sub={`${formatNumber(filteredTotals.stockQty)} hòm đang tồn`}
            tone="bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
          />
        </section>

        <section className="rounded-2xl border border-gray-200/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#162240]">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-200">
              <Filter size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-950 dark:text-white">Bộ lọc Dim Hòm</h2>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{formatNumber(filteredRows.length)} dòng phù hợp</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="xl:col-span-2">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Tìm kiếm</span>
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Mã hòm, tên hòm, loại gỗ, mục đích..."
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-sm font-semibold text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-red-300 focus:ring-4 focus:ring-red-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:ring-red-500/10"
                />
              </div>
            </label>

            {filterFields.map(({ key, label }) => (
              <SelectFilter
                key={key}
                label={label}
                value={filters[key] || ''}
                options={data?.filters?.[key] || []}
                onChange={(value) => setFilters((prev) => ({ ...prev, [key]: value }))}
              />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(data?.groups || []).map((group) => (
              <button
                type="button"
                key={group.label}
                onClick={() => setFilters((prev) => ({ ...prev, serviceType: group.label }))}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition hover:-translate-y-0.5 ${metricColor(group.label)}`}
              >
                {group.label}: {formatNumber(group.productTypes)} mã · Xuất {formatNumber(group.totalExport)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setFilters({});
                setSearch('');
              }}
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-300"
            >
              Xóa lọc
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-sm dark:border-white/10 dark:bg-[#162240]">
          <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
                <LayoutGrid size={18} />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-950 dark:text-white">Từng loại hòm</h2>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Nhập, xuất, tồn và giá trị theo mã</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full text-left">
              <thead className="bg-gray-50 text-[11px] uppercase tracking-widest text-gray-500 dark:bg-white/5 dark:text-gray-400">
                <tr>
                  <th className="px-5 py-3 font-black">Hòm</th>
                  <th className="px-4 py-3 font-black">Phân loại</th>
                  <th className="px-4 py-3 font-black">Dim Hòm</th>
                  <th className="px-4 py-3 text-right font-black">Nhập</th>
                  <th className="px-4 py-3 text-right font-black">Xuất</th>
                  <th className="px-4 py-3 text-right font-black">Tồn</th>
                  <th className="px-4 py-3 text-right font-black">Giá vốn</th>
                  <th className="px-4 py-3 text-right font-black">Giá bán</th>
                  <th className="px-5 py-3 text-right font-black">Giá trị tồn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                {loading ? (
                  [...Array(6)].map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td className="px-5 py-4"><div className="h-4 w-56 rounded bg-gray-100 dark:bg-white/10" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-24 rounded bg-gray-100 dark:bg-white/10" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-72 rounded bg-gray-100 dark:bg-white/10" /></td>
                      <td className="px-4 py-4"><div className="ml-auto h-4 w-14 rounded bg-gray-100 dark:bg-white/10" /></td>
                      <td className="px-4 py-4"><div className="ml-auto h-4 w-14 rounded bg-gray-100 dark:bg-white/10" /></td>
                      <td className="px-4 py-4"><div className="ml-auto h-4 w-14 rounded bg-gray-100 dark:bg-white/10" /></td>
                      <td className="px-4 py-4"><div className="ml-auto h-4 w-20 rounded bg-gray-100 dark:bg-white/10" /></td>
                      <td className="px-4 py-4"><div className="ml-auto h-4 w-20 rounded bg-gray-100 dark:bg-white/10" /></td>
                      <td className="px-5 py-4"><div className="ml-auto h-4 w-24 rounded bg-gray-100 dark:bg-white/10" /></td>
                    </tr>
                  ))
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-14 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-400 dark:bg-white/5">
                          <Search size={24} />
                        </div>
                        <p className="text-sm font-black text-gray-900 dark:text-white">Không có dữ liệu phù hợp</p>
                        <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">Thử đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredRows.map((row) => {
                  const dimSummary = [
                    row.dimensions.nhom_hang_hoa,
                    row.dimensions.loai_san_pham,
                    row.dimensions.loai_go,
                    row.dimensions.Ton_giao,
                  ].filter(Boolean);

                  return (
                    <tr key={row.id} className="transition hover:bg-gray-50/80 dark:hover:bg-white/[0.03]">
                      <td className="px-5 py-4">
                        <div className="flex min-w-0 flex-col">
                          <span className="font-mono text-xs font-black text-red-600 dark:text-red-300">{row.ma_hom}</span>
                          <span className="mt-1 max-w-[280px] truncate text-sm font-extrabold text-gray-900 dark:text-white">{row.ten_hom}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${metricColor(row.serviceType)}`}>
                          {row.serviceType}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex max-w-[340px] flex-wrap gap-1.5">
                          {dimSummary.length > 0 ? dimSummary.map((item) => (
                            <span key={item} className="rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-600 dark:bg-white/10 dark:text-gray-300">
                              {item}
                            </span>
                          )) : (
                            <span className="text-xs font-semibold text-gray-400">Chưa có Dim</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-black text-emerald-700 dark:text-emerald-300">{formatNumber(row.totalImport)}</td>
                      <td className="px-4 py-4 text-right text-sm font-black text-rose-700 dark:text-rose-300">{formatNumber(row.totalExport)}</td>
                      <td className="px-4 py-4 text-right text-sm font-black text-gray-900 dark:text-white">{formatNumber(row.stockQty)}</td>
                      <td className="px-4 py-4 text-right text-sm font-bold text-gray-700 dark:text-gray-200">{formatNumber(row.costPrice)}₫</td>
                      <td className="px-4 py-4 text-right text-sm font-bold text-gray-700 dark:text-gray-200">{formatNumber(row.sellingPrice)}₫</td>
                      <td className="px-5 py-4 text-right text-sm font-black text-gray-950 dark:text-white">{formatNumber(row.stockValue)}₫</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
