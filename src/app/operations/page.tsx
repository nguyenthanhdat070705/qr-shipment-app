'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck, Plus, Eye, BarChart3, Clock, CheckCircle, AlertCircle,
  RefreshCw, ArrowRight, ChevronRight, MapPin, Phone, Package,
  Activity, Zap, TrendingUp, Calendar, Search, Filter,
  ScanLine, BookOpen, Warehouse, Users, Navigation, Bell,
  Star, Target, Shield, Layers, CalendarDays
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import GanttChart from '@/components/GanttChart';
import type { GanttTask } from '@/components/GanttChart';
import type { DeliveryOrder } from '@/types';

/* ── Helpers ────────────────────────────────────────────── */
const STATUS_MAP: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:    { label: 'Đã hoàn thành', color: 'text-teal-700',   bg: 'bg-teal-50 border-teal-200',   dot: 'bg-teal-400' },
  assigned:   { label: 'Đã phân công', color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',     dot: 'bg-blue-400'  },
  in_transit: { label: 'Đang giao',    color: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-200', dot: 'bg-indigo-500 animate-pulse' },
  delivered:  { label: 'Đã giao',      color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  cancelled:  { label: 'Đã hủy',       color: 'text-red-700',     bg: 'bg-red-50 border-red-200',       dot: 'bg-red-400'   },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { label: status, color: 'text-gray-600', bg: 'bg-gray-100 border-gray-200', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${s.bg} ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
      {s.label}
    </span>
  );
}

/* ── Stat Card ────────────────────────────────────────────── */
function StatCard({
  label, value, sub, icon, gradient, accent, onClick,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; gradient: string; accent: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 w-full text-left"
    >
      <div className={`absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-[0.07] ${gradient}`} />
      <div className="flex items-start justify-between relative">
        <div className="flex-1">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
          <p className={`text-3xl font-black leading-none ${accent}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-2 font-medium">{sub}</p>}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${gradient} text-white shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
      </div>
    </button>
  );
}

/* ── Quick Action Card ────────────────────────────────────── */
function QuickAction({
  icon, title, desc, href, gradient, iconBg, badge,
}: {
  icon: React.ReactNode; title: string; desc: string;
  href: string; gradient?: string; iconBg: string; badge?: string;
}) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(href)}
      className="group relative flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-200 text-left w-full overflow-hidden"
    >
      {gradient && <div className={`absolute inset-0 ${gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />}
      <div className={`relative flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg} flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0 relative">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-gray-900 truncate">{title}</p>
          {badge && (
            <span className="flex-shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-600">{badge}</span>
          )}
        </div>
        <p className="text-xs text-gray-400 truncate mt-0.5">{desc}</p>
      </div>
      <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
    </button>
  );
}

/* ── Gantt Color Palette (flat, vibrant) ────────────────────── */
const GANTT_COLORS = [
  '#EF5350', '#FFA726', '#29B6F6', '#66BB6A', '#AB47BC',
  '#26C6DA', '#EC407A', '#5C6BC0', '#FF7043', '#8D6E63',
  '#FFCA28', '#78909C', '#42A5F5', '#7E57C2', '#009688',
];

/* ── Parse DD/MM/YYYY date ────────────────────────────────── */
function parseDateVN(str: string | null | undefined): Date | null {
  if (!str) return null;
  // Handle DD/MM/YYYY
  const parts = str.trim().split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  // Fallback: try ISO parse
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/* ── Gantt Categories ────────────────────────────────────── */
const GANTT_CATEGORIES = [
  { key: 'funeral', label: 'Tang lễ', color: '#EF5350' },
  { key: 'delivery', label: 'Giao hàng', color: '#42A5F5' },
  { key: 'export', label: 'Xuất kho', color: '#66BB6A' },
];

/* ── Main Dashboard ────────────────────────────────────────── */
export default function OperationsDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'gantt'>('dashboard');
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [nowStr, setNowStr] = useState('');
  const [issueHistory, setIssueHistory] = useState<any[]>([]);
  const [funerals, setFunerals] = useState<any[]>([]);
  const [ganttLoading, setGanttLoading] = useState(false);

  /* Live clock */
  useEffect(() => {
    const fmt = () => {
      const n = new Date();
      setNowStr(n.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    fmt();
    const id = setInterval(fmt, 1000);
    return () => clearInterval(id);
  }, []);

  /* Load data */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordRes, issRes] = await Promise.all([
        fetch('/api/operations').then(r => r.json()),
        fetch('/api/goods-issue/history').then(r => r.json()),
      ]);
      setOrders(ordRes.data || []);
      setIssueHistory(issRes.data || []);
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  /* Load funerals for Gantt */
  const loadFunerals = useCallback(async () => {
    setGanttLoading(true);
    try {
      const res = await fetch('/api/funerals');
      const json = await res.json();
      setFunerals(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setGanttLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadFunerals();
    try {
      const u = JSON.parse(localStorage.getItem('auth_user') || '{}');
      setUserName(u.ho_ten || u.name || u.email?.split('@')[0] || 'Vận hành');
    } catch { /* */ }
  }, [loadData, loadFunerals]);

  /* Derived stats */
  const total       = orders.length;
  const pending     = orders.filter(o => o.status === 'pending').length;
  const inTransit   = orders.filter(o => o.status === 'in_transit').length;
  const delivered   = orders.filter(o => o.status === 'delivered').length;
  const cancelled   = orders.filter(o => o.status === 'cancelled').length;

  /* Filtered orders */
  const filteredOrders = orders.filter(o => {
    const matchStatus = filterStatus === 'all' || o.status === filterStatus;
    const matchSearch = !searchQuery ||
      o.do_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  /* Today's issues */
  const todayIssues = issueHistory.filter(i => {
    const d = new Date(i.created_at);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
  });

  /* ══════════════════════════════════════════════════
     Transform data → Gantt Tasks
  ══════════════════════════════════════════════════ */
  const ganttTasks: GanttTask[] = useMemo(() => {
    const tasks: GanttTask[] = [];
    let colorIdx = 0;

    // 1) Funerals → Gantt tasks
    funerals.forEach((f: any) => {
      const startDate = parseDateVN(f.ngay) || (f.created_at ? new Date(f.created_at) : null);
      if (!startDate) return;

      const liemDate = parseDateVN(f.ngay_liem);
      const diQuanDate = parseDateVN(f.ngay_di_quan);

      // End date: ngay_di_quan > ngay_liem > startDate + 2 days
      let endDate = diQuanDate || liemDate || new Date(startDate);
      if (endDate <= startDate) {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 2);
      }

      const color = GANTT_COLORS[colorIdx % GANTT_COLORS.length];
      colorIdx++;

      tasks.push({
        id: `funeral-${f.ma_dam || f.id}`,
        name: f.nguoi_mat || f.ma_dam || 'Đám',
        category: 'funeral',
        startDate,
        endDate,
        color,
        subLabel: `${f.ma_dam || ''} · ${f.loai || ''}`.trim(),
        tooltip: [
          f.dia_chi_to_chuc && `Nơi TC: ${f.dia_chi_to_chuc}`,
          f.sale && `Sale: ${f.sale}`,
          f.dieu_phoi && `Điều phối: ${f.dieu_phoi}`,
          f.ngay_liem && `Liệm: ${f.gio_liem || ''} ${f.ngay_liem}`,
          f.ngay_di_quan && `Di quan: ${f.gio_di_quan || ''} ${f.ngay_di_quan}`,
        ].filter(Boolean).join('\n'),
      });
    });

    // 2) Delivery orders → Gantt tasks
    orders.forEach((o) => {
      const startDate = new Date(o.created_at);
      let endDate = o.delivery_date ? new Date(o.delivery_date) : new Date(startDate);
      if (endDate <= startDate) {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
      }

      tasks.push({
        id: `delivery-${o.id}`,
        name: o.customer_name || o.do_code,
        category: 'delivery',
        startDate,
        endDate,
        color: '#42A5F5',
        subLabel: o.do_code,
        progress: o.status === 'delivered' ? 100 :
                  o.status === 'in_transit' ? 60 :
                  o.status === 'assigned' ? 30 : 10,
        tooltip: [
          `Mã: ${o.do_code}`,
          `KH: ${o.customer_name || '—'}`,
          `SĐT: ${o.customer_phone || '—'}`,
          `Trạng thái: ${STATUS_MAP[o.status]?.label || o.status}`,
        ].join('\n'),
      });
    });

    // 3) Goods issues → Gantt tasks (single-day bars)
    issueHistory.slice(0, 15).forEach((item: any) => {
      const date = new Date(item.created_at);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      tasks.push({
        id: `export-${item.id}`,
        name: item.ten_khach || item.ma_phieu_xuat || 'Phiếu xuất',
        category: 'export',
        startDate: date,
        endDate,
        color: '#66BB6A',
        subLabel: item.ma_phieu_xuat,
        tooltip: `Phiếu xuất: ${item.ma_phieu_xuat}\nKH: ${item.ten_khach || '—'}`,
      });
    });

    // Sort by start date
    tasks.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    return tasks;
  }, [funerals, orders, issueHistory]);

  /* ══════════════════════════════════════════════════
     Tab definitions
  ══════════════════════════════════════════════════ */
  const tabs = [
    { key: 'dashboard' as const, label: 'Dashboard', icon: <BarChart3 size={15} /> },
    { key: 'gantt' as const, label: 'Biểu đồ Gantt', icon: <CalendarDays size={15} /> },
  ];

  return (
    <PageLayout title="Vận hành" icon={<Truck size={16} className="text-orange-500" />}>
      {/* ═══════════════════════════════════════════════════
          Welcome Banner
      ═══════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f2027] p-6 mb-6 shadow-2xl">
        {/* Decorative orbs */}
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-20 w-40 h-40 rounded-full bg-amber-400/10 blur-2xl" />
        <div className="absolute top-1/2 right-1/3 w-32 h-32 rounded-full bg-indigo-500/10 blur-2xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                <span className="text-[11px] font-bold text-orange-300 tracking-wider uppercase">Bộ phận Vận hành · Online</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-1.5">
              Chào buổi sáng, {userName} 🚛
            </h1>
            <p className="text-white/50 text-sm capitalize">{today}</p>
          </div>

          <div className="hidden sm:flex flex-col items-end gap-3">
            {/* Live clock */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
              <Activity size={14} className="text-orange-400" />
              <span className="font-mono text-lg font-black text-white tabular-nums">{nowStr}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => { loadData(); loadFunerals(); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white/70 text-xs font-semibold hover:bg-white/20 transition-colors"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                Làm mới
              </button>
              <button
                onClick={() => router.push('/goods-issue')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold shadow-lg shadow-orange-500/30 hover:from-orange-600 hover:to-amber-600 transition-all"
              >
                <Truck size={15} />
                Xuất hàng
              </button>
            </div>
          </div>
        </div>

        {/* Urgent alerts */}
        {pending > 0 && (
          <div className="mt-4 flex items-center gap-2.5 bg-amber-400/15 border border-amber-400/25 rounded-xl px-4 py-2.5">
            <Bell size={14} className="text-amber-300 flex-shrink-0" />
            <p className="text-xs text-amber-200 font-medium">
              Có <strong className="text-amber-100">{pending} đơn giao</strong> đang chờ xử lý — cần điều phối ngay!
            </p>
            <button
              onClick={() => { setFilterStatus('pending'); setActiveTab('dashboard'); }}
              className="ml-auto text-[11px] font-bold text-amber-300 hover:text-white underline underline-offset-2"
            >
              Xem ngay →
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════
          Tab Navigation
      ═══════════════════════════════════════════════════ */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-2xl mb-6 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════
          Tab: Dashboard
      ═══════════════════════════════════════════════════ */}
      {activeTab === 'dashboard' && (
        <>
          {/* KPI Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Tổng đơn giao"
              value={total}
              sub="Toàn bộ hôm nay"
              icon={<Truck size={22} />}
              gradient="bg-gradient-to-br from-slate-700 to-slate-900"
              accent="text-gray-900"
              onClick={() => setFilterStatus('all')}
            />
            <StatCard
              label="Đang chờ"
              value={pending}
              sub={`${inTransit} đang trên đường`}
              icon={<Clock size={22} />}
              gradient="bg-gradient-to-br from-amber-400 to-orange-500"
              accent="text-amber-600"
              onClick={() => setFilterStatus('pending')}
            />
            <StatCard
              label="Đang giao"
              value={inTransit}
              sub="Trên đường giao"
              icon={<Navigation size={22} />}
              gradient="bg-gradient-to-br from-indigo-500 to-violet-600"
              accent="text-indigo-600"
              onClick={() => setFilterStatus('in_transit')}
            />
            <StatCard
              label="Đã hoàn thành"
              value={delivered}
              sub={`${cancelled} đã hủy`}
              icon={<CheckCircle size={22} />}
              gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
              accent="text-emerald-600"
              onClick={() => setFilterStatus('delivered')}
            />
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── LEFT: Orders Table (2/3) ── */}
            <div className="lg:col-span-2 space-y-4">

              {/* Search + Filter Bar */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Tìm mã đơn, khách hàng..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl p-1">
                  {[
                    { val: 'all',        label: 'Tất cả' },
                    { val: 'pending',    label: 'Chờ' },
                    { val: 'in_transit', label: 'Đang giao' },
                    { val: 'delivered',  label: 'Xong' },
                  ].map(f => (
                    <button
                      key={f.val}
                      onClick={() => setFilterStatus(f.val)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        filterStatus === f.val
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 rounded-full bg-orange-500" />
                  <h2 className="font-black text-gray-900 text-base">Danh sách đơn giao hàng</h2>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-[10px] font-black">
                    {filteredOrders.length}
                  </span>
                </div>
                <button
                  onClick={() => router.push('/operations/create')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-black hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all"
                >
                  <Plus size={14} />
                  Tạo đơn mới
                </button>
              </div>

              {/* Table */}
              {loading ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-16 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-100 border-t-orange-500" />
                    <p className="text-sm text-gray-400 font-medium">Đang tải dữ liệu...</p>
                  </div>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                  <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Truck size={28} className="text-orange-300" />
                  </div>
                  <p className="text-gray-500 font-semibold">Không có đơn giao nào</p>
                  <p className="text-xs text-gray-400 mt-1">Thử thay đổi bộ lọc hoặc tạo đơn mới</p>
                  <button
                    onClick={() => router.push('/operations/create')}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-50 text-orange-600 text-sm font-bold hover:bg-orange-100 transition-colors"
                  >
                    <Plus size={14} /> Tạo đơn giao hàng
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="divide-y divide-gray-50">
                    {filteredOrders.map((order) => (
                      <div
                        key={order.id}
                        onClick={() => router.push(`/operations/${order.id}`)}
                        className="flex items-center gap-4 px-5 py-4 hover:bg-orange-50/40 cursor-pointer group transition-colors"
                      >
                        {/* Icon */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                          <Truck size={18} className="text-orange-500" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-black text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md">
                              {order.do_code}
                            </span>
                            <StatusPill status={order.status} />
                          </div>
                          <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">
                            {order.customer_name || '—'}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5">
                            {order.customer_phone && (
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <Phone size={10} /> {order.customer_phone}
                              </span>
                            )}
                            {order.warehouse?.name && (
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <Warehouse size={10} /> {order.warehouse.name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right */}
                        <div className="flex-shrink-0 text-right">
                          {order.delivery_date && (
                            <p className="text-xs font-semibold text-gray-700">
                              {new Date(order.delivery_date).toLocaleDateString('vi-VN')}
                            </p>
                          )}
                          {order.assigned_to && (
                            <p className="text-xs text-gray-400 mt-0.5">{order.assigned_to}</p>
                          )}
                        </div>

                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center">
                            <Eye size={13} className="text-orange-600" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              {total > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Target size={15} className="text-orange-500" />
                    <h3 className="text-sm font-black text-gray-900">Tiến độ giao hàng hôm nay</h3>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Đã giao thành công', count: delivered, color: 'bg-emerald-500', pct: Math.round((delivered / total) * 100) },
                      { label: 'Đang trên đường', count: inTransit, color: 'bg-indigo-500', pct: Math.round((inTransit / total) * 100) },
                      { label: 'Chờ điều phối', count: pending, color: 'bg-amber-400', pct: Math.round((pending / total) * 100) },
                    ].map(item => (
                      <div key={item.label}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-gray-500 font-medium">{item.label}</span>
                          <span className="text-xs font-bold text-gray-700">{item.count}/{total} · {item.pct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${item.color} transition-all duration-1000`}
                            style={{ width: `${item.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT: Actions + History (1/3) ── */}
            <div className="space-y-5">

              {/* Quick Actions */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 rounded-full bg-indigo-500" />
                  <h2 className="font-black text-gray-900 text-base">Thao tác nhanh</h2>
                </div>
                <div className="space-y-2">
                  <QuickAction
                    icon={<Truck size={20} className="text-orange-600" />}
                    title="Xuất hàng (Goods Issue)"
                    desc="Quét QR & lập phiếu xuất kho"
                    href="/goods-issue"
                    gradient="bg-orange-500"
                    iconBg="bg-orange-100"
                    badge={pending > 0 ? `${pending} chờ` : undefined}
                  />
                  <QuickAction
                    icon={<BookOpen size={20} className="text-pink-600" />}
                    title="Danh sách Đám"
                    desc="Xem thông tin tổ chức tang lễ"
                    href="/funerals"
                    gradient="bg-pink-500"
                    iconBg="bg-pink-100"
                  />
                  <QuickAction
                    icon={<Navigation size={20} className="text-indigo-600" />}
                    title="Điều phối giao hàng"
                    desc="Phân công & theo dõi đơn"
                    href="/operations/create"
                    gradient="bg-indigo-500"
                    iconBg="bg-indigo-100"
                  />
                  <QuickAction
                    icon={<Warehouse size={20} className="text-sky-600" />}
                    title="Tình trạng kho"
                    desc="Xem tồn kho sẵn sàng xuất"
                    href="/inventory"
                    gradient="bg-sky-500"
                    iconBg="bg-sky-100"
                  />
                  <QuickAction
                    icon={<ScanLine size={20} className="text-teal-600" />}
                    title="Tìm kiếm sản phẩm"
                    desc="Quét QR hoặc nhập mã sản phẩm"
                    href="/"
                    gradient="bg-teal-500"
                    iconBg="bg-teal-100"
                  />
                </div>
              </div>

              {/* Today Summary */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Activity size={15} className="text-orange-500" />
                  <h3 className="text-sm font-black text-gray-900">Xuất hàng hôm nay</h3>
                </div>
                {todayIssues.length === 0 ? (
                  <div className="text-center py-4">
                    <Package size={24} className="text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 font-medium">Chưa có phiếu xuất hôm nay</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todayIssues.slice(0, 4).map((item: any) => {
                      const fi = item.fact_xuat_hang_items?.[0];
                      return (
                        <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 hover:bg-orange-50 transition-colors">
                          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                            <Package size={14} className="text-orange-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate">
                              {fi ? fi.ten_hom : item.ten_khach || 'N/A'}
                            </p>
                            <p className="text-[10px] text-gray-400 font-mono">{item.ma_phieu_xuat}</p>
                          </div>
                          <StatusPill status={item.trang_thai || 'pending'} />
                        </div>
                      );
                    })}
                    {todayIssues.length > 4 && (
                      <button
                        onClick={() => router.push('/goods-issue')}
                        className="w-full text-center text-xs font-bold text-orange-500 hover:text-orange-600 py-2"
                      >
                        Xem thêm {todayIssues.length - 4} phiếu →
                      </button>
                    )}
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-medium">Tổng phiếu xuất</span>
                  <span className="text-lg font-black text-orange-600">{todayIssues.length}</span>
                </div>
              </div>

              {/* Workflow Guide */}
              <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Shield size={14} className="text-orange-400" />
                  <h3 className="text-sm font-black text-white">Quy trình vận hành</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { step: '01', title: 'Nhận phiếu yêu cầu', desc: 'Xem danh sách đám cần xuất hàng từ tab Đám', color: 'text-orange-400', bg: 'bg-orange-500/20' },
                    { step: '02', title: 'Xuất hàng', desc: 'Quét QR hoặc nhập mã để lập phiếu xuất kho', color: 'text-amber-400', bg: 'bg-amber-500/20' },
                    { step: '03', title: 'Điều phối giao', desc: 'Phân công nhân viên & cập nhật trạng thái', color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
                    { step: '04', title: 'Hoàn tất', desc: 'Xác nhận giao thành công, cập nhật hệ thống', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
                  ].map(w => (
                    <div key={w.step} className="flex items-start gap-3">
                      <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${w.bg} flex-shrink-0`}>
                        <span className={`text-[10px] font-black ${w.color}`}>{w.step}</span>
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${w.color}`}>{w.title}</p>
                        <p className="text-[11px] text-white/40 mt-0.5 leading-relaxed">{w.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Last refresh */}
              <p className="text-xs text-gray-300 text-center">
                Cập nhật lúc {lastRefresh.toLocaleTimeString('vi-VN')}
              </p>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════
          Tab: Gantt Chart
      ═══════════════════════════════════════════════════ */}
      {activeTab === 'gantt' && (
        <div className="space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 flex-shrink-0">
                <BookOpen size={18} className="text-red-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tang lễ</p>
                <p className="text-xl font-black text-gray-900">{funerals.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 flex-shrink-0">
                <Truck size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Giao hàng</p>
                <p className="text-xl font-black text-gray-900">{orders.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 flex-shrink-0">
                <Package size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Xuất kho</p>
                <p className="text-xl font-black text-gray-900">{issueHistory.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 flex-shrink-0">
                <Layers size={18} className="text-purple-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tổng công việc</p>
                <p className="text-xl font-black text-gray-900">{ganttTasks.length}</p>
              </div>
            </div>
          </div>

          {/* Gantt Chart */}
          {ganttLoading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-100 border-t-orange-500" />
                <p className="text-sm text-gray-400 font-medium">Đang tải biểu đồ Gantt...</p>
              </div>
            </div>
          ) : ganttTasks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
              <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarDays size={28} className="text-orange-300" />
              </div>
              <p className="text-gray-500 font-semibold">Chưa có dữ liệu cho biểu đồ Gantt</p>
              <p className="text-xs text-gray-400 mt-1">Cần có dữ liệu tang lễ, đơn giao hoặc phiếu xuất</p>
            </div>
          ) : (
            <GanttChart
              tasks={ganttTasks}
              title="Biểu đồ Gantt — Tổng quan Vận hành"
              categories={GANTT_CATEGORIES}
            />
          )}

          {/* Info note */}
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-orange-50 border border-orange-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 flex-shrink-0 mt-0.5">
              <CalendarDays size={16} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-orange-800">Hướng dẫn sử dụng Gantt Chart</p>
              <ul className="text-[11px] text-orange-700/70 mt-1 space-y-0.5">
                <li>• Kéo ngang để xem timeline theo ngày/tuần/tháng</li>
                <li>• Di chuột lên thanh màu để xem chi tiết công việc</li>
                <li>• Dùng nút <strong>Zoom +/−</strong> để phóng to / thu nhỏ</li>
                <li>• Bấm <strong>Hôm nay</strong> để nhảy về vị trí ngày hiện tại</li>
                <li>• Lọc theo loại công việc bằng dropdown hoặc chú thích</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
