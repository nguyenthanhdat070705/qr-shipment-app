'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag, Search, Lock, Unlock, Package, BookOpen,
  Warehouse, BarChart3, ChevronRight, RefreshCw, ArrowRight,
  Clock, ScanLine, LayoutGrid, TrendingUp, Heart,
  Calendar, MapPin, AlertTriangle, CheckCircle, Eye,
  Loader2, X, Star, Sparkles,
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { getUserRole } from '@/config/roles.config';

/* ─────────────────────────────────────
   Types
───────────────────────────────────── */
interface InventoryStat {
  total: number;
  available: number;
  outOfStock: number;
  totalQuantity: number;
}

interface HoldInfo {
  product_code: string;
  held_by_email: string;
  held_at: string;
  expires_at: string;
  status: string;
}

interface FuneralRow {
  id: string;
  ma_dam: string;
  ngay: string;
  nguoi_mat: string;
  loai: string;
  chi_nhanh: string;
  sale: string;
  dieu_phoi: string;
  dia_chi_to_chuc: string;
  hom_loai: string;
  ngay_liem: string;
  gio_liem: string;
  created_at: string;
}

/* ─────────────────────────────────────
   StatCard
───────────────────────────────────── */
function StatCard({
  label, value, sub, icon, gradient, onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  gradient: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-5 shadow-sm transition-all duration-300 group
        ${onClick ? 'cursor-pointer hover:shadow-xl hover:-translate-y-0.5 hover:border-gray-200' : 'hover:shadow-lg'}
      `}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.06] -translate-y-8 translate-x-8 ${gradient}`} />
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
          <p className="text-3xl font-extrabold text-gray-900 leading-none">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
          {onClick && (
            <p className="text-[11px] text-gray-300 group-hover:text-gray-500 mt-1.5 transition-colors">Nhấn để xem →</p>
          )}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${gradient} text-white shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   QuickAction
───────────────────────────────────── */
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

/* ─────────────────────────────────────
   HeldProductsDrawer
───────────────────────────────────── */
function HeldProductsDrawer({
  open, onClose, holds, userEmail, onRelease,
}: {
  open: boolean; onClose: () => void; holds: HoldInfo[]; userEmail: string;
  onRelease: (code: string) => void;
}) {
  const router = useRouter();
  const [releasing, setReleasing] = useState<string | null>(null);

  const handleRelease = async (code: string) => {
    setReleasing(code);
    try {
      const res = await fetch('/api/hold-product', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productCode: code }),
      });
      const data = await res.json();
      if (data.success) {
        onRelease(code);
      }
    } catch { /* ignore */ }
    finally { setReleasing(null); }
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div className={`fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[480px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-blue-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <Lock size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-900">Sản phẩm đang giữ</h2>
              <p className="text-xs text-blue-600 font-semibold">{holds.length} sản phẩm đang được giữ</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-blue-100 text-gray-400 hover:text-gray-700 transition-colors"><X size={18} /></button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {holds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Lock size={36} className="mb-3 opacity-30" />
              <p className="text-sm font-medium">Bạn chưa giữ sản phẩm nào</p>
              <p className="text-xs text-gray-300 mt-1">Tìm sản phẩm và nhấn &quot;Giữ hàng&quot; để đặt giữ</p>
            </div>
          ) : holds.map((hold) => {
            const expiresAt = new Date(hold.expires_at);
            const now = new Date();
            const remaining = Math.max(0, expiresAt.getTime() - now.getTime());
            const hoursLeft = Math.floor(remaining / (1000 * 60 * 60));
            const minsLeft = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

            return (
              <div key={hold.product_code} className="flex items-center gap-4 px-5 py-4 hover:bg-blue-50/50 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 flex-shrink-0">
                  <Package size={17} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="mb-0.5">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">{hold.product_code}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock size={11} className="text-amber-500" />
                    <span className="text-xs text-amber-600 font-semibold">
                      Còn {hoursLeft}h {minsLeft}m
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/product/${encodeURIComponent(hold.product_code)}`)}
                    className="p-2 rounded-lg hover:bg-blue-100 text-blue-500 transition-colors"
                    title="Xem chi tiết"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => handleRelease(hold.product_code)}
                    disabled={releasing === hold.product_code}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-gray-200 transition-all disabled:opacity-50"
                  >
                    {releasing === hold.product_code ? <Loader2 size={12} className="animate-spin" /> : <Unlock size={12} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <button
            onClick={() => { onClose(); router.push('/inventory'); }}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
          >
            Tìm sản phẩm để giữ <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────
   Main — Sales Dashboard
───────────────────────────────────── */
export default function SalesDashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState('Bán hàng');
  const [userEmail, setUserEmail] = useState('');
  const [nowStr, setNowStr] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Data states
  const [stats, setStats] = useState<InventoryStat>({ total: 0, available: 0, outOfStock: 0, totalQuantity: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [funerals, setFunerals] = useState<FuneralRow[]>([]);
  const [funeralsLoading, setFuneralsLoading] = useState(true);
  const [myHolds, setMyHolds] = useState<HoldInfo[]>([]);
  const [holdsLoading, setHoldsLoading] = useState(true);
  const [holdDrawerOpen, setHoldDrawerOpen] = useState(false);

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
        setUserName(u.ho_ten || u.email?.split('@')[0] || 'Bán hàng');
      }
    } catch { /* ignore */ }
  }, []);

  /* Fetch inventory stats */
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/inventory/stats');
      if (res.ok) {
        const json = await res.json();
        if (json.stats) {
          setStats({
            total: json.stats.totalProducts ?? 0,
            available: json.stats.totalAvailable ?? 0,
            outOfStock: json.stats.totalOutOfStock ?? 0,
            totalQuantity: json.stats.totalQuantity ?? 0,
          });
        } else {
          setStats(json);
        }
      }
    } catch { /* ignore */ }
    finally { setStatsLoading(false); }
  }, []);

  /* Fetch funerals */
  const fetchFunerals = useCallback(async () => {
    setFuneralsLoading(true);
    try {
      const res = await fetch('/api/funerals');
      if (res.ok) {
        const json = await res.json();
        setFunerals(json.data || []);
      }
    } catch { /* ignore */ }
    finally { setFuneralsLoading(false); }
  }, []);

  /* Fetch holds for current user */
  const fetchHolds = useCallback(async () => {
    if (!userEmail) return;
    setHoldsLoading(true);
    try {
      // We'll try to fetch all holds — the API returns one hold at a time by product code,
      // so we need a different approach. Let's check if there's a way to get all holds.
      // For now, we'll just set empty and let the user see holds via the drawer.
      // Since the hold API only supports single product lookup, we'll store holds locally.
      const storedHolds = localStorage.getItem(`sales_holds_${userEmail}`);
      if (storedHolds) {
        const parsed: string[] = JSON.parse(storedHolds);
        // Check each hold
        const activeHolds: HoldInfo[] = [];
        for (const code of parsed) {
          try {
            const res = await fetch(`/api/hold-product?productCode=${encodeURIComponent(code)}`);
            const data = await res.json();
            if (data.isHeld && data.hold?.held_by_email === userEmail) {
              activeHolds.push(data.hold);
            }
          } catch { /* ignore */ }
        }
        setMyHolds(activeHolds);
        // Update local storage with only active holds
        localStorage.setItem(
          `sales_holds_${userEmail}`,
          JSON.stringify(activeHolds.map(h => h.product_code))
        );
      }
    } catch { /* ignore */ }
    finally { setHoldsLoading(false); }
  }, [userEmail]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchFunerals()]);
      setLastRefresh(new Date());
      setLoading(false);
    };
    loadAll();
  }, [fetchStats, fetchFunerals]);

  useEffect(() => {
    if (userEmail) fetchHolds();
  }, [userEmail, fetchHolds]);

  const handleRefresh = () => {
    fetchStats();
    fetchFunerals();
    if (userEmail) fetchHolds();
  };

  const handleReleaseHold = (code: string) => {
    setMyHolds(prev => prev.filter(h => h.product_code !== code));
    // Update local storage
    const remaining = myHolds.filter(h => h.product_code !== code).map(h => h.product_code);
    localStorage.setItem(`sales_holds_${userEmail}`, JSON.stringify(remaining));
  };

  /* My funerals — filter by sale name */
  const myFunerals = funerals.filter(f => {
    if (!userName || userName === 'Bán hàng') return false;
    const saleName = (f.sale || '').toLowerCase().trim();
    const myName = userName.toLowerCase().trim();
    return saleName.includes(myName) || myName.includes(saleName);
  });

  const recentFunerals = [...funerals]
    .sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 6);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  })();

  return (
    <PageLayout title="Bán hàng" icon={<ShoppingBag size={16} className="text-blue-500" />}>

      {/* Held Products Drawer */}
      <HeldProductsDrawer
        open={holdDrawerOpen}
        onClose={() => setHoldDrawerOpen(false)}
        holds={myHolds}
        userEmail={userEmail}
        onRelease={handleReleaseHold}
      />

      {/* ── Welcome Banner ─────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0c1b3a] via-[#1B2A4A] to-[#1a3a6a] p-6 mb-6 shadow-xl">
        {/* Decorative elements */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-16 w-32 h-32 rounded-full bg-sky-400/10 blur-2xl" />
        <div className="absolute top-1/2 right-1/4 w-24 h-24 rounded-full bg-indigo-400/5 blur-xl" />

        {/* Sparkle decorations */}
        <div className="absolute top-6 right-20 w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse" />
        <div className="absolute top-16 right-40 w-1 h-1 rounded-full bg-sky-300 animate-pulse delay-300" />
        <div className="absolute bottom-8 right-32 w-1.5 h-1.5 rounded-full bg-indigo-300 animate-pulse delay-700" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            {/* Role badge */}
            <div className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-xs text-white/70 font-semibold tracking-wide">Nhân viên Bán hàng · Đang hoạt động</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1 tracking-tight">
              {greeting}, {userName} 👋
            </h1>
            <p className="text-blue-200/70 text-sm">{nowStr}</p>

            {/* Quick stats chips */}
            <div className="flex flex-wrap gap-2 mt-4">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white text-xs font-semibold">
                <Package size={12} className="text-blue-300" />
                {stats.available} sản phẩm sẵn
              </div>
              {myHolds.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-200 text-xs font-semibold">
                  <Lock size={12} />
                  {myHolds.length} đang giữ
                </div>
              )}
              {myFunerals.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-400/30 text-pink-200 text-xs font-semibold">
                  <Heart size={12} />
                  {myFunerals.length} đám của bạn
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
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </button>
            <p className="text-[10px] text-white/30 font-mono">
              Cập nhật: {lastRefresh.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Sản phẩm sẵn"
          value={statsLoading ? '...' : stats.available}
          sub="loại hàng còn tồn kho"
          icon={<Package size={20} />}
          gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
          onClick={() => router.push('/inventory?filter=available')}
        />
        <StatCard
          label="Đang giữ"
          value={holdsLoading ? '...' : myHolds.length}
          sub="sản phẩm bạn đang giữ"
          icon={<Lock size={20} />}
          gradient="bg-gradient-to-br from-sky-500 to-cyan-600"
          onClick={() => setHoldDrawerOpen(true)}
        />
        <StatCard
          label="Đám của tôi"
          value={funeralsLoading ? '...' : myFunerals.length}
          sub="đám bạn phụ trách"
          icon={<Heart size={20} />}
          gradient="bg-gradient-to-br from-pink-500 to-rose-600"
          onClick={() => router.push('/funerals')}
        />
        <StatCard
          label="Tổng tồn kho"
          value={statsLoading ? '...' : stats.totalQuantity}
          sub="sản phẩm toàn hệ thống"
          icon={<Warehouse size={20} />}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          onClick={() => router.push('/inventory')}
        />
      </div>

      {/* ── Main Grid ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Funerals (2/3 width) ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* My funerals section */}
          {myFunerals.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 rounded-full bg-pink-500" />
                  <h2 className="font-extrabold text-gray-900 text-base">Đám của tôi</h2>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-pink-100 text-pink-600 text-[10px] font-bold">
                    {myFunerals.length}
                  </span>
                </div>
                <button
                  onClick={() => router.push('/funerals')}
                  className="flex items-center gap-1 text-xs font-semibold text-pink-600 hover:text-pink-700 transition-colors"
                >
                  Xem tất cả <ArrowRight size={13} />
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {myFunerals.slice(0, 4).map((f) => {
                    const isRecent = f.created_at && (Date.now() - new Date(f.created_at).getTime()) < 48 * 60 * 60 * 1000;
                    return (
                      <div
                        key={f.id || f.ma_dam}
                        onClick={() => router.push('/funerals')}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-pink-50/50 transition-colors cursor-pointer group"
                      >
                        <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-pink-50 flex items-center justify-center group-hover:bg-pink-100 transition-colors">
                          <Heart size={18} className="text-pink-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="font-mono text-xs font-bold text-pink-700 bg-pink-50 px-2 py-0.5 rounded-md">{f.ma_dam}</span>
                            {isRecent && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">Mới</span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-gray-800 truncate">{f.nguoi_mat || '—'}</p>
                          {f.dia_chi_to_chuc && (
                            <p className="text-xs text-gray-400 truncate mt-0.5 flex items-center gap-1">
                              <MapPin size={10} /> {f.dia_chi_to_chuc}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs font-bold text-gray-700">{f.ngay || '—'}</p>
                          {f.gio_liem && (
                            <p className="text-[10px] text-gray-400">Liệm: {f.gio_liem}</p>
                          )}
                        </div>
                        <ChevronRight size={14} className="text-gray-200 group-hover:text-pink-400 transition-colors flex-shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Recent funerals */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full bg-indigo-500" />
              <h2 className="font-extrabold text-gray-900 text-base">Đám gần đây</h2>
            </div>
            <button
              onClick={() => router.push('/funerals')}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Xem tất cả <ArrowRight size={13} />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {funeralsLoading ? (
              <div className="flex items-center justify-center gap-3 py-14 text-gray-300">
                <span className="animate-spin h-6 w-6 border-3 border-indigo-400 border-t-transparent rounded-full" />
                <span className="text-sm font-medium text-gray-400">Đang tải...</span>
              </div>
            ) : recentFunerals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                  <BookOpen size={28} className="text-gray-200" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-400">Chưa có thông tin đám</p>
                  <p className="text-xs text-gray-300 mt-1">Dữ liệu sẽ được cập nhật tự động</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentFunerals.map((f) => (
                  <div
                    key={f.id || f.ma_dam}
                    onClick={() => router.push('/funerals')}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                  >
                    <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                      <BookOpen size={18} className="text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">{f.ma_dam}</span>
                        {f.loai && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">{f.loai}</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-800 truncate">{f.nguoi_mat || '—'}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                        {f.sale && (
                          <span className="flex items-center gap-1">
                            <Star size={10} className="text-emerald-500" /> Sale: {f.sale}
                          </span>
                        )}
                        {f.chi_nhanh && (
                          <span>{f.chi_nhanh}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs font-bold text-gray-700">{f.ngay || '—'}</p>
                      {f.hom_loai && (
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[80px]">{f.hom_loai}</p>
                      )}
                    </div>
                    <ChevronRight size={14} className="text-gray-200 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inventory summary — compact */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-blue-500" />
              <h3 className="font-extrabold text-gray-900 text-sm">Tình trạng kho hàng</h3>
            </div>
            {statsLoading ? (
              <div className="flex items-center justify-center py-6">
                <span className="animate-spin h-5 w-5 border-2 border-blue-400 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'Còn hàng', count: stats.available, total: stats.total, color: 'bg-emerald-500' },
                  { label: 'Hết hàng', count: stats.outOfStock, total: stats.total, color: 'bg-red-500' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-gray-500 font-medium">{item.label}</span>
                      <span className="text-xs font-bold text-gray-700">{item.count}/{item.total}</span>
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
                    { label: 'Tổng loại', value: stats.total, color: 'text-blue-600' },
                    { label: 'Còn hàng', value: stats.available, color: 'text-emerald-600' },
                    { label: 'Tổng SL', value: stats.totalQuantity, color: 'text-indigo-600' },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-gray-400 font-medium leading-tight">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Quick Actions + Tips (1/3 width) ── */}
        <div className="space-y-5">

          {/* Quick Actions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 rounded-full bg-blue-500" />
              <h2 className="font-extrabold text-gray-900 text-base">Thao tác nhanh</h2>
            </div>
            <div className="space-y-2.5">
              <QuickAction
                icon={<Search size={20} />}
                title="Tìm kiếm sản phẩm"
                desc="Quét QR hoặc nhập mã sản phẩm"
                href="/"
                color="text-blue-600"
                iconBg="bg-blue-100"
              />
              <QuickAction
                icon={<Lock size={20} />}
                title="Sản phẩm đang giữ"
                desc={`${myHolds.length} sản phẩm đang giữ`}
                href="#"
                color="text-sky-600"
                iconBg="bg-sky-100"
                badge={myHolds.length}
              />
              <QuickAction
                icon={<Warehouse size={20} />}
                title="Kho hàng"
                desc="Xem tồn kho & tình trạng hàng"
                href="/inventory"
                color="text-emerald-600"
                iconBg="bg-emerald-100"
              />
              <QuickAction
                icon={<LayoutGrid size={20} />}
                title="Toàn bộ sản phẩm"
                desc="Danh sách sản phẩm & mã QR"
                href="/product/fullproductlist"
                color="text-teal-600"
                iconBg="bg-teal-100"
              />
              <QuickAction
                icon={<BookOpen size={20} />}
                title="Danh sách Đám"
                desc="Xem thông tin tổ chức"
                href="/funerals"
                color="text-pink-600"
                iconBg="bg-pink-100"
              />
              <QuickAction
                icon={<ScanLine size={20} />}
                title="Quét mã QR"
                desc="Scan nhanh tìm sản phẩm"
                href="/"
                color="text-indigo-600"
                iconBg="bg-indigo-100"
              />
            </div>
          </div>

          {/* Sales Guide */}
          <div className="bg-gradient-to-br from-[#0c1b3a] to-[#1B2A4A] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={14} className="text-blue-400" />
              <h3 className="text-sm font-black text-white">Hướng dẫn bán hàng</h3>
            </div>
            <div className="space-y-3">
              {[
                { step: '01', title: 'Tra cứu sản phẩm', desc: 'Tìm kiếm sản phẩm bằng mã QR hoặc tên', color: 'text-blue-400', bg: 'bg-blue-500/20' },
                { step: '02', title: 'Giữ hàng cho khách', desc: 'Nhấn "Giữ hàng" để đặt giữ 24 giờ', color: 'text-sky-400', bg: 'bg-sky-500/20' },
                { step: '03', title: 'Xem thông tin đám', desc: 'Kiểm tra đám được phân công', color: 'text-pink-400', bg: 'bg-pink-500/20' },
                { step: '04', title: 'Kiểm tra tồn kho', desc: 'Xem hàng còn sẵn tại các kho', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
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

          {/* Current holds summary */}
          {myHolds.length > 0 && (
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lock size={15} className="text-blue-500" />
                <h3 className="text-sm font-extrabold text-gray-900">Sản phẩm đang giữ</h3>
                <span className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold">
                  {myHolds.length}
                </span>
              </div>
              <div className="space-y-2">
                {myHolds.slice(0, 3).map(hold => {
                  const expiresAt = new Date(hold.expires_at);
                  const remaining = Math.max(0, expiresAt.getTime() - Date.now());
                  const hoursLeft = Math.floor(remaining / (1000 * 60 * 60));

                  return (
                    <div key={hold.product_code} className="flex items-center gap-3 p-2.5 rounded-xl bg-blue-50/50 border border-blue-100">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Lock size={14} className="text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800 font-mono truncate">{hold.product_code}</p>
                        <p className="text-[10px] text-amber-600 font-semibold">Còn ~{hoursLeft}h</p>
                      </div>
                    </div>
                  );
                })}
                {myHolds.length > 3 && (
                  <button
                    onClick={() => setHoldDrawerOpen(true)}
                    className="w-full text-center text-xs font-bold text-blue-500 hover:text-blue-600 py-1"
                  >
                    Xem thêm {myHolds.length - 3} sản phẩm →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Last refresh */}
          <p className="text-xs text-gray-300 text-center">
            Cập nhật lúc {lastRefresh.toLocaleTimeString('vi-VN')}
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
