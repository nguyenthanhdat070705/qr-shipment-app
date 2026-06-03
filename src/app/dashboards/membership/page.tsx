'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import { getUserRole } from '@/config/roles.config';
import {
  Activity, BarChart3, CalendarDays, Crown, Database, FileCheck2, Filter,
  Download, Eye, HandCoins, LineChart, PieChart, Receipt, RefreshCw, Search, ShieldCheck, Sparkles, TrendingUp,
  Users, WalletCards
} from 'lucide-react';

type ChartItem = {
  label: string;
  count: number;
  value: number;
  paid?: number;
  tax_amount?: number;
  gross_revenue?: number;
  gross_commission?: number;
  net_commission?: number;
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
    tax_amount: number;
    gross_revenue: number;
    gross_commission: number;
    net_commission: number;
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
    daily: ChartItem[];
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
  view: 'day' | 'month';
  month_from: string;
  month_to: string;
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
    tax_amount: 0,
    gross_revenue: 0,
    gross_commission: 0,
    net_commission: 0,
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
  charts: { status: [], types: [], owners: [], daily: [], remaining: [] },
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

function formatViDate(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatViMonth(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return month;
  return `Tháng ${match[2]}/${match[1]}`;
}

function getMonthBounds(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return { from: '', to: '' };
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return {
    from: `${match[1]}-${match[2]}-01`,
    to: `${match[1]}-${match[2]}-${String(lastDay).padStart(2, '0')}`,
  };
}

function getMonthRangeBounds(monthFrom: string, monthTo: string): { from: string; to: string; monthFrom: string; monthTo: string } {
  if (!monthFrom && !monthTo) return { from: '', to: '', monthFrom: '', monthTo: '' };
  const startMonth = monthFrom || monthTo;
  const endMonth = monthTo || monthFrom;
  if (!startMonth || !endMonth) return { from: '', to: '', monthFrom: '', monthTo: '' };
  const [fromMonth, toMonth] = startMonth > endMonth ? [endMonth, startMonth] : [startMonth, endMonth];
  return {
    from: getMonthBounds(fromMonth).from,
    to: getMonthBounds(toMonth).to,
    monthFrom: fromMonth,
    monthTo: toMonth,
  };
}

function getDayRange(dateFrom: string, dateTo: string) {
  if (!dateFrom && !dateTo) return { from: '', to: '' };
  const startDay = dateFrom || dateTo;
  const endDay = dateTo || dateFrom;
  const [from, to] = startDay > endDay ? [endDay, startDay] : [startDay, endDay];
  return { from, to };
}

function buildDashboardParams(nextFilters: Filters) {
  const params = new URLSearchParams();
  if (nextFilters.search) params.set('search', nextFilters.search);
  if (nextFilters.status && nextFilters.status !== 'all') params.set('status', nextFilters.status);
  if (nextFilters.type && nextFilters.type !== 'all') params.set('type', nextFilters.type);
  if (nextFilters.owner && nextFilters.owner !== 'all') params.set('owner', nextFilters.owner);
  if (nextFilters.remaining && nextFilters.remaining !== 'all') params.set('remaining', nextFilters.remaining);

  if (nextFilters.view === 'month') {
    params.set('period', 'month');
    const range = getMonthRangeBounds(nextFilters.month_from, nextFilters.month_to);
    if (range.from && range.to) {
      params.set('month_from', range.monthFrom);
      params.set('month_to', range.monthTo);
      params.set('date_from', range.from);
      params.set('date_to', range.to);
    }
  } else {
    params.set('period', 'day');
    const range = getDayRange(nextFilters.date_from, nextFilters.date_to);
    if (range.from) params.set('date_from', range.from);
    if (range.to) params.set('date_to', range.to);
  }

  return params;
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
  tone: 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'slate' | 'violet' | 'teal';
}) {
  const tones = {
    indigo: { iconBg: 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white border-indigo-200 shadow-indigo-500/30', cardBg: 'from-indigo-50 via-white to-violet-50/40 border-indigo-100', orb: 'bg-indigo-300/30' },
    emerald: { iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-emerald-200 shadow-emerald-500/30', cardBg: 'from-emerald-50 via-white to-teal-50/40 border-emerald-100', orb: 'bg-emerald-300/30' },
    amber: { iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white border-amber-200 shadow-amber-500/30', cardBg: 'from-amber-50 via-white to-orange-50/40 border-amber-100', orb: 'bg-amber-300/30' },
    rose: { iconBg: 'bg-gradient-to-br from-rose-500 to-pink-600 text-white border-rose-200 shadow-rose-500/30', cardBg: 'from-rose-50 via-white to-pink-50/40 border-rose-100', orb: 'bg-rose-300/30' },
    cyan: { iconBg: 'bg-gradient-to-br from-cyan-500 to-sky-600 text-white border-cyan-200 shadow-cyan-500/30', cardBg: 'from-cyan-50 via-white to-sky-50/40 border-cyan-100', orb: 'bg-cyan-300/30' },
    slate: { iconBg: 'bg-gradient-to-br from-slate-500 to-slate-700 text-white border-slate-200 shadow-slate-500/30', cardBg: 'from-slate-50 via-white to-gray-50/40 border-slate-100', orb: 'bg-slate-300/30' },
    violet: { iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600 text-white border-violet-200 shadow-violet-500/30', cardBg: 'from-violet-50 via-white to-purple-50/40 border-violet-100', orb: 'bg-violet-300/30' },
    teal: { iconBg: 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white border-teal-200 shadow-teal-500/30', cardBg: 'from-teal-50 via-white to-cyan-50/40 border-teal-100', orb: 'bg-teal-300/30' },
  };
  const t = tones[tone];

  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${t.cardBg} p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg`}>
      <div className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full ${t.orb} blur-2xl`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</p>
        </div>
        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border shadow-md ${t.iconBg}`}>
          {icon}
        </div>
      </div>
      <p className="relative mt-3 text-xs font-semibold text-slate-500">{sub}</p>
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

function formatDateLabel(label: string) {
  const monthMatch = /^(\d{4})-(\d{2})$/.exec(label);
  if (monthMatch) return `T${monthMatch[2]}/${monthMatch[1].slice(2)}`;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(label);
  if (!match) return label;
  return `${match[3]}/${match[2]}`;
}

function GrowthBarChart({ data, unitLabel }: { data: ChartItem[]; unitLabel: string }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-400">
        Không có hội viên MBS theo {unitLabel} tạo trong bộ lọc hiện tại
      </div>
    );
  }

  const maxCount = Math.max(1, ...data.map((item) => item.count));
  const width = 720;
  const height = 280;
  const pad = 40;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const step = innerW / data.length;
  const barW = Math.max(3, Math.min(38, step * 0.58));
  const labelEvery = data.length > 10 ? Math.ceil(data.length / 8) : 1;

  return (
    <div className="overflow-hidden rounded-2xl bg-slate-950 p-3 text-white">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full">
        {[0, 1, 2, 3].map((i) => {
          const y = pad + (innerH / 3) * i;
          const countLabel = Math.round((maxCount * (3 - i)) / 3);
          return (
            <g key={i}>
              <line x1={pad} x2={width - pad} y1={y} y2={y} stroke="#334155" strokeWidth="1" />
              <text x={pad - 6} y={y + 4} textAnchor="end" fill="#64748b" fontSize="10" fontWeight="700">{countLabel}</text>
            </g>
          );
        })}
        {data.map((item, index) => {
          const x = pad + step * index + step / 2 - barW / 2;
          const barH = (item.count / maxCount) * innerH;
          const y = pad + innerH - barH;
          return (
            <g key={item.label}>
              <rect x={x} y={y} width={barW} height={barH} rx="7" fill="#22d3ee" opacity="0.85">
                <title>{`${item.label}\nHội viên đăng ký: ${item.count}`}</title>
              </rect>
              <text x={x + barW / 2} y={y - 6} textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="800">{item.count}</text>
              {(index % labelEvery === 0 || index === data.length - 1) && (
                <text x={x + barW / 2} y={height - 12} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="700">
                  {formatDateLabel(item.label)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap items-center gap-4 px-2 pb-1 text-xs font-semibold text-slate-300">
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-cyan-300" />Hội viên đăng ký</span>
      </div>
    </div>
  );
}

function FinancialTrendChart({ data, unitLabel }: { data: ChartItem[]; unitLabel: string }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-400">
        Không có doanh thu hoặc hoa hồng theo {unitLabel} trong bộ lọc hiện tại
      </div>
    );
  }

  const maxMetric = Math.max(1, ...data.flatMap((item) => [item.gross_revenue || 0, item.net_commission || 0]));
  const width = 720;
  const height = 280;
  const pad = 44;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const step = data.length > 1 ? innerW / (data.length - 1) : innerW;
  const labelEvery = data.length > 10 ? Math.ceil(data.length / 8) : 1;

  const getPoint = (item: ChartItem, index: number, key: 'gross_revenue' | 'net_commission') => {
    const x = data.length > 1 ? pad + step * index : width / 2;
    const y = pad + innerH - ((item[key] || 0) / maxMetric) * innerH;
    return { x, y };
  };
  const revenuePoints = data.map((item, index) => {
    const point = getPoint(item, index, 'gross_revenue');
    return `${point.x},${point.y}`;
  }).join(' ');
  const commissionPoints = data.map((item, index) => {
    const point = getPoint(item, index, 'net_commission');
    return `${point.x},${point.y}`;
  }).join(' ');

  return (
    <div className="overflow-hidden rounded-2xl bg-slate-950 p-3 text-white">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full">
        {[0, 1, 2, 3].map((i) => {
          const y = pad + (innerH / 3) * i;
          const metricLabel = (maxMetric * (3 - i)) / 3;
          return (
            <g key={i}>
              <line x1={pad} x2={width - pad} y1={y} y2={y} stroke="#334155" strokeWidth="1" />
              <text x={pad - 6} y={y + 4} textAnchor="end" fill="#64748b" fontSize="10" fontWeight="700">{fmtMoney(metricLabel)}</text>
            </g>
          );
        })}
        <polyline points={revenuePoints} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={commissionPoints} fill="none" stroke="#2dd4bf" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((item, index) => {
          const revenue = getPoint(item, index, 'gross_revenue');
          const commission = getPoint(item, index, 'net_commission');
          return (
            <g key={`${item.label}-value`}>
              <circle cx={revenue.x} cy={revenue.y} r="5" fill="#38bdf8" stroke="#0f172a" strokeWidth="3">
                <title>{`${item.label}\nDoanh thu thực: ${fmtMoney(item.gross_revenue || 0)}\nĐã thanh toán: ${fmtMoney(item.paid || 0)}`}</title>
              </circle>
              <circle cx={commission.x} cy={commission.y} r="5" fill="#2dd4bf" stroke="#0f172a" strokeWidth="3">
                <title>{`${item.label}\nHoa hồng CTV: ${fmtMoney(item.net_commission || 0)}`}</title>
              </circle>
              {(index % labelEvery === 0 || index === data.length - 1) && (
                <text x={revenue.x} y={height - 12} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="700">
                  {formatDateLabel(item.label)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap items-center gap-4 px-2 pb-1 text-xs font-semibold text-slate-300">
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-sky-400" />Doanh thu thực</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-teal-400" />Hoa hồng CTV</span>
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
    view: 'day',
    month_from: '',
    month_to: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<DashboardRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [access, setAccess] = useState<'checking' | 'allowed' | 'denied'>('checking');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      const email = raw ? JSON.parse(raw).email || '' : '';
      const normalizedEmail = email.toLowerCase().trim();
      setAccess(getUserRole(email) === 'admin' && normalizedEmail === 'admin@blackstone.com.vn' ? 'allowed' : 'denied');
    } catch {
      setAccess('denied');
    }
  }, []);

  const loadDashboard = useCallback(async (nextFilters: Filters) => {
    if (access !== 'allowed') return;

    setLoading(true);
    setError('');
    try {
      const params = buildDashboardParams(nextFilters);
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
  }, [access]);

  useEffect(() => {
    if (access === 'allowed') {
      loadDashboard(filters);
    } else if (access === 'denied') {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, loadDashboard]);

  const updateFilter = (key: keyof Filters, value: string) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    loadDashboard(next);
  };

  const updateView = (view: Filters['view']) => {
    const next = { ...filters, view };
    setFilters(next);
    loadDashboard(next);
  };

  const updateDateFrom = (value: string) => {
    const next = { ...filters, date_from: value };
    if (value && (!filters.date_to || filters.date_to < value)) next.date_to = value;
    setFilters(next);
    loadDashboard(next);
  };

  const updateDateTo = (value: string) => {
    const next = { ...filters, date_to: value };
    if (value && (!filters.date_from || filters.date_from > value)) next.date_from = value;
    setFilters(next);
    loadDashboard(next);
  };

  const updateMonthFrom = (value: string) => {
    const next = { ...filters, month_from: value };
    if (value && (!filters.month_to || filters.month_to < value)) next.month_to = value;
    setFilters(next);
    loadDashboard(next);
  };

  const updateMonthTo = (value: string) => {
    const next = { ...filters, month_to: value };
    if (value && (!filters.month_from || filters.month_from > value)) next.month_from = value;
    setFilters(next);
    loadDashboard(next);
  };

  const ownerMax = useMemo(() => Math.max(1, ...data.charts.owners.map((item) => item.value)), [data.charts.owners]);
  const typeMax = useMemo(() => Math.max(1, ...data.charts.types.map((item) => item.value)), [data.charts.types]);
  const remainingMax = useMemo(() => Math.max(1, ...data.charts.remaining.map((item) => item.count)), [data.charts.remaining]);

  const unitLabel = filters.view === 'month' ? 'tháng' : 'ngày';

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const next = {
      ...filters,
      search: searchInput,
    };
    setFilters(next);
    loadDashboard(next);
  }

  async function handleExportExcel() {
    if (access !== 'allowed' || exporting) return;

    setExporting(true);
    setError('');
    try {
      const params = buildDashboardParams(filters);
      params.set('export', 'excel');

      const res = await fetch(`/api/membership/dashboard?${params.toString()}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: 'Không xuất được file Excel' }));
        throw new Error(String(json.error || 'Không xuất được file Excel'));
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `Membership_Dashboard_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Không xuất được file Excel');
    } finally {
      setExporting(false);
    }
  }

  function resetFilters() {
    const next: Filters = {
      search: '',
      status: 'all',
      type: 'all',
      owner: 'all',
      remaining: 'all',
      date_from: '',
      date_to: '',
      view: 'day',
      month_from: '',
      month_to: '',
    };
    setSearchInput('');
    setFilters(next);
    loadDashboard(next);
  }

  if (access === 'checking') {
    return (
      <PageLayout title="Dashboard Membership" icon={<Crown size={16} className="text-yellow-500" />}>
        <div className="flex min-h-[50vh] items-center justify-center text-sm font-semibold text-slate-400">
          Đang kiểm tra quyền truy cập...
        </div>
      </PageLayout>
    );
  }

  if (access === 'denied') {
    return (
      <PageLayout title="Dashboard Membership" icon={<Crown size={16} className="text-yellow-500" />}>
        <div className="mx-auto flex min-h-[55vh] max-w-md flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <ShieldCheck size={26} />
          </div>
          <h1 className="text-lg font-black text-slate-900">Không có quyền truy cập</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
            Dashboard Membership chỉ hiển thị cho tài khoản admin@blackstone.com.vn.
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Dashboard Membership" icon={<Crown size={16} className="text-yellow-500" />}>
      <div className="relative space-y-5 pb-8">
        {/* Decorative background orbs */}
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[420px] overflow-hidden">
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-indigo-300/30 blur-3xl" />
          <div className="absolute right-10 top-10 h-64 w-64 rounded-full bg-amber-200/30 blur-3xl" />
          <div className="absolute left-1/2 top-40 h-72 w-72 rounded-full bg-violet-200/25 blur-3xl" />
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-amber-50/60 p-5 shadow-sm">
          <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #6366f1 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          <div className="pointer-events-none absolute -top-20 right-10 h-56 w-56 rounded-full bg-gradient-to-br from-indigo-400/30 to-violet-300/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-gradient-to-tr from-amber-300/20 to-rose-300/10 blur-3xl" />

          <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-white/80 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-yellow-700 shadow-sm backdrop-blur">
                <Sparkles size={13} /> Membership Intelligence
              </div>
              <h1 className="bg-gradient-to-br from-slate-950 via-indigo-900 to-amber-800 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-3xl">Dashboard Membership</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Dữ liệu từ GetFly Membership Contracts (MBS){data.summary.last_sync ? ` · Sync cuối ${new Date(data.summary.last_sync).toLocaleString('vi-VN')}` : ''}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
              <div className="rounded-2xl border border-indigo-100 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
                <p className="text-[11px] font-bold uppercase text-indigo-400">Nguồn MBS</p>
                <p className="mt-1 text-sm font-black text-slate-800">{fmtNumber(data.total_available)} bản ghi</p>
              </div>
              <button
                onClick={() => loadDashboard(filters)}
                disabled={loading}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 px-4 py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Tải lại
              </button>
              <button
                onClick={handleExportExcel}
                disabled={loading || exporting}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-50 hover:shadow-md disabled:opacity-60"
              >
                <Download size={16} className={exporting ? 'animate-bounce' : ''} />
                {exporting ? 'Đang xuất...' : 'Xuất Excel'}
              </button>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-white via-violet-50/30 to-indigo-50/30 p-4 shadow-sm">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-200/40 blur-3xl" />
          <div className="relative mb-4 flex items-center gap-2 text-sm font-black text-slate-800">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
              <Filter size={15} />
            </span>
            Bộ lọc dashboard
          </div>
          <form onSubmit={handleSearch} className="grid grid-cols-1 gap-3 lg:grid-cols-[1.35fr_0.75fr_0.75fr_0.9fr_0.75fr_0.7fr_0.75fr_0.75fr_auto]">
            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Tìm kiếm</span>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Mã MBS, tên HĐ, SĐT, KH, VnEID..."
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
            <SelectField label="Kỳ xem" value={filters.view} onChange={(value) => updateView(value as Filters['view'])}>
              <option value="day">Theo ngày</option>
              <option value="month">Theo tháng</option>
            </SelectField>
            {filters.view === 'month' ? (
              <>
                <label>
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Từ tháng</span>
                  <input type="month" value={filters.month_from} onChange={(e) => updateMonthFrom(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
                </label>
                <label>
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Đến tháng</span>
                  <input type="month" value={filters.month_to} onChange={(e) => updateMonthTo(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
                </label>
              </>
            ) : (
              <>
                <label>
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Từ ngày</span>
                  <input type="date" value={filters.date_from} onChange={(e) => updateDateFrom(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
                </label>
                <label>
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Đến ngày</span>
                  <input type="date" value={filters.date_to} onChange={(e) => updateDateTo(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
                </label>
              </>
            )}
            <div className="flex items-end gap-2">
              <button type="submit" className="h-10 rounded-xl bg-indigo-600 px-4 text-xs font-black text-white transition hover:bg-indigo-700">Lọc</button>
              <button type="button" onClick={resetFilters} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:bg-slate-50">Xóa</button>
            </div>
          </form>
          {(filters.search || filters.owner !== 'all' || filters.status !== 'all' || filters.type !== 'all' || filters.date_from || filters.date_to || filters.month_from || filters.month_to) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
              {filters.search && <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">Từ khóa: {filters.search}</span>}
              {filters.owner !== 'all' && <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-700">Phụ trách: {filters.owner}</span>}
              {filters.status !== 'all' && <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Trạng thái: {filters.status}</span>}
              {filters.type !== 'all' && <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">Kiểu HĐ: {filters.type}</span>}
              {filters.view === 'month' && filters.month_from && <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">Từ tháng: {formatViMonth(filters.month_from)}</span>}
              {filters.view === 'month' && filters.month_to && <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">Đến tháng: {formatViMonth(filters.month_to)}</span>}
              {filters.view === 'day' && filters.date_from && <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">Từ ngày: {formatViDate(filters.date_from)}</span>}
              {filters.view === 'day' && filters.date_to && <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">Đến ngày: {formatViDate(filters.date_to)}</span>}
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>
        )}

        <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
          <KpiCard label="Tổng HĐ" value={loading ? '...' : fmtNumber(data.summary.total_contracts)} sub={`${fmtNumber(data.summary.beneficiaries)} người thụ hưởng`} icon={<Crown size={20} />} tone="indigo" />
          <KpiCard label="Giá trị HĐ" value={loading ? '...' : fmtMoney(data.summary.total_value)} sub={`TB ${fmtMoney(data.summary.average_value)} / HĐ`} icon={<WalletCards size={20} />} tone="cyan" />
          <KpiCard label="Giá trị thực" value={loading ? '...' : fmtMoney(data.summary.actual_value)} sub={`Đã TH ${fmtMoney(data.summary.executed_amount)}`} icon={<TrendingUp size={20} />} tone="emerald" />
          <KpiCard label="Đã thanh toán" value={loading ? '...' : fmtMoney(data.summary.paid_amount)} sub={`Tỷ lệ thu ${data.summary.collection_rate}%`} icon={<ShieldCheck size={20} />} tone="emerald" />
          <KpiCard label="Tiền thuế" value={loading ? '...' : fmtMoney(data.summary.tax_amount)} sub={`VAT 8% · DT thực ${fmtMoney(data.summary.gross_revenue)}`} icon={<Receipt size={20} />} tone="violet" />
          <KpiCard label="Hoa hồng CTV" value={loading ? '...' : fmtMoney(data.summary.net_commission)} sub={`Gộp ${fmtMoney(data.summary.gross_commission)} − thuế TNCN 10%`} icon={<HandCoins size={20} />} tone="teal" />
          <KpiCard label="Công nợ" value={loading ? '...' : fmtMoney(data.summary.debt_amount)} sub={`Tỷ lệ nợ ${data.summary.debt_rate}%`} icon={<Activity size={20} />} tone="rose" />
          <KpiCard label="Sắp hết hạn" value={loading ? '...' : fmtNumber(data.summary.expiring_soon)} sub={`${fmtNumber(data.summary.expired)} HĐ đã quá hạn`} icon={<CalendarDays size={20} />} tone="amber" />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="grid grid-cols-1 gap-5 xl:col-span-2 2xl:grid-cols-2">
            <div className="relative overflow-hidden rounded-2xl border border-cyan-100 bg-gradient-to-br from-white via-cyan-50/20 to-sky-50/30 p-4 shadow-sm">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-200/30 blur-3xl" />
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wide text-slate-800">Hội viên đăng ký theo {unitLabel}</h2>
                  <p className="text-xs font-semibold text-slate-400">Cột theo {unitLabel} tạo hợp đồng MBS</p>
                </div>
                <BarChart3 size={19} className="text-cyan-500" />
              </div>
              <GrowthBarChart data={data.charts.daily} unitLabel={unitLabel} />
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-yellow-100 bg-gradient-to-br from-white via-yellow-50/20 to-amber-50/30 p-4 shadow-sm">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-yellow-200/30 blur-3xl" />
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wide text-slate-800">Doanh thu & hoa hồng theo {unitLabel}</h2>
                  <p className="text-xs font-semibold text-slate-400">Đường theo {unitLabel} tạo hợp đồng MBS</p>
                </div>
                <LineChart size={19} className="text-amber-500" />
              </div>
              <FinancialTrendChart data={data.charts.daily} unitLabel={unitLabel} />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/20 to-violet-50/30 p-4 shadow-sm">
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-indigo-200/30 blur-3xl" />
            <div className="relative mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wide text-slate-800">Cơ cấu trạng thái</h2>
                <p className="text-xs font-semibold text-slate-400">Theo số lượng hợp đồng</p>
              </div>
              <PieChart size={19} className="text-indigo-500" />
            </div>
            <div className="relative"><DonutChart data={data.charts.status} /></div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-white via-violet-50/20 to-purple-50/30 p-4 shadow-sm">
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-violet-200/30 blur-3xl" />
            <div className="relative mb-4 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-800">Top phụ trách</h2>
              <Users size={18} className="text-violet-500" />
            </div>
            <div className="relative space-y-4">
              {data.charts.owners.map((item) => <BarRow key={item.label} item={item} max={ownerMax} color="bg-violet-500" />)}
              {data.charts.owners.length === 0 && <p className="py-8 text-center text-sm font-semibold text-slate-400">Chưa có dữ liệu</p>}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/30 p-4 shadow-sm">
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-200/30 blur-3xl" />
            <div className="relative mb-4 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-800">Kiểu hợp đồng</h2>
              <BarChart3 size={18} className="text-emerald-500" />
            </div>
            <div className="relative space-y-4">
              {data.charts.types.map((item) => <BarRow key={item.label} item={item} max={typeMax} color="bg-emerald-500" />)}
              {data.charts.types.length === 0 && <p className="py-8 text-center text-sm font-semibold text-slate-400">Chưa có dữ liệu</p>}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-white via-amber-50/20 to-orange-50/30 p-4 shadow-sm">
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber-200/30 blur-3xl" />
            <div className="relative mb-4 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-800">Hồ sơ & thời hạn</h2>
              <FileCheck2 size={18} className="text-amber-500" />
            </div>
            <div className="relative space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 p-3 text-center shadow-sm">
                  <p className="text-xl font-black text-indigo-700">{data.summary.doc_complete_rate}%</p>
                  <p className="text-[10px] font-bold uppercase text-indigo-400">Đủ hồ sơ</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-cyan-100 to-cyan-50 p-3 text-center shadow-sm">
                  <p className="text-xl font-black text-cyan-700">{data.summary.contract_scan_rate}%</p>
                  <p className="text-[10px] font-bold uppercase text-cyan-400">Scan HĐ</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 p-3 text-center shadow-sm">
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
