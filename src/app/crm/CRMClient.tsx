'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Target, CheckSquare, RefreshCw, Building2,
  Search, Phone, Mail, MapPin, Calendar, TrendingUp,
  Clock, ChevronRight, AlertCircle, Wifi, WifiOff,
  Activity, ArrowUpRight, Filter, Download, Package
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────
interface Customer {
  id: string;
  oneoffice_id: number;
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  company: string;
  assigned_name: string;
  status: string;
  customer_type: string;
  source: string;
  total_revenue: number;
  synced_at: string;
}

interface Lead {
  id: string;
  oneoffice_id: number;
  code: string;
  title: string;
  customer_name: string;
  customer_phone: string;
  assigned_to: string;
  stage: string;
  value: number;
  currency: string;
  probability: number;
  expected_close: string;
  status: string;
  synced_at: string;
}

interface Task {
  id: string;
  oneoffice_id: number;
  title: string;
  assigned_to: string;
  status: string;
  priority: string;
  due_date: string;
  related_type: string;
  synced_at: string;
}

interface Product {
  id: string;
  oneoffice_id: number;
  code: string;
  name: string;
  barcode: string;
  category: string;
  cost_price: number;
  selling_price: number;
  is_active: boolean;
  updated_at: string;
}

interface Stats {
  customers: { total: number };
  leads: { total: number; total_value: number };
  tasks: { total: number; pending: number };
  products?: { total: number };
  last_sync: { finished_at: string; status: string; duration_ms: number } | null;
}

