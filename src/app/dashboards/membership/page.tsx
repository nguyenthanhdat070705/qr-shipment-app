'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import {
  Activity, BarChart3, CalendarDays, Crown, Database, FileCheck2, Filter,
  Eye, LineChart, PieChart, RefreshCw, Search, ShieldCheck, Sparkles, TrendingUp,
  Users, WalletCards
} from 'lucide-react';

type ChartItem = {
  label: string;
  count: number;
  value: number;
  paid?: number;
};

type DashboardRecord = {
  id: string;
  getfly_contract_id: string;
  contract_name: string | null;
  contract_code: string | null;
  source_contract_code: string | null;
  contract_status: string | null;
  contract_type: string | null;
  remaining_days: number | null;
  created_date: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  person_in_charge: string | null;
  contract_value: number | null;
  actual_value: number | null;
  executed_amount: number | null;
  paid_amount: number | null;
  debt_amount: number | null;
  beneficiary_name_1: string | null;
  beneficiary_vneid_1: string | null;
  beneficiary_phone_1: string | null;
  beneficiary_address_1: string | null;
  beneficiary_name_2: string | null;
  beneficiary_vneid_2: string | null;
  beneficiary_phone_2: string | null;
  beneficiary_address_2: string | null;
  buyer_email: string | null;
  docs: {
    vneid_front: boolean;
    vneid_back: boolean;
    contract_scan: boolean;
    membership_form: boolean;
  };
};

type DashboardData = {
  options: {
    statuses: string[];
    types: string[];
    owners: string[];
  };
  summary: {
    total_contracts: number;
    total_value: number;
    actual_value: number;
    executed_amount: number;
    paid_amount: number;
    debt_amount: number;
    average_value: number;
    collection_rate: number;
    debt_rate: number;
    beneficiaries: number;
    beneficiary_vneid_rate: number;
    beneficiary_phone_rate: number;
    doc_complete_rate: number;
    contract_scan_rate: number;
    membership_form_rate: number;
    expiring_soon: number;
    expired: number;
    last_sync: string | null;
  };
  charts: {
    status: ChartItem[];
    types: ChartItem[];
    owners: ChartItem[];
    monthly: ChartItem[];
    remaining: ChartItem[];
  };
  records: DashboardRecord[];
  total_available: number;
};

type Filters = {
  search: string;
  status: string;
  type: string;
  owner: string;
  remaining: string;
  date_from: string;
  date_to: string;
};

const emptyData: DashboardData = {
  options: { statuses: [], types: [], owners: [] },
  summary: {
    total_contracts: 0,
    total_value: 0,
    actual_value: 0,
    executed_amount: 0,
    paid_amount: 0,
    debt_amount: 0,
    average_value: 0,
    collection_rate: 0,
    debt_rate: 0,
    beneficiaries: 0,
    beneficiary_vneid_rate: 0,
    beneficiary_phone_rate: 0,
    doc_complete_rate: 0,
    contract_scan_rate: 0,
    membership_form_rate: 0,
    expiring_soon: 0,
    expired: 0,
    last_sync: null,
  },
  charts: { status: [], types: [], owners: [], monthly: [], remaining: [] },
  records: [],
  total_available: 0,
};

const statusColors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b', '#ec4899', '#14b8a6'];

function fmtNumber(n: number | null | undefined) {
  return new Intl.NumberFormat('vi-VN').format(Number(n || 0));
}

function fmtMoney(n: number | null | undefined) {
  const value = Number(n || 0);
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
  return fmtNumber(value);
}

function statusBadge(status: string | null) {
  const v = (status || '').toLowerCase();
  if (v.includes('duyệt') && !v.includes('chờ')) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (v.includes('hoàn thành')) return 'bg-blue-50 text-blue-700 border-blue-100';
  if (v.includes('chờ')) return 'bg-amber-50 text-amber-700 border-amber-100';
  if (v.includes('thực hiện')) return 'bg-sky-50 text-sky-700 border-sky-100';
  if (v.includes('gia hạn')) return 'bg-violet-50 text-violet-700 border-violet-100';
  if (v.includes('kết thúc')) return 'bg-slate-50 text-slate-600 border-slate-100';
  if (v.includes('hủy')) return 'bg-red-50 text-red-700 border-red-100';
  return 'bg-gray-50 text-gray-600 border-gray-100';
}

