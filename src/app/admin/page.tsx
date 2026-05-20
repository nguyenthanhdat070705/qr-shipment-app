'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Package, Truck, Users, ShoppingCart,
  PackageCheck, AlertTriangle, CheckCircle, ArrowRight,
  Warehouse, RefreshCw, Activity, Shield, Database,
  ArrowUpRight, Boxes, BookOpen, MapPin, X, Search,
  FileText, DollarSign, TrendingUp, ClipboardList,
  UserCheck, Building2,
} from 'lucide-react';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';

/* ─────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────── */
interface SystemStats {
  totalProducts: number;
  totalAvailable: number;
  totalOutOfStock: number;
  totalExported: number;
  totalQuantity: number;
}

interface AdminStats {
  totalPO: number;
  pendingPO: number;
  totalPOValue: number;
  totalGR: number;
  pendingGR: number;
  totalNCC: number;
  totalAccounts: number;
  totalInventoryValue: number;
  totalDam: number;
}

interface OutOfStockProduct {
  code: string;
  name: string;
  warehouse: string;
  qty: number;       // tổng số lượng (đã xuất hết)
}

interface RecentExport {
  id: string;
  ma_phieu_xuat: string;
  trang_thai: string;
  ten_khach: string;
  ghi_chu: string;
  created_at: string;
  created_by: string;
  fact_xuat_hang_items?: { ma_hom: string; ten_hom: string }[];
}

interface WarehouseStat {
  name: string;
  total: number;
  available: number;
  outOfStock: number;
}

