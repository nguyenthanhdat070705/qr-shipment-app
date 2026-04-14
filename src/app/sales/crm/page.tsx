'use client';

import { useState, useEffect, useCallback } from 'react';
import PageLayout from '@/components/PageLayout';
import {
  BarChart3, Users, ShoppingCart, ClipboardList,
  Search, ChevronLeft, ChevronRight, ExternalLink,
  Phone, Mail, MapPin, Calendar, DollarSign, RefreshCw,
  Building, User, TrendingUp, Clock, Download, CheckCircle, Database,
  Eye, X, Crown, Globe, Briefcase
} from 'lucide-react';

// ═══════════════════════════════
// Types
// ═══════════════════════════════
interface Account {
  account_id: string;
  account_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  account_type: string;
  account_source: string;
  relation_name: string;
  manager_user_name: string;
  revenue: string;
  created_at: string;
  province_name: string | null;
  ma_hoi_vien: string | null;
  goi_dich_vu: string | null;
}

interface Deal {
  order_id: string;
  order_code: string;
  amount: string;
  order_date: string;
  status: string;
  assigned_name: string;
  payment_status: string;
  account_info: {
    account_id: string;
    phone: string;
  };
}

interface Task {
  task_id: string;
  task_name: string;
  receiver_name: string;
  task_start_date: string;
  task_end_date: string;
  task_status: string;
  task_remain_day: string;
}

// ═══════════════════════════════
// Tabs
// ═══════════════════════════════
type TabType = 'overview' | 'customers' | 'deals' | 'tasks' | 'local';

export default function CRMPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success?: boolean; synced?: number; message?: string; error?: string } | null>(null);

  const tabs = [
    { id: 'overview', label: 'Tổng quan', icon: <BarChart3 size={15} /> },
    { id: 'customers', label: 'Khách hàng', icon: <Users size={15} /> },
    { id: 'deals', label: 'Deals / Đơn hàng', icon: <ShoppingCart size={15} /> },
    { id: 'tasks', label: 'Công việc', icon: <ClipboardList size={15} /> },
    { id: 'local', label: 'Dữ liệu Local', icon: <Database size={15} /> },
  ] as const;

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/sync-getfly', { method: 'POST' });
      const data = await res.json();
      setSyncResult(data);
    } catch (err) {
      setSyncResult({ error: String(err) });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <PageLayout title="CRM GetFly" icon={<Building size={18} className="text-violet-500" />}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">GetFly CRM</h1>
            <p className="text-sm text-gray-500">Dữ liệu thời gian thực từ GetFly</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Sync button */}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-all"
            >
              {syncing ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
              {syncing ? 'Đang sync...' : 'Sync từ GetFly'}
            </button>
            <a
              href="https://blackstonesdvtl.getflycrm.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
            >
              <ExternalLink size={14} />
              Mở GetFly
            </a>
          </div>
        </div>

        {/* Sync result banner */}
        {syncResult && (
          <div className={`px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${
            syncResult.error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
          }`}>
            {syncResult.error ? '⚠️' : <CheckCircle size={16} />}
            {syncResult.error || syncResult.message || `Đã sync ${syncResult.synced} khách hàng`}
            <button onClick={() => setSyncResult(null)} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex-1 justify-center whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'customers' && <CustomersTab />}
        {activeTab === 'deals' && <DealsTab />}
        {activeTab === 'tasks' && <TasksTab />}
        {activeTab === 'local' && <LocalDataTab />}
      </div>
    </PageLayout>
  );
}