// ── Helpers ───────────────────────────────────────────────────────
function fmtCurrency(val: number) {
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}B`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return val.toLocaleString('vi-VN');
}
function timeAgo(iso: string) {
  if (!iso) return 'Chưa sync';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}
function statusColor(status: string) {
  const s = (status || '').toLowerCase();
  if (s.includes('tiềm') || s.includes('lead')) return 'bg-blue-100 text-blue-700';
  if (s.includes('khách') || s.includes('active')) return 'bg-emerald-100 text-emerald-700';
  if (s.includes('vip')) return 'bg-amber-100 text-amber-700';
  if (s.includes('hoàn')) return 'bg-emerald-100 text-emerald-700';
  if (s.includes('đang')) return 'bg-blue-100 text-blue-700';
  if (s.includes('cao') || s.includes('high')) return 'bg-rose-100 text-rose-700';
  if (s.includes('thấp') || s.includes('low')) return 'bg-gray-100 text-gray-500';
  return 'bg-gray-100 text-gray-600';
}
function priorityDot(priority: string) {
  const p = (priority || '').toLowerCase();
  if (p.includes('cao') || p.includes('high')) return 'bg-rose-500';
  if (p.includes('thấp') || p.includes('low')) return 'bg-gray-400';
  return 'bg-amber-400';
}

// ── CRM Dashboard Client ──────────────────────────────────────────
export default function CRMClient() {
  const [activeTab, setActiveTab] = useState<'customers' | 'leads' | 'tasks' | 'products' | 'sync'>('customers');
  const [stats, setStats] = useState<Stats | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 50;

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ── Fetch Stats ─────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/1office-crm?type=stats');
      const data = await res.json();
      if (!data.error) setStats(data);
    } catch { /* ignore */ }
  }, []);

  // ── Fetch Table Data ─────────────────────────────────────────────
  const fetchData = useCallback(async (tab = activeTab, pg = page, sq = search, sf = statusFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: tab,
        page: String(pg),
        limit: String(LIMIT),
        search: sq,
        ...(sf ? { status: sf } : {}),
      });
      const res = await fetch(`/api/1office-crm?${params}`);
      const json = await res.json();
      if (!json.error) {
        setTotal(json.total || 0);
        if (tab === 'customers') setCustomers(json.data || []);
        if (tab === 'leads') setLeads(json.data || []);
        if (tab === 'tasks') setTasks(json.data || []);
        if (tab === 'products') setProducts(json.data || []);
        setLastRefresh(new Date());
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [activeTab, page, search, statusFilter]);

  // ── Initial load ─────────────────────────────────────────────────
  useEffect(() => {
    fetchStats();
    fetchData(activeTab, 1, search, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Tab change ───────────────────────────────────────────────────
  useEffect(() => {
    setPage(1);
    setSearch('');
    setStatusFilter('');
    fetchData(activeTab, 1, '', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ── Auto-polling (30s) ───────────────────────────────────────────
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoSync) {
      intervalRef.current = setInterval(() => {
        fetchStats();
        fetchData(activeTab, page, search, statusFilter);
      }, 30_000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSync, activeTab, page, search, statusFilter]);

  // ── Search debounce ───────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchData(activeTab, 1, search, statusFilter); }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // ── Trigger full sync ─────────────────────────────────────────────
  const handleSync = async (mode: 'full' | 'delta' = 'full') => {
    setSyncing(true);
    setSyncMsg(`Đang sync ${mode === 'full' ? 'toàn bộ' : 'delta'} dữ liệu...`);
    try {
      const res = await fetch('/api/1office-crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, tables: ['customers', 'leads', 'tasks', 'products'] }),
      });
      const data = await res.json();
      if (data.error) {
        setSyncMsg(`❌ Lỗi: ${data.error}`);
      } else {
        const { customers: c, leads: l, tasks: t, products: p } = data.results || {};
        setSyncMsg(
          `✅ Sync xong! KH: ${c?.upserted || 0}, Leads: ${l?.upserted || 0}, Tasks: ${t?.upserted || 0}, HH: ${p?.upserted || 0} | ${data.duration_ms}ms`
        );
        await fetchStats();
        await fetchData(activeTab, page, search, statusFilter);
      }
    } catch (err: unknown) {
      setSyncMsg(`❌ ${String(err)}`);
    }
    setSyncing(false);
    setTimeout(() => setSyncMsg(''), 6000);
  };

  // ── Tabs config ───────────────────────────────────────────────────
  const tabs = [
    { id: 'customers' as const, label: 'Khách Hàng', icon: Users, count: stats?.customers.total },
    { id: 'leads' as const, label: 'Cơ Hội', icon: Target, count: stats?.leads.total },
    { id: 'tasks' as const, label: 'Công Việc', icon: CheckSquare, count: stats?.tasks.total },
    { id: 'products' as const, label: 'Hàng hóa', icon: Package, count: stats?.products?.total },
    { id: 'sync' as const, label: 'Sync Log', icon: Activity, count: undefined },
  ];

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-wrap gap-3 justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 size={22} className="text-violet-600" />
              <h1 className="text-xl font-extrabold text-gray-900">1Office CRM</h1>
              <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${autoSync ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {autoSync ? <Wifi size={11} /> : <WifiOff size={11} />}
                {autoSync ? 'Live' : 'Manual'}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {lastRefresh ? `Cập nhật: ${timeAgo(lastRefresh.toISOString())}` : 'Chưa tải dữ liệu'}
              {stats?.last_sync && ` · Sync: ${timeAgo(stats.last_sync.finished_at)}`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Auto sync toggle */}
            <button
              onClick={() => setAutoSync(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all border
                ${autoSync ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
            >
              {autoSync ? <Wifi size={14} /> : <WifiOff size={14} />}
              Auto-sync
            </button>

            {/* Delta sync */}
            <button
              onClick={() => handleSync('delta')}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              Delta Sync
            </button>

            {/* Full sync */}
            <button
              onClick={() => handleSync('full')}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-all disabled:opacity-50 shadow-sm"
            >
              <Download size={14} />
              Full Sync
            </button>
          </div>
        </div>

        {/* Sync status message */}
        {syncMsg && (
          <div className={`mt-3 px-4 py-2.5 rounded-xl text-sm font-medium ${syncMsg.includes('❌') ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
            {syncMsg}
          </div>
        )}

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="bg-violet-50 rounded-xl p-3 border border-violet-100">
              <p className="text-xs text-violet-600 font-medium">Khách Hàng</p>
              <p className="text-2xl font-extrabold text-violet-700">{stats.customers.total.toLocaleString()}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
              <p className="text-xs text-blue-600 font-medium">Cơ Hội</p>
              <p className="text-2xl font-extrabold text-blue-700">{stats.leads.total.toLocaleString()}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
              <p className="text-xs text-amber-600 font-medium">Giá Trị Pipeline</p>
              <p className="text-2xl font-extrabold text-amber-700">{fmtCurrency(stats.leads.total_value)}</p>
            </div>
            <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
              <p className="text-xs text-rose-600 font-medium">Tasks Chờ</p>
              <p className="text-2xl font-extrabold text-rose-700">{stats.tasks.pending}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all
              ${activeTab === tab.id ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <tab.icon size={15} />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab.id ? 'bg-violet-100 text-violet-700' : 'bg-gray-200 text-gray-500'}`}>
                {tab.count.toLocaleString()}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Search & Filter ─────────────────────────────────────── */}
      {activeTab !== 'sync' && (
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={
                activeTab === 'customers' ? 'Tìm tên, SĐT, email, mã...' :
                activeTab === 'leads' ? 'Tìm tên cơ hội, khách hàng...' :
                activeTab === 'products' ? 'Tìm mã sản phẩm, tên, barcode...' :
                'Tìm tên công việc...'
              }
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400"
            />
          </div>
          <button
            onClick={() => { setPage(1); fetchData(activeTab, 1, search, statusFilter); }}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-all shadow-sm disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[400px] overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-2xl">
            <RefreshCw className="animate-spin text-violet-500" size={24} />
          </div>
        )}

        {/* ── CUSTOMERS TAB ──────────────────────────────────── */}
        {activeTab === 'customers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Khách hàng</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Liên hệ</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Phụ trách</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Trạng thái</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={c.id} className={`border-b border-gray-50 hover:bg-violet-50/30 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {(c.name || 'K')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 truncate max-w-[200px]">{c.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{c.code || `#${c.oneoffice_id}`}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {c.phone && <p className="flex items-center gap-1 text-gray-600 text-xs"><Phone size={11} />{c.phone}</p>}
                      {c.email && <p className="flex items-center gap-1 text-gray-400 text-xs truncate max-w-[180px]"><Mail size={11} />{c.email}</p>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">{c.assigned_name || '—'}</td>
                    <td className="px-4 py-3">
                      {c.status && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor(c.status)}`}>
                          {c.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      {c.total_revenue > 0 && (
                        <span className="text-sm font-bold text-emerald-600">
                          {fmtCurrency(c.total_revenue)}đ
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && !loading && (
                  <tr><td colSpan={5} className="text-center py-16 text-gray-400">
                    <Users size={32} className="mx-auto mb-2 opacity-30" />
                    Chưa có dữ liệu. Nhấn <strong>Full Sync</strong> để tải.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── LEADS TAB ──────────────────────────────────────── */}
        {activeTab === 'leads' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Cơ hội</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Khách hàng</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Giai đoạn</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Giá trị</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Đóng dự kiến</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l, i) => (
                  <tr key={l.id} className={`border-b border-gray-50 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800 truncate max-w-[220px]">{l.title}</p>
                      <p className="text-xs text-gray-400 font-mono">{l.code || `#${l.oneoffice_id}`}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-gray-700 text-xs font-medium">{l.customer_name || '—'}</p>
                      {l.customer_phone && <p className="text-gray-400 text-xs flex items-center gap-1"><Phone size={10} />{l.customer_phone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {l.stage && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor(l.stage)}`}>{l.stage}</span>}
                      {l.probability > 0 && <p className="text-xs text-gray-400 mt-0.5">{l.probability}%</p>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-violet-700">{fmtCurrency(l.value || 0)}</span>
                      <span className="text-xs text-gray-400 ml-1">{l.currency || 'VND'}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                      {l.expected_close ? (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {new Date(l.expected_close).toLocaleDateString('vi-VN')}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
                {leads.length === 0 && !loading && (
                  <tr><td colSpan={5} className="text-center py-16 text-gray-400">
                    <Target size={32} className="mx-auto mb-2 opacity-30" />
                    Chưa có dữ liệu. Nhấn <strong>Full Sync</strong> để tải.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TASKS TAB ──────────────────────────────────────── */}
        {activeTab === 'tasks' && (
          <div className="divide-y divide-gray-50">
            {tasks.map(t => (
              <div key={t.id} className="px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3">
                <div className={`w-2 h-8 rounded-full flex-shrink-0 ${priorityDot(t.priority)}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{t.title}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    {t.assigned_to && <span>{t.assigned_to}</span>}
                    {t.due_date && (
                      <span className="flex items-center gap-0.5">
                        <Calendar size={10} />
                        {new Date(t.due_date).toLocaleDateString('vi-VN')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>
                    {t.status || '—'}
                  </span>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${priorityDot(t.priority) === 'bg-rose-500' ? 'text-rose-600' : 'text-gray-400'}`}>
                    {t.priority}
                  </span>
                </div>
              </div>
            ))}
            {tasks.length === 0 && !loading && (
              <div className="text-center py-16 text-gray-400">
                <CheckSquare size={32} className="mx-auto mb-2 opacity-30" />
                Chưa có dữ liệu. Nhấn <strong>Full Sync</strong> để tải.
              </div>
            )}
          </div>
        )}

        {/* ── PRODUCTS TAB ──────────────────────────────────────── */}
        {activeTab === 'products' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Sản phẩm</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Mã kho / Barcode</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Danh mục</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Giá bán</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={p.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{p.code}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {p.barcode || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {p.category ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {p.category}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-emerald-600">{fmtCurrency(p.selling_price || 0)}đ</span>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && !loading && (
                  <tr><td colSpan={4} className="text-center py-16 text-gray-400">
                    <Package size={32} className="mx-auto mb-2 opacity-30" />
                    Chưa có dữ liệu. Nhấn <strong>Full Sync</strong> để tải.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── SYNC LOG TAB ───────────────────────────────────── */}
        {activeTab === 'sync' && <SyncLogTab />}
      </div>

      {/* ── Pagination ──────────────────────────────────────────── */}
      {activeTab !== 'sync' && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {total.toLocaleString()} bản ghi · Trang {page}/{totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => { setPage(p => p - 1); fetchData(activeTab, page - 1, search, statusFilter); }}
              className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50"
            >← Trước</button>
            <button
              disabled={page >= totalPages}
              onClick={() => { setPage(p => p + 1); fetchData(activeTab, page + 1, search, statusFilter); }}
              className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50"
            >Tiếp →</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sync Log Sub-component ─────────────────────────────────────────
function SyncLogTab() {
  const [logs, setLogs] = useState<{ id: string; sync_type: string; status: string; fetched: number; upserted: number; errors: number; duration_ms: number; started_at: string; finished_at: string; error_msg: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/1office-crm?type=sync_logs')
      .then(r => r.json())
      .then(d => { setLogs(d.data || []); setLoading(false); });
  }, []);

  if (loading) return <div className="py-16 text-center text-gray-400"><RefreshCw className="animate-spin mx-auto mb-2" size={24} />Đang tải...</div>;

  return (
    <div className="divide-y divide-gray-50">
      {logs.map(log => (
        <div key={log.id} className="px-5 py-3 flex items-center gap-4">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${log.status === 'success' ? 'bg-emerald-500' : log.status === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-rose-500'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-700">{log.sync_type}</p>
            <p className="text-xs text-gray-400">{new Date(log.started_at).toLocaleString('vi-VN')}</p>
          </div>
          <div className="text-right text-xs text-gray-500 hidden sm:block">
            <p>Fetch: <strong>{log.fetched}</strong> · Upsert: <strong className="text-violet-600">{log.upserted}</strong></p>
            <p>{(log.duration_ms / 1000).toFixed(1)}s</p>
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${log.status === 'success' ? 'bg-emerald-100 text-emerald-700' : log.status === 'running' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>
            {log.status}
          </span>
        </div>
      ))}
      {logs.length === 0 && <div className="py-16 text-center text-gray-400">Chưa có lịch sử sync nào.</div>}
    </div>
  );
}