function remainClass(days: number | null) {
  if (days === null || days === undefined) return 'bg-slate-100 text-slate-500';
  if (days < 0) return 'bg-red-100 text-red-700';
  if (days <= 90) return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
}

function SelectField({ label, value, onChange, children }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="min-w-0">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
      >
        {children}
      </select>
    </label>
  );
}

function KpiCard({ label, value, sub, icon, tone }: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  tone: 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'slate';
}) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</p>
        </div>
        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border ${tones[tone]}`}>
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold text-slate-500">{sub}</p>
    </div>
  );
}

function BarRow({ item, max, color = 'bg-indigo-500' }: { item: ChartItem; max: number; color?: string }) {
  const width = max ? Math.max(5, Math.round((item.value / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="truncate font-semibold text-slate-700">{item.label}</span>
        <span className="flex-shrink-0 font-bold text-slate-900">{fmtMoney(item.value)}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-slate-400">{fmtNumber(item.count)} hợp đồng</p>
    </div>
  );
}

function DonutChart({ data }: { data: ChartItem[] }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  let cursor = 0;
  const gradient = total
    ? data.map((item, index) => {
        const start = cursor;
        const size = (item.count / total) * 360;
        cursor += size;
        return `${statusColors[index % statusColors.length]} ${start}deg ${cursor}deg`;
      }).join(', ')
    : '#e2e8f0 0deg 360deg';

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
      <div className="relative mx-auto h-44 w-44 flex-shrink-0 rounded-full" style={{ background: `conic-gradient(${gradient})` }}>
        <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
          <span className="text-3xl font-black text-slate-950">{fmtNumber(total)}</span>
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Hợp đồng</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2.5">
        {data.slice(0, 7).map((item, index) => (
          <div key={item.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColors[index % statusColors.length] }} />
            <span className="min-w-0 flex-1 truncate font-semibold text-slate-600">{item.label}</span>
            <span className="font-black text-slate-900">{fmtNumber(item.count)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComboChart({ data }: { data: ChartItem[] }) {
  const maxValue = Math.max(1, ...data.map((item) => item.value));
  const maxPaid = Math.max(1, ...data.map((item) => item.paid || 0));
  const width = 720;
  const height = 260;
  const pad = 34;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const step = data.length ? innerW / data.length : innerW;
  const barW = Math.max(18, Math.min(34, step * 0.42));
  const points = data.map((item, index) => {
    const x = pad + step * index + step / 2;
    const y = pad + innerH - ((item.paid || 0) / maxPaid) * innerH;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="overflow-hidden rounded-2xl bg-slate-950 p-3 text-white">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[250px] w-full">
        {[0, 1, 2, 3].map((i) => {
          const y = pad + (innerH / 3) * i;
          return <line key={i} x1={pad} x2={width - pad} y1={y} y2={y} stroke="#334155" strokeWidth="1" />;
        })}
        {data.map((item, index) => {
          const x = pad + step * index + step / 2 - barW / 2;
          const barH = (item.value / maxValue) * innerH;
          const y = pad + innerH - barH;
          return (
            <g key={item.label}>
              <rect x={x} y={y} width={barW} height={barH} rx="7" fill="#22d3ee" opacity="0.82" />
              <text x={x + barW / 2} y={height - 9} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="700">
                {item.label === 'Chưa rõ' ? 'N/A' : item.label.slice(5)}
              </text>
            </g>
          );
        })}
        {data.length > 0 && (
          <>
            <polyline points={points} fill="none" stroke="#facc15" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            {data.map((item, index) => {
              const x = pad + step * index + step / 2;
              const y = pad + innerH - ((item.paid || 0) / maxPaid) * innerH;
              return <circle key={`${item.label}-paid`} cx={x} cy={y} r="5" fill="#facc15" stroke="#0f172a" strokeWidth="3" />;
            })}
          </>
        )}
      </svg>
      <div className="flex flex-wrap items-center gap-4 px-2 pb-1 text-xs font-semibold text-slate-300">
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-cyan-300" />Giá trị HĐ</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-yellow-300" />Đã thanh toán</span>
      </div>
    </div>
  );
}

export default function MembershipAdminDashboardPage() {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    type: 'all',
    owner: 'all',
    remaining: 'all',
    date_from: '',
    date_to: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<DashboardRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async (nextFilters: Filters) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      Object.entries(nextFilters).forEach(([key, value]) => {
        if (value && value !== 'all') params.set(key, value);
      });
      const res = await fetch(`/api/membership/dashboard?${params.toString()}`);
      const json = await res.json().catch(() => ({ error: 'Không đọc được phản hồi từ máy chủ' }));
      if (!res.ok) {
        const serverError = String(json.error || '');
        throw new Error(
          serverError.includes('fetch failed')
            ? 'Không kết nối được nguồn dữ liệu Supabase. Vui lòng kiểm tra cấu hình môi trường.'
            : serverError || 'Không tải được dữ liệu dashboard'
        );
      }
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(
        message.includes('fetch failed')
          ? 'Không kết nối được nguồn dữ liệu Supabase. Vui lòng kiểm tra cấu hình môi trường.'
          : message
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadDashboard]);

  const updateFilter = (key: keyof Filters, value: string) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    loadDashboard(next);
  };

  const ownerMax = useMemo(() => Math.max(1, ...data.charts.owners.map((item) => item.value)), [data.charts.owners]);
  const typeMax = useMemo(() => Math.max(1, ...data.charts.types.map((item) => item.value)), [data.charts.types]);
  const remainingMax = useMemo(() => Math.max(1, ...data.charts.remaining.map((item) => item.count)), [data.charts.remaining]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const hasTextSearch = searchInput.trim().length > 0;
    const next = {
      ...filters,
      search: searchInput,
      date_from: hasTextSearch ? '' : filters.date_from,
      date_to: hasTextSearch ? '' : filters.date_to,
    };
    setFilters(next);
    loadDashboard(next);
  }

  function resetFilters() {
    const next = { search: '', status: 'all', type: 'all', owner: 'all', remaining: 'all', date_from: '', date_to: '' };
    setSearchInput('');
    setFilters(next);
    loadDashboard(next);
  }

  return (
    <PageLayout title="Dashboard Membership" icon={<Crown size={16} className="text-yellow-500" />}>
      <div className="space-y-5 pb-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-yellow-700">
                <Sparkles size={13} /> Membership Intelligence
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Dashboard Membership</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Dữ liệu từ GetFly Contracts{data.summary.last_sync ? ` · Sync cuối ${new Date(data.summary.last_sync).toLocaleString('vi-VN')}` : ''}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-bold uppercase text-slate-400">Nguồn dữ liệu</p>
                <p className="mt-1 text-sm font-black text-slate-800">{fmtNumber(data.total_available)} bản ghi</p>
              </div>
              <button
                onClick={() => loadDashboard(filters)}
                disabled={loading}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Tải lại
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-black text-slate-800">
            <Filter size={16} className="text-indigo-500" /> Bộ lọc dashboard
          </div>
          <form onSubmit={handleSearch} className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_0.9fr_0.9fr_1fr_0.8fr_0.75fr_0.75fr_auto]">
            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Tìm kiếm</span>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Tên HĐ, số HĐ, SĐT, KH, VnEID..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
              </div>
            </label>
            <SelectField label="Trạng thái" value={filters.status} onChange={(value) => updateFilter('status', value)}>
              <option value="all">Tất cả</option>
              {data.options.statuses.map((item) => <option key={item} value={item}>{item}</option>)}
            </SelectField>
            <SelectField label="Kiểu HĐ" value={filters.type} onChange={(value) => updateFilter('type', value)}>
              <option value="all">Tất cả</option>
              {data.options.types.map((item) => <option key={item} value={item}>{item}</option>)}
            </SelectField>
            <SelectField label="Phụ trách" value={filters.owner} onChange={(value) => updateFilter('owner', value)}>
              <option value="all">Tất cả</option>
              {data.options.owners.map((item) => <option key={item} value={item}>{item}</option>)}
            </SelectField>
            <SelectField label="Thời hạn" value={filters.remaining} onChange={(value) => updateFilter('remaining', value)}>
              <option value="all">Tất cả</option>
              <option value="expired">Đã quá hạn</option>
              <option value="expiring">≤ 90 ngày</option>
              <option value="safe">&gt; 90 ngày</option>
              <option value="unknown">Chưa rõ</option>
            </SelectField>
            <label>
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Từ ngày</span>
              <input type="date" value={filters.date_from} onChange={(e) => updateFilter('date_from', e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
            </label>
            <label>
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Đến ngày</span>
              <input type="date" value={filters.date_to} onChange={(e) => updateFilter('date_to', e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
            </label>
            <div className="flex items-end gap-2">
              <button type="submit" className="h-10 rounded-xl bg-indigo-600 px-4 text-xs font-black text-white transition hover:bg-indigo-700">Lọc</button>
              <button type="button" onClick={resetFilters} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:bg-slate-50">Xóa</button>
            </div>
          </form>
          {(filters.search || filters.date_from || filters.date_to) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
              {filters.search && <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">Từ khóa: {filters.search}</span>}
              {filters.date_from && <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">Từ ngày: {new Date(filters.date_from).toLocaleDateString('vi-VN')}</span>}
              {filters.date_to && <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">Đến ngày: {new Date(filters.date_to).toLocaleDateString('vi-VN')}</span>}
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <KpiCard label="Tổng HĐ" value={loading ? '...' : fmtNumber(data.summary.total_contracts)} sub={`${fmtNumber(data.summary.beneficiaries)} người thụ hưởng`} icon={<Crown size={20} />} tone="indigo" />
          <KpiCard label="Giá trị HĐ" value={loading ? '...' : fmtMoney(data.summary.total_value)} sub={`TB ${fmtMoney(data.summary.average_value)} / HĐ`} icon={<WalletCards size={20} />} tone="cyan" />
          <KpiCard label="Giá trị thực" value={loading ? '...' : fmtMoney(data.summary.actual_value)} sub={`Đã TH ${fmtMoney(data.summary.executed_amount)}`} icon={<TrendingUp size={20} />} tone="emerald" />
          <KpiCard label="Đã thanh toán" value={loading ? '...' : fmtMoney(data.summary.paid_amount)} sub={`Tỷ lệ thu ${data.summary.collection_rate}%`} icon={<ShieldCheck size={20} />} tone="emerald" />
          <KpiCard label="Công nợ" value={loading ? '...' : fmtMoney(data.summary.debt_amount)} sub={`Tỷ lệ nợ ${data.summary.debt_rate}%`} icon={<Activity size={20} />} tone="rose" />
          <KpiCard label="Sắp hết hạn" value={loading ? '...' : fmtNumber(data.summary.expiring_soon)} sub={`${fmtNumber(data.summary.expired)} HĐ đã quá hạn`} icon={<CalendarDays size={20} />} tone="amber" />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm xl:col-span-2">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wide text-slate-800">Xu hướng hợp đồng theo tháng</h2>
                <p className="text-xs font-semibold text-slate-400">Giá trị hợp đồng và dòng tiền đã thanh toán</p>
              </div>
              <LineChart size={19} className="text-cyan-500" />
            </div>
            <ComboChart data={data.charts.monthly} />
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wide text-slate-800">Cơ cấu trạng thái</h2>
                <p className="text-xs font-semibold text-slate-400">Theo số lượng hợp đồng</p>
              </div>
              <PieChart size={19} className="text-indigo-500" />
            </div>
            <DonutChart data={data.charts.status} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-800">Top phụ trách</h2>
              <Users size={18} className="text-violet-500" />
            </div>
            <div className="space-y-4">
              {data.charts.owners.map((item) => <BarRow key={item.label} item={item} max={ownerMax} color="bg-violet-500" />)}
              {data.charts.owners.length === 0 && <p className="py-8 text-center text-sm font-semibold text-slate-400">Chưa có dữ liệu</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-800">Kiểu hợp đồng</h2>
              <BarChart3 size={18} className="text-emerald-500" />
            </div>
            <div className="space-y-4">
              {data.charts.types.map((item) => <BarRow key={item.label} item={item} max={typeMax} color="bg-emerald-500" />)}
              {data.charts.types.length === 0 && <p className="py-8 text-center text-sm font-semibold text-slate-400">Chưa có dữ liệu</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-800">Hồ sơ & thời hạn</h2>
              <FileCheck2 size={18} className="text-amber-500" />
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-indigo-50 p-3 text-center">
                  <p className="text-xl font-black text-indigo-700">{data.summary.doc_complete_rate}%</p>
                  <p className="text-[10px] font-bold uppercase text-indigo-400">Đủ hồ sơ</p>
                </div>
                <div className="rounded-xl bg-cyan-50 p-3 text-center">
                  <p className="text-xl font-black text-cyan-700">{data.summary.contract_scan_rate}%</p>
                  <p className="text-[10px] font-bold uppercase text-cyan-400">Scan HĐ</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-3 text-center">
                  <p className="text-xl font-black text-amber-700">{data.summary.beneficiary_vneid_rate}%</p>
                  <p className="text-[10px] font-bold uppercase text-amber-500">VnEID TH</p>
                </div>
              </div>
              {data.charts.remaining.map((item) => {
                const width = remainingMax ? Math.max(4, Math.round((item.count / remainingMax) * 100)) : 0;
                return (
                  <div key={item.label}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">{item.label}</span>
                      <span className="font-black text-slate-900">{fmtNumber(item.count)}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-800">Bảng dữ liệu membership</h2>
              <p className="text-xs font-semibold text-slate-400">Hiển thị 50 hợp đồng mới nhất theo bộ lọc hiện tại, bấm vào một dòng để xem chi tiết</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700">
              <Database size={14} /> {fmtNumber(data.summary.total_contracts)} HĐ
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1800px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3 font-black">Ngày còn lại</th>
                  <th className="px-3 py-3 font-black">Tên hợp đồng</th>
                  <th className="px-3 py-3 font-black">Số HĐ</th>
                  <th className="px-3 py-3 font-black">Trạng thái</th>
                  <th className="px-3 py-3 font-black">Kiểu</th>
                  <th className="px-3 py-3 font-black">Ngày tạo</th>
                  <th className="px-3 py-3 font-black">Hiệu lực</th>
                  <th className="px-3 py-3 font-black">Hết hiệu lực</th>
                  <th className="px-3 py-3 font-black">Khách hàng</th>
                  <th className="px-3 py-3 font-black">SĐT KH</th>
                  <th className="px-3 py-3 font-black">Phụ trách</th>
                  <th className="px-3 py-3 text-right font-black">GT HĐ</th>
                  <th className="px-3 py-3 text-right font-black">GT thực</th>
                  <th className="px-3 py-3 text-right font-black">Đã TH</th>
                  <th className="px-3 py-3 text-right font-black">Đã TT</th>
                  <th className="px-3 py-3 text-right font-black">Công nợ</th>
                  <th className="px-3 py-3 font-black">Người TH 1</th>
                  <th className="px-3 py-3 font-black">VnEID TH 1</th>
                  <th className="px-3 py-3 font-black">Người TH 2</th>
                  <th className="px-3 py-3 font-black">VnEID TH 2</th>
                  <th className="px-3 py-3 font-black">Email người mua</th>
                  <th className="px-3 py-3 font-black">Hồ sơ</th>
                  <th className="px-3 py-3 text-center font-black">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={23} className="py-14 text-center text-sm font-bold text-slate-400">
                      <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-slate-300" />
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : data.records.length === 0 ? (
                  <tr>
                    <td colSpan={23} className="py-14 text-center text-sm font-bold text-slate-400">
                      Không có hợp đồng phù hợp. Nếu đang tìm mã như MBS, hãy bấm Xóa rồi tìm lại để bỏ các bộ lọc phụ.
                    </td>
                  </tr>
                ) : data.records.map((row) => (
                  <tr key={row.id} onClick={() => setSelectedRecord(row)} className="cursor-pointer transition hover:bg-indigo-50/40">
                    <td className="px-3 py-3">
                      <span className={`inline-flex min-w-10 justify-center rounded-full px-2 py-1 text-[10px] font-black ${remainClass(row.remaining_days)}`}>
                        {row.remaining_days ?? '-'}
                      </span>
                    </td>
                    <td className="max-w-[220px] px-3 py-3 font-bold text-slate-800">
                      <div className="truncate">{row.contract_name || '-'}</div>
                      <div className="mt-0.5 truncate font-mono text-[10px] text-slate-400">{row.source_contract_code || row.getfly_contract_id}</div>
                    </td>
                    <td className="px-3 py-3 font-mono font-black text-indigo-700">{row.contract_code || '-'}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black ${statusBadge(row.contract_status)}`}>{row.contract_status || '-'}</span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-500">{row.contract_type || '-'}</td>
                    <td className="px-3 py-3 font-medium text-slate-500">{row.created_date || '-'}</td>
                    <td className="px-3 py-3 font-medium text-slate-500">{row.effective_date || '-'}</td>
                    <td className="px-3 py-3 font-medium text-slate-500">{row.expiry_date || '-'}</td>
                    <td className="max-w-[160px] px-3 py-3 font-bold text-slate-700"><div className="truncate">{row.customer_name || '-'}</div></td>
                    <td className="px-3 py-3 font-mono font-semibold text-slate-600">{row.customer_phone || '-'}</td>
                    <td className="max-w-[150px] px-3 py-3 font-semibold text-slate-500"><div className="truncate">{row.person_in_charge || '-'}</div></td>
                    <td className="px-3 py-3 text-right font-black text-indigo-700">{row.contract_value ? fmtNumber(row.contract_value) : '-'}</td>
                    <td className="px-3 py-3 text-right font-black text-emerald-700">{row.actual_value ? fmtNumber(row.actual_value) : '-'}</td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-600">{fmtNumber(row.executed_amount)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-emerald-600">{fmtNumber(row.paid_amount)}</td>
                    <td className="px-3 py-3 text-right font-black text-red-600">{fmtNumber(row.debt_amount)}</td>
                    <td className="max-w-[170px] px-3 py-3 font-semibold text-slate-600"><div className="truncate">{row.beneficiary_name_1 || '-'}</div></td>
                    <td className="px-3 py-3 font-mono font-semibold text-slate-500">{row.beneficiary_vneid_1 || '-'}</td>
                    <td className="max-w-[170px] px-3 py-3 font-semibold text-slate-600"><div className="truncate">{row.beneficiary_name_2 || '-'}</div></td>
                    <td className="px-3 py-3 font-mono font-semibold text-slate-500">{row.beneficiary_vneid_2 || '-'}</td>
                    <td className="max-w-[220px] px-3 py-3 font-semibold text-slate-500"><div className="truncate">{row.buyer_email || '-'}</div></td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        {[
                          ['V1', row.docs.vneid_front],
                          ['V2', row.docs.vneid_back],
                          ['HĐ', row.docs.contract_scan],
                          ['HV', row.docs.membership_form],
                        ].map(([label, ok]) => (
                          <span key={String(label)} className={`rounded-md px-1.5 py-1 text-[9px] font-black ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                            {label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRecord(row);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[10px] font-black text-indigo-700 transition hover:bg-indigo-100"
                      >
                        <Eye size={12} /> Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {selectedRecord && (
          <ContractDetailPanel record={selectedRecord} onClose={() => setSelectedRecord(null)} />
        )}
      </div>
    </PageLayout>
  );
}

function DetailItem({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <div className={`mt-1 text-sm font-bold ${tone || 'text-slate-800'}`}>{value || <span className="text-slate-300">Chưa có</span>}</div>
    </div>
  );
}

function ContractDetailPanel({ record, onClose }: { record: DashboardRecord; onClose: () => void }) {
  const docs = [
    ['VnEID mặt trước', record.docs.vneid_front],
    ['VnEID mặt sau', record.docs.vneid_back],
    ['Scan hợp đồng', record.docs.contract_scan],
    ['Phiếu hội viên', record.docs.membership_form],
  ];

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 backdrop-blur-sm lg:items-center lg:justify-end" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl lg:h-full lg:max-h-none lg:max-w-2xl lg:rounded-none">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wide text-indigo-500">Chi tiết hợp đồng</p>
              <h3 className="mt-1 truncate text-xl font-black text-slate-950">{record.contract_name || record.source_contract_code || record.contract_code || 'Hợp đồng'}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${statusBadge(record.contract_status)}`}>{record.contract_status || 'Chưa rõ trạng thái'}</span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${remainClass(record.remaining_days)}`}>{record.remaining_days ?? '-'} ngày</span>
              </div>
            </div>
            <button onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-50">Đóng</button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <section>
            <h4 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">Thông tin hợp đồng</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailItem label="Tên hợp đồng" value={record.contract_name} />
              <DetailItem label="Số hợp đồng" value={record.contract_code} />
              <DetailItem label="Mã GetFly / MBS" value={record.source_contract_code || record.getfly_contract_id} tone="text-indigo-700" />
              <DetailItem label="Kiểu hợp đồng" value={record.contract_type} />
              <DetailItem label="Ngày tạo" value={record.created_date} />
              <DetailItem label="Hiệu lực" value={record.effective_date} />
              <DetailItem label="Hết hiệu lực" value={record.expiry_date} />
              <DetailItem label="Phụ trách" value={record.person_in_charge} />
            </div>
          </section>

          <section>
            <h4 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">Khách hàng & tài chính</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailItem label="Khách hàng" value={record.customer_name} />
              <DetailItem label="SĐT khách hàng" value={record.customer_phone} />
              <DetailItem label="Giá trị hợp đồng" value={record.contract_value ? fmtNumber(record.contract_value) : '-'} tone="text-indigo-700" />
              <DetailItem label="Giá trị thực" value={record.actual_value ? fmtNumber(record.actual_value) : '-'} tone="text-emerald-700" />
              <DetailItem label="Đã thực hiện" value={fmtNumber(record.executed_amount)} />
              <DetailItem label="Đã thanh toán" value={fmtNumber(record.paid_amount)} tone="text-emerald-700" />
              <DetailItem label="Công nợ" value={fmtNumber(record.debt_amount)} tone="text-red-600" />
              <DetailItem label="Email người mua" value={record.buyer_email} />
            </div>
          </section>

          <section>
            <h4 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">Người thụ hưởng</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailItem label="Người TH 1" value={record.beneficiary_name_1} />
              <DetailItem label="VnEID TH 1" value={record.beneficiary_vneid_1} />
              <DetailItem label="SĐT TH 1" value={record.beneficiary_phone_1} />
              <DetailItem label="Địa chỉ TH 1" value={record.beneficiary_address_1} />
              <DetailItem label="Người TH 2" value={record.beneficiary_name_2} />
              <DetailItem label="VnEID TH 2" value={record.beneficiary_vneid_2} />
              <DetailItem label="SĐT TH 2" value={record.beneficiary_phone_2} />
              <DetailItem label="Địa chỉ TH 2" value={record.beneficiary_address_2} />
            </div>
          </section>

          <section>
            <h4 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">Hồ sơ</h4>
            <div className="grid grid-cols-2 gap-2">
              {docs.map(([label, ok]) => (
                <div key={String(label)} className={`rounded-xl px-3 py-3 text-sm font-black ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                  {ok ? 'Đã có' : 'Chưa có'} · {label}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