// ═══════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════
function OverviewTab() {
  const [data, setData] = useState<{
    accounts_total: number;
    deals_recent: Deal[];
    deals_total_value: number;
    deals_count: number;
    tasks_recent: Task[];
    users_count: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/getfly?type=summary')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users size={20} />} label="Khách hàng" value={data?.accounts_total || 0} color="blue" />
        <StatCard icon={<ShoppingCart size={20} />} label="Deals gần đây" value={data?.deals_count || 0} color="violet" />
        <StatCard icon={<DollarSign size={20} />} label="Doanh số (recent)" value={formatVND(data?.deals_total_value || 0)} color="emerald" />
        <StatCard icon={<User size={20} />} label="Nhân viên" value={data?.users_count || 0} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Deals */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><ShoppingCart size={16} /> Deals gần đây</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {(data?.deals_recent || []).map(deal => (
              <div key={deal.order_id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-bold text-gray-800">#{deal.order_code}</p>
                  <p className="text-xs text-gray-500">{deal.assigned_name} · {deal.order_date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600">{deal.amount}đ</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    deal.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {deal.payment_status === 'paid' ? 'Đã TT' : 'Chưa TT'}
                  </span>
                </div>
              </div>
            ))}
            {(!data?.deals_recent || data.deals_recent.length === 0) && (
              <div className="py-8 text-center text-gray-400 text-sm">Không có dữ liệu</div>
            )}
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><ClipboardList size={16} /> Công việc</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {(data?.tasks_recent || []).map(task => (
              <div key={task.task_id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                <p className="text-sm font-semibold text-gray-800 truncate">{task.task_name}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                  <span><User size={10} className="inline mr-0.5" />{task.receiver_name}</span>
                  <span><Calendar size={10} className="inline mr-0.5" />{task.task_end_date?.split(' ')[0]}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    parseInt(task.task_remain_day) < 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {parseInt(task.task_remain_day) < 0 ? `Quá ${Math.abs(parseInt(task.task_remain_day))} ngày` : `Còn ${task.task_remain_day} ngày`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════
// CUSTOMERS TAB
// ═══════════════════════════════
function CustomersTab() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: 'accounts', page: String(page), per_page: '20' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/getfly?${params}`);
      const data = await res.json();
      setAccounts(data.records || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
            placeholder="Tìm KH theo tên, SĐT..." value={searchInput} onChange={e => setSearchInput(e.target.value)} />
        </div>
        <button type="submit" className="px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-all">Tìm</button>
      </form>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Khách hàng</th>
                <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">SĐT</th>
                <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Loại</th>
                <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Kênh</th>
                <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Stage</th>
                <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">NV phụ trách</th>
                <th className="text-right px-4 py-3 font-bold text-gray-600 text-xs uppercase">Doanh số</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7}><LoadingState /></td></tr>
              ) : accounts.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400">Không tìm thấy khách hàng</td></tr>
              ) : accounts.map(a => (
                <tr key={a.account_id} className="hover:bg-violet-50/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white text-xs font-bold flex-shrink-0">
                        {a.account_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{a.account_name}</p>
                        {a.ma_hoi_vien && <p className="text-[10px] text-yellow-600 font-mono">HV: {a.ma_hoi_vien}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600"><span className="flex items-center gap-1"><Phone size={12} />{a.phone || '—'}</span></td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold">{a.account_type || '—'}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{a.account_source || '—'}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-[10px] font-semibold truncate max-w-[120px] block">{a.relation_name || '—'}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-600">{a.manager_user_name?.split('@')[0] || '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-gray-600">{a.revenue && parseFloat(a.revenue) > 0 ? formatVND(parseFloat(a.revenue)) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-white disabled:opacity-30 transition-all">
            <ChevronLeft size={14} /> Trước
          </button>
          <span className="text-xs font-semibold text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200">Trang {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={accounts.length < 20}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-white disabled:opacity-30 transition-all">
            Sau <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════
// DEALS TAB
// ═══════════════════════════════
function DealsTab() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/getfly?type=deals&page=${page}&per_page=20`)
      .then(r => r.json())
      .then(d => setDeals(d.records || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const totalValue = deals.reduce((sum, d) => sum + parseFloat((d.amount || '0').replace(/,/g, '')), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">Deals trang này</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{deals.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">Tổng giá trị</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{formatVND(totalValue)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">Chưa thanh toán</p>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{deals.filter(d => d.payment_status !== 'paid').length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Mã đơn</th>
                <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">SĐT KH</th>
                <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">NV xử lý</th>
                <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Ngày</th>
                <th className="text-right px-4 py-3 font-bold text-gray-600 text-xs uppercase">Giá trị</th>
                <th className="text-center px-4 py-3 font-bold text-gray-600 text-xs uppercase">Thanh toán</th>
                <th className="text-center px-4 py-3 font-bold text-gray-600 text-xs uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7}><LoadingState /></td></tr>
              ) : deals.map(d => (
                <tr key={d.order_id} className="hover:bg-violet-50/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-violet-700">#{d.order_code}</td>
                  <td className="px-4 py-3 text-gray-600"><Phone size={12} className="inline mr-1" />{d.account_info?.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs font-semibold">{d.assigned_name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{d.order_date}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">{d.amount}đ</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      d.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {d.payment_status === 'paid' ? '✓ Đã TT' : 'Chưa TT'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      d.status === '2' ? 'bg-emerald-100 text-emerald-700' : d.status === '1' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {d.status === '2' ? 'Hoàn thành' : d.status === '1' ? 'Đang xử lý' : d.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-white disabled:opacity-30"><ChevronLeft size={14} /> Trước</button>
          <span className="text-xs font-semibold text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200">Trang {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={deals.length < 20}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-white disabled:opacity-30">Sau <ChevronRight size={14} /></button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════
// TASKS TAB
// ═══════════════════════════════
function TasksTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/getfly?type=tasks&page=${page}&per_page=20`)
      .then(r => r.json())
      .then(d => setTasks(d.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const overdue = tasks.filter(t => parseInt(t.task_remain_day) < 0).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">Tổng CV</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{tasks.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">Quá hạn</p>
          <p className="text-2xl font-extrabold text-red-600 mt-1">{overdue}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">Hoàn thành</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{tasks.filter(t => t.task_status === '2').length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-50">
          {loading ? <LoadingState /> : tasks.map(task => {
            const remain = parseInt(task.task_remain_day);
            const isOverdue = remain < 0;
            return (
              <div key={task.task_id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{task.task_name}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1.5">
                      <span className="flex items-center gap-1"><User size={11} />{task.receiver_name}</span>
                      <span className="flex items-center gap-1"><Calendar size={11} />{task.task_start_date?.split(' ')[0]} → {task.task_end_date?.split(' ')[0]}</span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                    isOverdue ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {isOverdue ? `Quá ${Math.abs(remain)} ngày` : `Còn ${remain} ngày`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-white disabled:opacity-30"><ChevronLeft size={14} /> Trước</button>
          <span className="text-xs font-semibold text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200">Trang {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={tasks.length < 20}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-white disabled:opacity-30">Sau <ChevronRight size={14} /></button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════
// Shared Components
// ═══════════════════════════════
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/15 text-blue-500',
    violet: 'bg-violet-500/15 text-violet-500',
    emerald: 'bg-emerald-500/15 text-emerald-500',
    amber: 'bg-amber-500/15 text-amber-500',
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorMap[color]} mb-2`}>{icon}</div>
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      <p className="text-xs font-semibold text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="py-12 text-center">
      <RefreshCw size={24} className="mx-auto mb-2 text-gray-300 animate-spin" />
      <p className="text-sm text-gray-400">Đang tải dữ liệu từ GetFly...</p>
    </div>
  );
}

function formatVND(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ';
}

// ═══════════════════════════════
// LOCAL DATA TAB (Dữ liệu đã sync từ GetFly)
// ═══════════════════════════════
interface LocalCustomer {
  id: string;
  getfly_id: string;
  account_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  province_name: string | null;
  account_type: string | null;
  account_source: string | null;
  relation_name: string | null;
  manager_user_name: string | null;
  revenue: string | null;
  ma_hoi_vien: string | null;
  goi_dich_vu: string | null;
  synced_at: string;
}

function LocalDataTab() {
  const [customers, setCustomers] = useState<LocalCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [selected, setSelected] = useState<LocalCustomer | null>(null);
  const perPage = 20;

  async function loadInfo() {
    try {
      const res = await fetch('/api/sync-getfly');
      const d = await res.json();
      setTotal(d.synced_count || 0);
      setLastSync(d.last_sync || null);
    } catch { /* ignore */ }
  }

  async function loadCustomers() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: 'local',
        page: String(page),
        per_page: String(perPage),
      });
      if (search) params.set('search', search);
      // Call via internal supabase API
      const res = await fetch(`/api/getfly-local?${params}`);
      const d = await res.json();
      setCustomers(d.records || []);
      setTotal(d.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadInfo(); loadCustomers(); }, []);
  useEffect(() => { loadCustomers(); }, [page, search]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-4">
      {/* Info bar */}
      <div className="flex items-center justify-between bg-violet-50 border border-violet-100 rounded-2xl px-5 py-3">
        <div className="flex items-center gap-2 text-sm">
          <Database size={16} className="text-violet-500" />
          <span className="font-bold text-violet-800">{total.toLocaleString()} khách hàng đã sync</span>
          {lastSync && (
            <span className="text-violet-500 text-xs">
              · Lần cuối: {new Date(lastSync).toLocaleString('vi-VN')}
            </span>
          )}
        </div>
        <span className="text-xs text-violet-400">Dữ liệu lưu trong Supabase</span>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
            placeholder="Tìm theo tên, số điện thoại..." value={searchInput}
            onChange={e => setSearchInput(e.target.value)} />
        </div>
        <button type="submit" className="px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-all">Tìm</button>
      </form>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {total === 0 && !loading ? (
          <div className="py-16 text-center">
            <Database size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="font-semibold text-gray-500">Chưa có dữ liệu</p>
            <p className="text-sm text-gray-400 mt-1">Nhấn nút <strong>"Sync từ GetFly"</strong> ở trên để tải dữ liệu về</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Khách hàng</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">SĐT</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Kênh</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Stage</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">NV phụ trách</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Synced</th>
                    <th className="text-center px-4 py-3 font-bold text-gray-600 text-xs uppercase"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={6}><LoadingState /></td></tr>
                  ) : customers.map(c => (
                    <tr key={c.id} className="hover:bg-violet-50/30 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white text-xs font-bold flex-shrink-0">
                            {c.account_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">{c.account_name}</p>
                            {c.ma_hoi_vien && <p className="text-[10px] text-yellow-600 font-mono">HV: {c.ma_hoi_vien}</p>}
                            {c.email && <p className="text-[10px] text-gray-400">{c.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        <span className="flex items-center gap-1"><Phone size={12} />{c.phone || '—'}</span>
                        {c.province_name && <span className="text-gray-400 mt-0.5 block"><MapPin size={10} className="inline mr-0.5" />{c.province_name}</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{c.account_source || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-[10px] font-semibold truncate max-w-[120px] block">
                          {c.relation_name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{c.manager_user_name?.split('@')[0] || '—'}</td>
                      <td className="px-4 py-3 text-[10px] text-gray-400">
                        {new Date(c.synced_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelected(c)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-600 text-[11px] font-semibold hover:bg-violet-100 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Eye size={13} /> Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-white disabled:opacity-30 transition-all">
                <ChevronLeft size={14} /> Trước
              </button>
              <span className="text-xs font-semibold text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                Trang {page} / {totalPages || 1}
              </span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages || customers.length < perPage}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-white disabled:opacity-30 transition-all">
                Sau <ChevronRight size={14} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Customer Detail Modal */}
      {selected && (
        <CustomerDetailModal customer={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

// ═══════════════════════════════
// CUSTOMER DETAIL MODAL
// ═══════════════════════════════
function CustomerDetailModal({ customer: c, onClose }: { customer: LocalCustomer; onClose: () => void }) {
  const initials = c.account_name?.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase() || '?';
  const revenue = c.revenue ? parseFloat(c.revenue) : 0;

  const infoRows = [
    { icon: <Phone size={14} />, label: 'Số điện thoại', value: c.phone },
    { icon: <Mail size={14} />, label: 'Email', value: c.email },
    { icon: <MapPin size={14} />, label: 'Địa chỉ', value: c.address },
    { icon: <Globe size={14} />, label: 'Tỉnh / Thành phố', value: c.province_name },
    { icon: <Briefcase size={14} />, label: 'Loại khách hàng', value: c.account_type },
    { icon: <TrendingUp size={14} />, label: 'Nguồn tiếp cận', value: c.account_source },
    { icon: <User size={14} />, label: 'NV phụ trách', value: c.manager_user_name },
    { icon: <Calendar size={14} />, label: 'Ngày tạo GetFly', value: c.getfly_created_at },
  ];

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-end bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Slide-in panel from right */}
      <div className="h-full w-full max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-lg font-extrabold shadow-lg">
              {initials}
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-gray-900">{c.account_name}</h2>
              <p className="text-xs text-gray-500 mt-0.5">GetFly ID: #{c.getfly_id}</p>
              {c.ma_hoi_vien && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-[10px] font-bold text-amber-700">
                  <Crown size={10} /> HV: {c.ma_hoi_vien}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 px-6 py-3 bg-gray-50 border-b border-gray-100 flex-wrap">
          {c.relation_name && (
            <span className="px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold">
              📁 {c.relation_name}
            </span>
          )}
          {c.account_source && (
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
              📡 {c.account_source}
            </span>
          )}
          {revenue > 0 && (
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
              💰 {revenue >= 1e6 ? `${(revenue/1e6).toFixed(0)}M` : revenue.toLocaleString()}đ
            </span>
          )}
        </div>

        {/* Info list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Thông tin liên hệ</p>
          {infoRows.map(({ icon, label, value }) => (
            <div key={label} className="flex items-start gap-3 py-2.5 border-b border-gray-50">
              <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="text-sm text-gray-800 font-medium mt-0.5 break-words">
                  {value || <span className="text-gray-300 italic">Chưa có</span>}
                </p>
              </div>
            </div>
          ))}

          {/* Hội viên section */}
          {(c.ma_hoi_vien || c.goi_dich_vu) && (
            <>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-5 mb-3">Thông tin Hội Viên</p>
              {c.ma_hoi_vien && (
                <div className="flex items-center gap-3 py-2.5 border-b border-gray-50">
                  <Crown size={14} className="text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase">Mã Hội Viên</p>
                    <p className="text-sm font-bold text-amber-700 font-mono mt-0.5">{c.ma_hoi_vien}</p>
                  </div>
                </div>
              )}
              {c.goi_dich_vu && (
                <div className="flex items-center gap-3 py-2.5 border-b border-gray-50">
                  <Briefcase size={14} className="text-violet-500 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase">Gói Dịch Vụ</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{c.goi_dich_vu}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Sync info */}
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-5 mb-3">Hệ thống</p>
          <div className="flex items-center gap-3 py-2.5">
            <Database size={14} className="text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase">Synced lúc</p>
              <p className="text-sm text-gray-700 mt-0.5">{new Date(c.synced_at).toLocaleString('vi-VN')}</p>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
          <a
            href={`https://blackstonesdvtl.getflycrm.com/account/view/${c.getfly_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-all"
          >
            <ExternalLink size={14} /> Xem trên GetFly
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
