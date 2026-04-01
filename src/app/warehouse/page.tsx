'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Warehouse, PackageCheck, Truck, Search,
  ScanLine, RefreshCw, ArrowRight,
  ChevronRight, Package, CheckCircle2, AlertTriangle,
  Clock, User, MapPin, BarChart3, QrCode, TrendingUp,
  Boxes, ArrowUpRight,
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { getWarehouseFilter } from '@/config/roles.config';

/* ─────────────────────────────────────
   Kiểu dữ liệu
───────────────────────────────────── */
interface InventoryStat {
  total: number;
  available: number;
  outOfStock: number;
  totalQuantity: number;
  warehouseName: string;
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

/* ─────────────────────────────────────
   Sub-components
───────────────────────────────────── */
function StatCard({
  label, value, sub, icon, gradient, badge,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  gradient: string;
  badge?: { text: string; color: string };
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-5 shadow-sm hover:shadow-lg transition-all duration-300">
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.06] -translate-y-8 translate-x-8 ${gradient}`} />
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
          <p className="text-3xl font-extrabold text-gray-900 leading-none">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
          {badge && (
            <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.color}`}>
              <TrendingUp size={10} />
              {badge.text}
            </div>
          )}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${gradient} text-white shadow-lg flex-shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  icon, title, desc, href, color, iconBg, badge,
}: {
  icon: React.ReactNode; title: string; desc: string;
  href: string; color: string; iconBg: string; badge?: number;
}) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(href)}
      className="group flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 text-left w-full relative"
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg} flex-shrink-0 group-hover:scale-105 transition-transform`}>
        <span className={color}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 truncate">{title}</p>
        <p className="text-xs text-gray-400 truncate">{desc}</p>
      </div>
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-3 right-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
          {badge}
        </span>
      )}
      <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
    </button>
  );
}

const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-amber-100 text-amber-700 border-amber-200',
  assigned:   'bg-blue-100 text-blue-700 border-blue-200',
  in_transit: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  delivered:  'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled:  'bg-red-100 text-red-700 border-red-200',
};
const STATUS_LABEL: Record<string, string> = {
  pending:    'Chờ xử lý',
  assigned:   'Đã phân công',
  in_transit: 'Đang giao',
  delivered:  'Đã giao',
  cancelled:  'Đã hủy',
};

/* ─────────────────────────────────────
   Main Page
───────────────────────────────────── */
export default function WarehouseDashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState('Thủ kho');
  const [userEmail, setUserEmail] = useState('');
  const [warehouseLabel, setWarehouseLabel] = useState('Kho');
  const [nowStr, setNowStr] = useState('');
  const [history, setHistory] = useState<RecentExport[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [stats, setStats] = useState<InventoryStat>({ total: 0, available: 0, outOfStock: 0, totalQuantity: 0, warehouseName: '' });
  const [statsLoading, setStatsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  /* Live clock */
  useEffect(() => {
    const fmt = () => {
      const now = new Date();
      setNowStr(now.toLocaleString('vi-VN', {
        weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }));
    };
    fmt();
    const id = setInterval(fmt, 30_000);
    return () => clearInterval(id);
  }, []);

  /* User info */
  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        setUserEmail(u.email || '');
        setUserName(u.ho_ten || u.email?.split('@')[0] || 'Thủ kho');

        const filter = getWarehouseFilter(u.email || '', u.ho_ten || '');
        if (filter) {
          setWarehouseLabel(filter);
        } else {
          setWarehouseLabel('Tổng kho');
        }
      }
    } catch { /* ignore */ }
  }, []);

  /* Fetch history */
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      let filter = '';
      try {
        const raw = localStorage.getItem('auth_user');
        if (raw) {
          const u = JSON.parse(raw);
          const wf = getWarehouseFilter(u.email || '', u.ho_ten || '');
          if (wf) filter = `?warehouse=${encodeURIComponent(wf)}`;
        }
      } catch {}

      const res = await fetch(`/api/goods-issue/history${filter}`);
      const json = await res.json();
      if (res.ok) {
        let data: RecentExport[] = json.data || [];
        setHistory(data.slice(0, 8));
      }
    } catch {}
    finally { setHistoryLoading(false); }
  }, []);

  /* Fetch inventory stats */
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const raw = localStorage.getItem('auth_user');
      let filter = '';
      if (raw) {
        const u = JSON.parse(raw);
        const wf = getWarehouseFilter(u.email || '', u.ho_ten || '');
        if (wf) filter = `?warehouse=${encodeURIComponent(wf)}`;
      }
      const res = await fetch(`/api/inventory/stats${filter}`);
      if (res.ok) {
        const json = await res.json();
        // API trả về flat object khi có ?warehouse=, còn không thì {stats:{...}}
        if (json.total !== undefined) {
          // Chế độ warehouse: flat format { total, available, outOfStock, totalQuantity, warehouseName }
          setStats(json);
        } else if (json.stats) {
          // Chế độ admin: { stats: {...} } → map sang InventoryStat
          setStats({
            total: json.stats.totalProducts ?? 0,
            available: json.stats.totalAvailable ?? 0,
            outOfStock: json.stats.totalOutOfStock ?? 0,
            totalQuantity: json.stats.totalQuantity ?? 0,
            warehouseName: warehouseLabel,
          });
        }
      } else {
        setStats({ total: 0, available: 0, outOfStock: 0, totalQuantity: 0, warehouseName: warehouseLabel });
      }

    } catch {
      setStats({ total: 0, available: 0, outOfStock: 0, totalQuantity: 0, warehouseName: warehouseLabel });
    } finally {
      setStatsLoading(false);
      setLastRefresh(new Date());
    }
  }, [warehouseLabel]);

  useEffect(() => {
    fetchHistory();
    fetchStats();
  }, [fetchHistory, fetchStats]);

  const pendingCount = history.filter(h => h.trang_thai === 'pending').length;
  const todayCount = history.filter(h => {
    const d = new Date(h.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const handleRefresh = () => {
    fetchHistory();
    fetchStats();
  };

  return (
    <PageLayout title={`Kho — ${warehouseLabel}`} icon={<Warehouse size={16} className="text-emerald-500" />}>

      {/* ── Welcome Banner ─────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f2417] via-emerald-900 to-[#1a3a28] p-6 mb-6 shadow-xl">
        {/* Decorative */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-16 w-32 h-32 rounded-full bg-teal-400/10 blur-2xl" />
        <div className="absolute top-1/2 right-1/4 w-24 h-24 rounded-full bg-white/5 blur-xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            {/* Kho badge */}
            <div className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-white/70 font-semibold tracking-wide">{warehouseLabel} · Đang hoạt động</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1 tracking-tight">
              Xin chào, {userName} 👋
            </h1>
            <p className="text-emerald-200/70 text-sm">{nowStr}</p>

            {/* Quick stats chips */}
            <div className="flex flex-wrap gap-2 mt-4">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white text-xs font-semibold">
                <Package size={12} className="text-emerald-300" />
                {todayCount} xuất hôm nay
              </div>
              {pendingCount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-semibold">
                  <Clock size={12} />
                  {pendingCount} chờ xử lý
                </div>
              )}
            </div>
          </div>

          {/* Refresh button */}
          <div className="flex flex-col items-end gap-3">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white/80 text-xs font-semibold hover:bg-white/20 transition-colors"
            >
              <RefreshCw size={14} className={statsLoading || historyLoading ? 'animate-spin' : ''} />
              Làm mới
            </button>
            <p className="text-[10px] text-white/30 font-mono">
              Cập nhật: {lastRefresh.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          label="Xuất hôm nay"
          value={todayCount}
          sub="phiếu xuất kho"
          icon={<Truck size={20} />}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
        />
        <StatCard
          label="Chờ xử lý"
          value={pendingCount}
          sub="phiếu cần xử lý"
          icon={<Clock size={20} />}
          gradient="bg-gradient-to-br from-amber-400 to-orange-500"
        />
        <StatCard
          label="Tổng loại hòm"
          value={statsLoading ? '...' : stats.total}
          sub={`${stats.available} loại còn hàng`}
          icon={<Boxes size={20} />}
          gradient="bg-gradient-to-br from-sky-500 to-blue-600"
        />
        <StatCard
          label="Tổng lượng tồn"
          value={statsLoading ? '...' : stats.totalQuantity}
          sub="sản phẩm thực tế"
          icon={<PackageCheck size={20} />}
          gradient="bg-gradient-to-br from-indigo-500 to-violet-600"
        />
        <StatCard
          label="Hết hàng"
          value={statsLoading ? '...' : stats.outOfStock}
          sub="cần bổ sung"
          icon={<AlertTriangle size={20} />}
          gradient="bg-gradient-to-br from-red-500 to-rose-600"
        />
      </div>

      {/* ── Main Grid ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Recent exports (2/3 width) ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full bg-emerald-500" />
              <h2 className="font-extrabold text-gray-900 text-base">Lịch sử xuất hàng gần đây</h2>
            </div>
            <button
              onClick={() => router.push('/goods-issue')}
              className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Xem tất cả <ArrowRight size={13} />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {historyLoading ? (
              <div className="flex items-center justify-center gap-3 py-14 text-gray-300">
                <span className="animate-spin h-6 w-6 border-3 border-emerald-400 border-t-transparent rounded-full" />
                <span className="text-sm font-medium text-gray-400">Đang tải...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                  <Package size={28} className="text-gray-200" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-400">Chưa có phiếu xuất hàng</p>
                  <p className="text-xs text-gray-300 mt-1">Tạo phiếu xuất hàng đầu tiên ngay</p>
                </div>
                <button
                  onClick={() => router.push('/goods-issue')}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-sm font-bold hover:bg-emerald-100 transition-colors"
                >
                  <Truck size={14} /> Xuất hàng ngay
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {history.map((item) => {
                  const firstItem = item.fact_xuat_hang_items?.[0];
                  const createdAt = new Date(item.created_at);
                  const dateStr = createdAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                  const timeStr = createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                  const isToday = createdAt.toDateString() === new Date().toDateString();

                  return (
                    <div
                      key={item.id}
                      onClick={() => router.push('/goods-issue')}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors cursor-pointer group"
                    >
                      <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                        <Package size={18} className="text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">{item.ma_phieu_xuat}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[item.trang_thai] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            {STATUS_LABEL[item.trang_thai] || item.trang_thai}
                          </span>
                          {isToday && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">Hôm nay</span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {firstItem ? `${firstItem.ma_hom} — ${firstItem.ten_hom}` : item.ten_khach || 'N/A'}
                        </p>
                        {item.ghi_chu && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{item.ghi_chu}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs font-bold text-gray-700">{timeStr}</p>
                        <p className="text-[10px] text-gray-400">{dateStr}</p>
                      </div>
                      <ArrowUpRight size={14} className="text-gray-200 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Quick Actions (1/3 width) ── */}
        <div className="space-y-5">

          {/* Quick Actions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 rounded-full bg-sky-500" />
              <h2 className="font-extrabold text-gray-900 text-base">Thao tác nhanh</h2>
            </div>
            <div className="space-y-2.5">
              <QuickAction
                icon={<Truck size={20} />}
                title="Xuất hàng"
                desc="Tạo phiếu xuất kho mới"
                href="/goods-issue"
                color="text-emerald-600"
                iconBg="bg-emerald-100"
                badge={pendingCount}
              />
              <QuickAction
                icon={<Search size={20} />}
                title="Tra cứu sản phẩm"
                desc="Tìm theo mã QR / mã SP"
                href="/"
                color="text-blue-600"
                iconBg="bg-blue-100"
              />
              <QuickAction
                icon={<Warehouse size={20} />}
                title="Tồn kho"
                desc="Xem hàng tồn theo kho"
                href="/inventory"
                color="text-sky-600"
                iconBg="bg-sky-100"
              />
              <QuickAction
                icon={<ScanLine size={20} />}
                title="Quét mã QR"
                desc="Scan nhanh để tìm hoặc xuất"
                href="/"
                color="text-indigo-600"
                iconBg="bg-indigo-100"
              />
              <QuickAction
                icon={<QrCode size={20} />}
                title="Danh sách sản phẩm"
                desc="Toàn bộ hàng hoá & mã QR"
                href="/product/fullproductlist"
                color="text-teal-600"
                iconBg="bg-teal-100"
              />
              <QuickAction
                icon={<PackageCheck size={20} />}
                title="Nhập hàng"
                desc="Kiểm tra & xác nhận hàng vào"
                href="/goods-receipt"
                color="text-orange-600"
                iconBg="bg-orange-100"
              />
            </div>
          </div>

          {/* Inventory summary card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-sky-500" />
              <h3 className="font-extrabold text-gray-900 text-sm">Tình trạng tồn kho</h3>
              <span className="ml-auto text-xs text-gray-300 font-medium">{warehouseLabel}</span>
            </div>
            {statsLoading ? (
              <div className="flex items-center justify-center py-6">
                <span className="animate-spin h-5 w-5 border-2 border-sky-400 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'Còn hàng', count: stats.available, total: stats.total, color: 'bg-emerald-500' },
                  { label: 'Hết hàng', count: stats.outOfStock, total: stats.total, color: 'bg-red-500' },
                  { label: 'Tổng sản phẩm', count: stats.total, total: stats.total, color: 'bg-sky-500' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-gray-500 font-medium">{item.label}</span>
                      <span className="text-xs font-bold text-gray-700">{item.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color} transition-all duration-700`}
                        style={{ width: item.total > 0 ? `${Math.round((item.count / item.total) * 100)}%` : '0%' }}
                      />
                    </div>
                  </div>
                ))}

                <div className="pt-3 border-t border-gray-50 grid grid-cols-3 gap-2">
                  {[
                    { label: 'Tổng', value: stats.total, color: 'text-sky-600' },
                    { label: 'Còn hàng', value: stats.available, color: 'text-emerald-600' },
                    { label: 'Hết hàng', value: stats.outOfStock, color: 'text-red-600' },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-gray-400 font-medium leading-tight">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => router.push('/inventory')}
              className="mt-4 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 text-sky-600 text-xs font-bold hover:bg-sky-100 transition-colors"
            >
              Xem chi tiết kho <ChevronRight size={13} />
            </button>
          </div>

          {/* Info card */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <User size={14} className="text-emerald-600" />
              <h3 className="font-bold text-emerald-800 text-sm">Thông tin người dùng</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {userName?.[0]?.toUpperCase() || 'K'}
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-900">{userName}</p>
                  <p className="text-xs text-emerald-600">{userEmail}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <MapPin size={12} className="text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-700">{warehouseLabel}</span>
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={10} /> Kho vận
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
