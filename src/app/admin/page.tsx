'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Package, Truck, TrendingUp, Users, ShoppingCart,
  PackageCheck, AlertTriangle, CheckCircle, Clock, ArrowRight,
  Warehouse, RefreshCw, Activity, Shield, Database,
  ArrowUpRight, Boxes, BookOpen, MapPin,
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
   Sub-components
───────────────────────────────────────────────────── */
function KpiCard({
  label, value, sub, icon, gradient, delta,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  gradient: string;
  delta?: { text: string; positive: boolean };
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-5 shadow-sm hover:shadow-lg transition-all duration-300 group">
      <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-[0.07] ${gradient}`} />
      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
          <p className="text-3xl font-extrabold text-gray-900 leading-none">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
          {delta && (
            <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              delta.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`}>
              <ArrowUpRight size={10} className={delta.positive ? '' : 'rotate-90'} />
              {delta.text}
            </div>
          )}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${gradient} text-white shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({
  icon, title, desc, href, color, iconBg,
}: {
  icon: React.ReactNode; title: string; desc: string;
  href: string; color: string; iconBg: string;
}) {
  return (
    <Link href={href} className="group flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg} ${color} flex-shrink-0 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 truncate">{title}</p>
        <p className="text-xs text-gray-400 truncate">{desc}</p>
      </div>
      <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
    </Link>
  );
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ xử lý', assigned: 'Đã phân công',
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
   Main Page
───────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [warehouseStats, setWarehouseStats] = useState<WarehouseStat[]>([]);
  const [recentExports, setRecentExports] = useState<RecentExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch inventory stats
      const [invRes, exportRes] = await Promise.all([
        fetch('/api/inventory/stats'),
        fetch('/api/goods-issue/history'),
      ]);

      if (invRes.ok) {
        const invData = await invRes.json();
        setStats(invData.stats || null);
        setWarehouseStats(invData.byWarehouse || []);
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

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const timeStr = lastRefresh.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  return (
    <PageLayout title="Admin Dashboard" icon={<Shield size={15} className="text-red-500" />}>
      {/* ── Header ── */}
      <div className="mb-8 p-8 sm:p-10 rounded-[2rem] bg-gradient-to-br from-[#1B2A4A] via-[#243660] to-[#1e3a8a] text-white shadow-xl shadow-indigo-900/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-violet-500/15 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md shadow-sm">
              <Shield size={13} className="text-red-300" />
              <span className="text-[11px] font-bold text-white tracking-widest uppercase">Quản Trị Hệ Thống</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <Activity size={11} className="text-emerald-300" />
              <span className="text-[11px] text-white/60">Cập nhật {timeStr}</span>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-2 tracking-tight">Admin Dashboard</h1>
          <p className="text-indigo-200 text-sm max-w-lg">
            Tổng quan toàn bộ hệ thống — tồn kho, xuất nhập hàng, hoạt động các bộ phận.
          </p>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-sm font-semibold text-white hover:bg-white/20 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Làm mới dữ liệu
          </button>
        </div>
      </div>

      {loading && !stats ? (
        /* Loading skeleton */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-white border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard
              label="Tổng sản phẩm"
              value={stats?.totalProducts ?? '—'}
              sub="Tất cả loại hàng"
              icon={<Boxes size={22} />}
              gradient="bg-[#1B2A4A]"
            />
            <KpiCard
              label="Còn hàng"
              value={stats?.totalAvailable ?? '—'}
              sub="Khả dụng xuất kho"
              icon={<CheckCircle size={22} />}
              gradient="bg-emerald-500"
              delta={{ text: 'Sẵn sàng', positive: true }}
            />
            <KpiCard
              label="Hết hàng"
              value={stats?.totalOutOfStock ?? '—'}
              sub="Cần nhập thêm"
              icon={<AlertTriangle size={22} />}
              gradient="bg-red-500"
              delta={{ text: 'Cần nhập', positive: false }}
            />
            <KpiCard
              label="Đã xuất"
              value={stats?.totalExported ?? '—'}
              sub="Tổng phiếu xuất"
              icon={<Truck size={22} />}
              gradient="bg-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
            {/* ── Warehouse breakdown ── */}
            <div className="xl:col-span-1">
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden h-full">
                <div className="flex items-center gap-3 p-5 border-b border-gray-50">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50">
                    <Warehouse size={18} className="text-sky-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-gray-900">Tồn kho theo kho</h2>
                    <p className="text-[11px] text-gray-400">Phân bổ hàng hóa</p>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  {warehouseStats.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Đang tải...</div>
                  ) : warehouseStats.map((w, i) => {
                    const pct = w.total > 0 ? Math.round((w.available / w.total) * 100) : 0;
                    const colors = ['bg-sky-500', 'bg-emerald-500', 'bg-violet-500'];
                    const textColors = ['text-sky-600', 'text-emerald-600', 'text-violet-600'];
                    const bgColors = ['bg-sky-50', 'bg-emerald-50', 'bg-violet-50'];
                    return (
                      <div key={w.name} className={`p-4 rounded-xl ${bgColors[i % 3]}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <MapPin size={13} className={textColors[i % 3]} />
                            <span className="text-sm font-bold text-gray-800 truncate max-w-[140px]">{w.name}</span>
                          </div>
                          <span className={`text-xs font-extrabold ${textColors[i % 3]}`}>{w.total} SP</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                            Còn: <strong className="text-gray-700 ml-0.5">{w.available}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                            Hết: <strong className="text-gray-700 ml-0.5">{w.outOfStock}</strong>
                          </span>
                        </div>
                        <div className="w-full bg-white/60 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${colors[i % 3]} transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">{pct}% còn hàng</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Recent Exports ── */}
            <div className="xl:col-span-2">
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden h-full">
                <div className="flex items-center justify-between p-5 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                      <Truck size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-gray-900">Phiếu xuất gần đây</h2>
                      <p className="text-[11px] text-gray-400">{recentExports.length} phiếu mới nhất</p>
                    </div>
                  </div>
                  <Link href="/goods-issue" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-indigo-50 transition-all">
                    Xem tất cả <ArrowRight size={12} />
                  </Link>
                </div>
                <div className="divide-y divide-gray-50">
                  {recentExports.length === 0 ? (
                    <div className="flex flex-col items-center py-12 text-gray-400">
                      <Truck size={32} className="mb-3 opacity-30" />
                      <p className="text-sm font-medium">Chưa có phiếu xuất nào</p>
                    </div>
                  ) : recentExports.map((item) => {
                    const firstItem = item.fact_xuat_hang_items?.[0];
                    const date = new Date(item.created_at);
                    return (
                      <div key={item.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 flex-shrink-0">
                          <Package size={16} className="text-indigo-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">{item.ma_phieu_xuat}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[item.trang_thai] || 'bg-gray-100 text-gray-600'}`}>
                              {STATUS_LABEL[item.trang_thai] || item.trang_thai}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5 truncate">
                            {firstItem ? `${firstItem.ma_hom} — ${firstItem.ten_hom}` : item.ghi_chu || 'N/A'}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{item.created_by}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs font-bold text-gray-700">
                            {date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                          </p>
                          <p className="text-[10px] text-gray-400">
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
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef1f7]">
                <BarChart3 size={18} className="text-[#1B2A4A]" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-gray-900">Truy cập nhanh</h2>
                <p className="text-[11px] text-gray-400">Tất cả chức năng hệ thống</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              <QuickActionCard icon={<ShoppingCart size={18} />} title="Đặt hàng" desc="Tạo & quản lý PO" href="/purchase-orders" color="text-violet-600" iconBg="bg-violet-50" />
              <QuickActionCard icon={<PackageCheck size={18} />} title="Nhập hàng" desc="Phiếu nhập GRPO" href="/goods-receipt" color="text-orange-600" iconBg="bg-orange-50" />
              <QuickActionCard icon={<PackageCheck size={18} />} title="Quản lý nhập hàng" desc="Đối chiếu PO & kho" href="/receipt-management" color="text-indigo-600" iconBg="bg-indigo-50" />
              <QuickActionCard icon={<Truck size={18} />} title="Xuất hàng" desc="IT & GRIT" href="/goods-issue" color="text-emerald-600" iconBg="bg-emerald-50" />
              <QuickActionCard icon={<Warehouse size={18} />} title="Kho hàng" desc="Tổng quan tồn kho" href="/inventory" color="text-sky-600" iconBg="bg-sky-50" />
              <QuickActionCard icon={<BookOpen size={18} />} title="Quản lý đám" desc="Hồ sơ tổ chức tang lễ" href="/funerals" color="text-pink-600" iconBg="bg-pink-50" />
              <QuickActionCard icon={<Users size={18} />} title="Tài khoản" desc="Quản lý người dùng" href="/accounts" color="text-red-600" iconBg="bg-red-50" />
              <QuickActionCard icon={<Database size={18} />} title="Toàn bộ sản phẩm" desc="Danh sách & mã QR" href="/product/fullproductlist" color="text-teal-600" iconBg="bg-teal-50" />
            </div>
          </div>
        </>
      )}
    </PageLayout>
  );
}