/* ─────────────────────────────────────────────────────
   Out-of-Stock Drawer
───────────────────────────────────────────────────── */
function OutOfStockDrawer({
  open, onClose, products,
}: {
  open: boolean;
  onClose: () => void;
  products: OutOfStockProduct[];
}) {
  const [search, setSearch] = useState('');
  const filtered = products.filter(p =>
    !search.trim() ||
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.warehouse.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-[#0f172a]/40 backdrop-blur-md transition-opacity duration-500 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`
        fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[480px]
        bg-white/80 dark:bg-[#0f1629]/95 backdrop-blur-xl shadow-2xl flex flex-col border-l border-white/50 dark:border-white/10
        transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
        ${open ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-white/5 bg-gradient-to-br from-red-50/80 dark:from-red-500/10 to-white/50 dark:to-transparent relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-400/10 dark:bg-red-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-white/5 shadow-sm border border-red-100 dark:border-red-500/20">
              <AlertTriangle size={22} className="text-red-500 dark:text-red-400 drop-shadow-sm" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight">Sản phẩm hết hàng</h2>
              <p className="text-xs text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-md inline-block mt-1">{products.length} loại sản phẩm cần nhập</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="relative z-10 p-2.5 rounded-xl bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-transparent hover:border-gray-200 dark:hover:border-white/10 hover:shadow-sm text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-white/5 bg-white/50 dark:bg-transparent">
          <div className="relative group">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-red-500 transition-colors" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo mã, tên hoặc kho..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-white/5 text-sm dark:text-white focus:outline-none focus:ring-4 focus:ring-red-50 dark:focus:ring-red-500/10 focus:border-red-400 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100/50 dark:divide-white/5 bg-white/30 dark:bg-transparent">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
              <div className="w-16 h-16 mb-4 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/5">
                <AlertTriangle size={28} className="opacity-40" />
              </div>
              <p className="text-sm font-medium">{search ? 'Không tìm thấy sản phẩm phù hợp' : 'Không có sản phẩm hết hàng'}</p>
            </div>
          ) : filtered.map((p, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-white/80 dark:hover:bg-white/5 transition-colors group">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-red-50 dark:from-red-500/10 to-red-100/50 dark:to-transparent border border-red-100/50 dark:border-red-500/20 flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                <Package size={18} className="text-red-500 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 px-2 py-0.5 rounded-md flex-shrink-0">
                    {p.code}
                  </span>
                </div>
                <p className="text-sm font-bold text-gray-800 dark:text-white truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">{p.name}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <MapPin size={11} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">{p.warehouse}</span>
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-700 dark:text-red-400 text-xs font-bold shadow-sm">
                  SL: 0
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200/50 dark:border-white/10 p-6 bg-white/80 dark:bg-[#0f1629]/95 backdrop-blur-md">
          <Link
            href="/inventory?filter=out_of_stock"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white text-sm font-bold hover:from-red-700 hover:to-red-600 transition-all shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-0.5 active:translate-y-0"
          >
            Xem chi tiết Kho hàng <ArrowRight size={16} className="animate-pulse" />
          </Link>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────
   KPI Card
───────────────────────────────────────────────────── */
function KpiCard({
  label, value, sub, icon, gradient, delta, onClick, clickable, href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  gradient: string;
  delta?: { text: string; positive: boolean };
  onClick?: () => void;
  clickable?: boolean;
  href?: string;
}) {
  const content = (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-[1.25rem] sm:rounded-[1.5rem] bg-white dark:bg-[#162240] border border-gray-200/60 dark:border-white/10 p-3 sm:p-5 lg:p-6 transition-all duration-500 group
        ${(clickable || href) ? 'cursor-pointer hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgb(255,255,255,0.03)] hover:border-indigo-200 dark:hover:border-white/20 hover:-translate-y-1' : 'hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:hover:shadow-none'}
      `}
    >
      <div className={`absolute -bottom-16 -right-16 w-48 h-48 rounded-full opacity-[0.04] dark:opacity-10 group-hover:scale-125 transition-transform duration-700 ${gradient}`} />
      <div className="flex items-start justify-between relative z-10 gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 sm:mb-3 truncate">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-none group-hover:text-indigo-900 dark:group-hover:text-indigo-300 transition-colors">{value}</p>
          </div>
          {sub && <p className="text-[10px] sm:text-xs font-medium text-gray-400 dark:text-gray-500 mt-1.5 sm:mt-2 line-clamp-2">{sub}</p>}
          {delta && (
            <div className={`inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold shadow-sm border ${
              delta.positive ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20' : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-100 dark:border-red-500/20'
            }`}>
              <ArrowUpRight size={12} className={delta.positive ? '' : 'rotate-90'} />
              {delta.text}
            </div>
          )}
          {(clickable || href) && (
            <div className="inline-flex items-center gap-1.5 mt-3 ml-2 text-[10px] sm:text-[11px] text-indigo-500 dark:text-indigo-400 font-bold opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
              Xem chi tiết <ArrowRight size={10} />
            </div>
          )}
        </div>
        <div className={`flex h-9 w-9 sm:h-12 sm:w-12 lg:h-14 lg:w-14 items-center justify-center rounded-xl sm:rounded-2xl ${gradient} text-white shadow-lg shadow-indigo-500/20 dark:shadow-none flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
          {icon}
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

/* ─────────────────────────────────────────────────────
   Mini Stat Card (for secondary metrics)
───────────────────────────────────────────────────── */
function MiniStatCard({
  icon, label, value, sub, color, bgColor, href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  bgColor: string;
  href?: string;
}) {
  const content = (
    <div className={`flex flex-col p-4 rounded-[1.25rem] bg-white dark:bg-[#162240] border border-gray-200/60 dark:border-white/10 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:hover:shadow-[0_8px_30px_rgb(255,255,255,0.02)] hover:-translate-y-1 transition-all duration-300 group ${href ? 'cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bgColor} ${color} dark:bg-white/5 dark:text-white flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        {href && <ArrowUpRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" />}
      </div>
      <div className="flex-1">
        <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-1 group-hover:text-indigo-900 dark:group-hover:text-indigo-300 transition-colors">{value}</p>
        <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
        {sub && <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500">{sub}</p>}
      </div>
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

function QuickActionCard({
  icon, title, desc, href, color, iconBg,
}: {
  icon: React.ReactNode; title: string; desc: string;
  href: string; color: string; iconBg: string;
}) {
  return (
    <Link href={href} className="group relative overflow-hidden flex items-center gap-4 p-4 rounded-[1.25rem] bg-white dark:bg-[#162240] border border-gray-200/60 dark:border-white/10 hover:border-indigo-200 dark:hover:border-white/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:hover:shadow-none hover:-translate-y-0.5 transition-all duration-300">
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.03] dark:opacity-10 group-hover:scale-150 transition-transform duration-700 ${iconBg.replace('bg-', 'bg-gradient-to-br from-white to-')}`} />
      <div className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-xl ${iconBg} ${color} dark:bg-white/5 dark:text-white flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
        {icon}
      </div>
      <div className="relative z-10 flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-indigo-900 dark:group-hover:text-indigo-300 transition-colors">{title}</p>
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 truncate">{desc}</p>
      </div>
      <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 dark:bg-white/10 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
        <ArrowRight size={14} className="text-gray-600 dark:text-white" />
      </div>
    </Link>
  );
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Đã hoàn thành', assigned: 'Đã phân công',
  in_transit: 'Đang giao', delivered: 'Đã giao', cancelled: 'Đã hủy',
};
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  assigned: 'bg-blue-100 text-blue-700',
  in_transit: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

/* ─────────────────────────────────────────────────────
   Utility: format VND
───────────────────────────────────────────────────── */
function formatVND(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString('vi-VN');
}

/* ─────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [warehouseStats, setWarehouseStats] = useState<WarehouseStat[]>([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState<OutOfStockProduct[]>([]);
  const [recentExports, setRecentExports] = useState<RecentExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, exportRes] = await Promise.all([
        fetch('/api/inventory/stats'),
        fetch('/api/goods-issue/history'),
      ]);

      if (invRes.ok) {
        const invData = await invRes.json();
        setStats(invData.stats || null);
        setAdminStats(invData.adminStats || null);
        setWarehouseStats(invData.byWarehouse || []);
        setOutOfStockProducts(invData.outOfStockProducts || []);
      }

      if (exportRes.ok) {
        const exportData = await exportRes.json();
        setRecentExports((exportData.data || []).slice(0, 8));
      }
    } catch (e) {
      console.error('Admin dashboard fetch error:', e);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const timeStr = lastRefresh.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  // --- BẢO TRÌ HỆ THỐNG ---
  const isMaintenanceMode = false;
  if (isMaintenanceMode) {
    return (
      <PageLayout title="Admin Dashboard" icon={<Shield size={15} className="text-red-500" />}>
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6 border-4 border-red-50">
            <Shield size={48} className="text-red-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Khu vực đang bảo trì</h1>
          <p className="text-gray-500 max-w-md mx-auto text-lg leading-relaxed">
            Tính năng Admin Dashboard hiện đang tạm khóa để thực hiện nâng cấp hệ thống. Vui lòng quay lại sau!
          </p>
          <button 
            onClick={() => window.history.back()} 
            className="mt-8 px-8 py-3 bg-gray-900 text-white rounded-xl font-bold shadow-lg shadow-gray-200 hover:bg-gray-800 transition-all hover:-translate-y-1"
          >
            Quay lại trang trước
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Admin Dashboard" icon={<Shield size={15} className="text-red-500" />}>
      {/* Out-of-stock drawer */}
      <OutOfStockDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        products={outOfStockProducts}
      />

      {/* ── Header ── */}
      <div className="mb-6 sm:mb-10 p-5 sm:p-8 lg:p-12 rounded-[1.5rem] sm:rounded-[2.5rem] bg-[#0f172a] text-white shadow-2xl shadow-indigo-900/20 relative overflow-hidden group">
        {/* Abstract shapes & glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#020617] opacity-80" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/30 rounded-full blur-[100px] group-hover:bg-indigo-500/40 transition-colors duration-1000" />
        <div className="absolute bottom-[-20%] left-[-10%] w-80 h-80 bg-red-500/20 rounded-full blur-[80px] group-hover:bg-red-500/30 transition-colors duration-1000" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-violet-500/20 rounded-full blur-[100px]" />
        
        {/* Noise overlay */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPjwvc3ZnPg==')] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
          <div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap mb-3 sm:mb-5">
              <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl shadow-lg">
                <Shield size={12} className="text-indigo-300 sm:w-3.5 sm:h-3.5" />
                <span className="text-[10px] sm:text-[11px] font-bold text-white tracking-widest uppercase">Quản Trị Hệ Thống</span>
              </div>
              <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl">
                <Activity size={12} className="text-emerald-400 animate-pulse" />
                <span className="text-[10px] sm:text-[11px] font-medium text-white/70">Cập nhật lúc {timeStr}</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black mb-2 sm:mb-3 tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
              Admin Dashboard
            </h1>
            <p className="text-indigo-200/80 text-xs sm:text-sm max-w-lg font-medium leading-relaxed">
              Trung tâm kiểm soát toàn bộ hệ thống: thống kê tồn kho, xuất nhập hàng, và hoạt động của các bộ phận trong thời gian thực.
            </p>
          </div>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs sm:text-sm font-bold text-white transition-all duration-300 disabled:opacity-50 hover:shadow-[0_0_20px_rgb(255,255,255,0.1)] active:scale-95 w-full sm:w-auto"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Đang đồng bộ...' : 'Làm mới dữ liệu'}
          </button>
        </div>
      </div>

      {loading && !stats ? (
        <div className="space-y-8 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 rounded-[1.5rem] bg-gray-100/80 dark:bg-white/5 border border-gray-200/50 dark:border-white/5" />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 rounded-[1.25rem] bg-gray-100/80 dark:bg-white/5 border border-gray-200/50 dark:border-white/5" />
            ))}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="h-96 rounded-[1.5rem] bg-gray-100/80 dark:bg-white/5 border border-gray-200/50 dark:border-white/5" />
            <div className="xl:col-span-2 h-96 rounded-[1.5rem] bg-gray-100/80 dark:bg-white/5 border border-gray-200/50 dark:border-white/5" />
          </div>
        </div>
      ) : (
        <>
          {/* ── Primary KPI Cards — Inventory ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8">
            <KpiCard
              label="Tổng loại hàng"
              value={stats?.totalProducts ?? '—'}
              sub={`${stats?.totalProducts ?? 0} loại sản phẩm trong hệ thống`}
              icon={<Boxes size={22} />}
              gradient="bg-[#1B2A4A]"
              href="/products-manage"
            />
            <KpiCard
              label="Tồn kho"
              value={stats?.totalQuantity ?? '—'}
              sub={`${stats?.totalAvailable ?? 0} loại SP còn hàng`}
              icon={<CheckCircle size={22} />}
              gradient="bg-emerald-500"
              delta={{ text: 'Tổng hòm tồn kho', positive: true }}
              href="/inventory"
            />
            {/* ── Clickable out-of-stock card ── */}
            <KpiCard
              label="Hết hàng"
              value={stats?.totalOutOfStock ?? '—'}
              sub={`Loại SP có số lượng = 0`}
              icon={<AlertTriangle size={22} />}
              gradient="bg-red-500"
              delta={{ text: 'Cần nhập thêm', positive: false }}
              clickable
              onClick={() => setDrawerOpen(true)}
            />
            <KpiCard
              label="Đã xuất"
              value={stats?.totalExported ?? '—'}
              sub="Tổng phiếu xuất"
              icon={<Truck size={22} />}
              gradient="bg-indigo-500"
              href="/goods-issue"
            />
          </div>

          {/* ── Secondary Admin Stats ── */}
          {adminStats && (
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center gap-3 mb-3 sm:mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-500/20">
                  <TrendingUp size={16} className="text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">Thống kê hệ thống</h2>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">Số liệu tổng quan dành cho quản trị</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                <MiniStatCard
                  icon={<ShoppingCart size={18} />}
                  label="Đơn đặt hàng"
                  value={adminStats.totalPO}
                  sub={adminStats.pendingPO > 0 ? `${adminStats.pendingPO} đang xử lý` : 'Đã hoàn tất'}
                  color="text-violet-600"
                  bgColor="bg-violet-50"
                  href="/purchase-orders"
                />
                <MiniStatCard
                  icon={<ClipboardList size={18} />}
                  label="Phiếu nhập kho"
                  value={adminStats.totalGR}
                  sub={adminStats.pendingGR > 0 ? `${adminStats.pendingGR} đang chờ` : 'Đã hoàn tất'}
                  color="text-orange-600"
                  bgColor="bg-orange-50"
                  href="/goods-receipt"
                />
                <MiniStatCard
                  icon={<Building2 size={18} />}
                  label="Nhà cung cấp"
                  value={adminStats.totalNCC}
                  sub="Đối tác cung ứng"
                  color="text-sky-600"
                  bgColor="bg-sky-50"
                  href="/suppliers-manage"
                />
                <MiniStatCard
                  icon={<UserCheck size={18} />}
                  label="Tài khoản"
                  value={adminStats.totalAccounts}
                  sub="Người dùng hệ thống"
                  color="text-pink-600"
                  bgColor="bg-pink-50"
                  href="/accounts"
                />
                <MiniStatCard
                  icon={<DollarSign size={18} />}
                  label="Giá trị tồn kho"
                  value={`${formatVND(adminStats.totalInventoryValue)}₫`}
                  sub="Theo giá vốn"
                  color="text-emerald-600"
                  bgColor="bg-emerald-50"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-10">
            {/* ── Warehouse breakdown ── */}
            <div className="xl:col-span-1">
              <div className="rounded-[1.25rem] sm:rounded-[1.5rem] bg-white dark:bg-[#162240] border border-gray-200/60 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none overflow-hidden h-full flex flex-col">
                <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 lg:p-6 border-b border-gray-100 dark:border-white/5">
                  <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-sky-50 dark:bg-sky-500/20 border border-sky-100 dark:border-sky-500/30 shadow-sm">
                    <Warehouse size={20} className="text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-gray-900 dark:text-white tracking-tight">Tồn kho theo kho</h2>
                    <p className="text-[11px] sm:text-xs font-medium text-gray-400 dark:text-gray-500">Phân bổ hàng hóa</p>
                  </div>
                </div>
                <div className="p-4 sm:p-5 lg:p-6 space-y-3 sm:space-y-5 flex-1 bg-gray-50/30 dark:bg-transparent">
                  {warehouseStats.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm font-medium">Đang tải...</div>
                  ) : warehouseStats.map((w, i) => {
                    const pct = w.total > 0 ? Math.round((w.available / w.total) * 100) : 0;
                    const colors = ['bg-sky-500', 'bg-emerald-500', 'bg-violet-500'];
                    const textColors = ['text-sky-600 dark:text-sky-400', 'text-emerald-600 dark:text-emerald-400', 'text-violet-600 dark:text-violet-400'];
                    const bgColors = ['bg-sky-50 dark:bg-sky-500/10', 'bg-emerald-50 dark:bg-emerald-500/10', 'bg-violet-50 dark:bg-violet-500/10'];
                    return (
                      <div key={w.name} className={`p-4 rounded-2xl ${bgColors[i % 3]} border border-white dark:border-white/5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className={textColors[i % 3]} />
                            <span className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate max-w-[140px] group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{w.name}</span>
                          </div>
                          <span className={`text-sm font-black ${textColors[i % 3]}`}>{w.total} <span className="text-[10px] font-bold">SP</span></span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 mb-3 font-medium">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                            Còn: <strong className="text-gray-900 dark:text-white">{w.available}</strong>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
                            Hết: <strong className="text-gray-900 dark:text-white">{w.outOfStock}</strong>
                          </span>
                        </div>
                        <div className="w-full bg-white/60 dark:bg-white/10 rounded-full h-2 overflow-hidden shadow-inner dark:shadow-none">
                          <div className={`h-full rounded-full ${colors[i % 3]} transition-all duration-1000 ease-out relative`} style={{ width: `${pct}%` }}>
                            <div className="absolute top-0 right-0 bottom-0 w-4 bg-white/30 rounded-full" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Recent Exports ── */}
            <div className="xl:col-span-2">
              <div className="rounded-[1.25rem] sm:rounded-[1.5rem] bg-white dark:bg-[#162240] border border-gray-200/60 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none overflow-hidden h-full flex flex-col">
                <div className="flex items-center justify-between p-4 sm:p-5 lg:p-6 border-b border-gray-100 dark:border-white/5 gap-2">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-100 dark:border-emerald-500/30 shadow-sm flex-shrink-0">
                      <Truck size={20} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm sm:text-base font-black text-gray-900 dark:text-white tracking-tight truncate">Phiếu xuất gần đây</h2>
                      <p className="text-[11px] sm:text-xs font-medium text-gray-400 dark:text-gray-500">{recentExports.length} phiếu mới nhất</p>
                    </div>
                  </div>
                  <Link href="/goods-issue" className="text-[11px] sm:text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1.5 px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all active:scale-95 flex-shrink-0 whitespace-nowrap">
                    <span className="hidden sm:inline">Xem tất cả</span><span className="sm:hidden">Xem</span> <ArrowRight size={14} />
                  </Link>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-white/5 flex-1 overflow-y-auto">
                  {recentExports.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                      <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/5 mb-4">
                        <Truck size={28} className="opacity-30" />
                      </div>
                      <p className="text-sm font-bold">Chưa có phiếu xuất nào</p>
                    </div>
                  ) : recentExports.map((item) => {
                    const firstItem = item.fact_xuat_hang_items?.[0];
                    const date = new Date(item.created_at);
                    return (
                      <div key={item.id} className="flex items-center gap-4 sm:gap-5 px-5 sm:px-6 py-4 hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-all duration-300 group cursor-default">
                        <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-100/50 dark:border-indigo-500/30 flex-shrink-0 group-hover:scale-110 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/30 transition-all duration-300">
                          <Package size={18} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-mono text-[10px] sm:text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-100/50 dark:border-indigo-500/30 px-2 py-0.5 rounded-md shadow-sm">
                              {item.ma_phieu_xuat}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm border ${
                              STATUS_COLOR[item.trang_thai] ? STATUS_COLOR[item.trang_thai] + ' border-' + STATUS_COLOR[item.trang_thai].split('-')[1] + '-200 dark:border-' + STATUS_COLOR[item.trang_thai].split('-')[1] + '-500/30 dark:bg-' + STATUS_COLOR[item.trang_thai].split('-')[1] + '-500/10 dark:text-' + STATUS_COLOR[item.trang_thai].split('-')[1] + '-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                            }`}>
                              {STATUS_LABEL[item.trang_thai] || item.trang_thai}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate group-hover:text-indigo-900 dark:group-hover:text-indigo-300 transition-colors">
                            {firstItem ? `${firstItem.ma_hom} — ${firstItem.ten_hom}` : item.ghi_chu || 'Không có ghi chú'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] sm:text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100/50 dark:bg-white/5 px-1.5 py-0.5 rounded">{item.created_by}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right group-hover:-translate-x-1 transition-transform">
                          <p className="text-xs sm:text-sm font-black text-gray-800 dark:text-gray-200">
                            {date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                          </p>
                          <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 dark:text-gray-500 mt-0.5">
                            {date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── Quick Actions ── */}
          <div className="rounded-[1.25rem] sm:rounded-[1.5rem] bg-white dark:bg-[#162240] border border-gray-200/60 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none p-4 sm:p-6 lg:p-8">
            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-100 dark:border-indigo-500/30 shadow-sm">
                <BarChart3 size={20} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight">Truy cập nhanh</h2>
                <p className="text-[11px] sm:text-xs font-medium text-gray-400 dark:text-gray-500">Điều hướng đến các module chính của hệ thống</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              <QuickActionCard icon={<ShoppingCart size={20} />} title="Đặt hàng" desc="Tạo & quản lý PO" href="/purchase-orders" color="text-violet-600" iconBg="bg-violet-50" />
              <QuickActionCard icon={<PackageCheck size={20} />} title="Nhập hàng" desc="Phiếu nhập GRPO" href="/goods-receipt" color="text-orange-600" iconBg="bg-orange-50" />
              <QuickActionCard icon={<PackageCheck size={20} />} title="Quản lý nhập hàng" desc="Đối chiếu PO & kho" href="/receipt-management" color="text-indigo-600" iconBg="bg-indigo-50" />
              <QuickActionCard icon={<Truck size={20} />} title="Xuất hàng" desc="IT & GRIT" href="/goods-issue" color="text-emerald-600" iconBg="bg-emerald-50" />
              <QuickActionCard icon={<Warehouse size={20} />} title="Kho hàng" desc="Tổng quan tồn kho" href="/inventory" color="text-sky-600" iconBg="bg-sky-50" />
              <QuickActionCard icon={<BookOpen size={20} />} title="Quản lý đám" desc="Hồ sơ tổ chức tang lễ" href="/funerals" color="text-pink-600" iconBg="bg-pink-50" />
              <QuickActionCard icon={<Users size={20} />} title="Tài khoản" desc="Quản lý người dùng" href="/accounts" color="text-red-600" iconBg="bg-red-50" />
              <QuickActionCard icon={<Database size={20} />} title="Toàn bộ sản phẩm" desc="Danh sách & mã QR" href="/product/fullproductlist" color="text-teal-600" iconBg="bg-teal-50" />
            </div>
          </div>
        </>
      )}
    </PageLayout>
  );
}
