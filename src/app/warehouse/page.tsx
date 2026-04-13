'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Warehouse, PackageCheck, Truck, Search,
  ScanLine, RefreshCw, ArrowRight,
  ChevronRight, Package, CheckCircle2, AlertTriangle,
  Clock, User, MapPin, BarChart3, QrCode, TrendingUp,
  Boxes, ArrowUpRight, X,
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

interface OutOfStockProduct {
  code: string;
  name: string;
  warehouse: string;
  qty: number;
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

interface PurchaseOrder {
  id: string;
  po_code: string;
  status: string;
  note: string | null;
  created_by: string | null;
  expected_date: string | null;
  created_at: string;
  total_amount: number;
  supplier: { code: string; name: string } | null;
  warehouse: { code: string; name: string } | null;
}

/* ─────────────────────────────────────
   Sub-components
───────────────────────────────────── */
function StatCard({
  label, value, sub, icon, gradient, badge, onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  gradient: string;
  badge?: { text: string; color: string };
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
          {badge && (
            <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.color}`}>
              <TrendingUp size={10} />
              {badge.text}
            </div>
          )}
          {onClick && (
            <p className="text-[11px] text-gray-300 group-hover:text-gray-500 mt-1.5 transition-colors">Nhấn để xem chi tiết →</p>
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
   Drawer: Đơn nhập hàng cần xử lý (Purchase Orders)
───────────────────────────────────── */
function PendingOrdersDrawer({
  open, onClose, orders,
}: {
  open: boolean; onClose: () => void; orders: PurchaseOrder[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const filtered = orders.filter(o =>
    !search.trim() ||
    o.po_code.toLowerCase().includes(search.toLowerCase()) ||
    (o.supplier?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.note || '').toLowerCase().includes(search.toLowerCase())
  );

  const STATUS_LABEL: Record<string, string> = {
    confirmed: 'Chưa nhập',
    partial: 'Nhập một phần',
    received: 'Đã nhập đủ',
    cancelled: 'Đã hủy',
  };
  const STATUS_COLOR: Record<string, string> = {
    confirmed: 'bg-amber-50 text-amber-700 border-amber-200',
    partial: 'bg-blue-50 text-blue-700 border-blue-200',
    received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div className={`fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[520px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-amber-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <Clock size={20} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-900">Đơn nhập hàng cần xử lý</h2>
              <p className="text-xs text-amber-600 font-semibold">{orders.length} đơn chưa nhập đủ</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-amber-100 text-gray-400 hover:text-gray-700 transition-colors"><X size={18} /></button>
        </div>
        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo mã PO, nhà cung cấp..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all" />
          </div>
        </div>
        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Clock size={36} className="mb-3 opacity-30" />
              <p className="text-sm">{search ? 'Không tìm thấy đơn phù hợp' : 'Không có đơn nhập cần xử lý'}</p>
            </div>
          ) : filtered.map((po) => {
            const date = new Date(po.created_at);
            return (
              <div
                key={po.id}
                onClick={() => { onClose(); router.push('/purchase-orders/' + po.id); }}
                className="flex items-start gap-4 px-5 py-4 hover:bg-amber-50/60 cursor-pointer transition-colors group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 flex-shrink-0 mt-0.5">
                  <Package size={17} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">{po.po_code}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[po.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {STATUS_LABEL[po.status] || po.status}
                    </span>
                  </div>
                  {po.supplier && (
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {po.supplier.name}
                      <span className="font-mono text-xs text-gray-400 ml-1">({po.supplier.code})</span>
                    </p>
                  )}
                  {po.expected_date && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Dự kiến nhập: {new Date(po.expected_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                  )}
                  {po.total_amount > 0 && (
                    <p className="text-xs font-semibold text-emerald-600 mt-0.5">{po.total_amount.toLocaleString('vi-VN')}₫</p>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs font-bold text-gray-700">{date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</p>
                  <ArrowRight size={13} className="text-gray-200 group-hover:text-amber-500 transition-colors mt-2 ml-auto" />
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <button
            onClick={() => { onClose(); router.push('/purchase-orders'); }}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors shadow-sm"
          >
            Xem tất cả đơn đặt hàng <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────
   Drawer: Hết hàng
───────────────────────────────────── */
function OutOfStockDrawer({
  open, onClose, products, warehouseLabel,
}: {
  open: boolean; onClose: () => void; products: OutOfStockProduct[]; warehouseLabel: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const filtered = products.filter(p =>
    !search.trim() ||
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div className={`fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[480px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-red-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-900">Loại hòm hết hàng</h2>
              <p className="text-xs text-red-600 font-semibold">{products.length} loại cần nhập thêm · {warehouseLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-red-100 text-gray-400 hover:text-gray-700 transition-colors"><X size={18} /></button>
        </div>
        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo mã hòm hoặc tên..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all" />
          </div>
        </div>
        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <AlertTriangle size={36} className="mb-3 opacity-30" />
              <p className="text-sm">{search ? 'Không tìm thấy' : 'Không có loại hòm nào hết hàng'}</p>
            </div>
          ) : filtered.map((p, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-red-50/50 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 flex-shrink-0">
                <Package size={17} className="text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="mb-0.5">
                  <span className="font-mono text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md">{p.code}</span>
                </div>
                <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
              </div>
              <span className="flex-shrink-0 px-2 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-bold">Hết hàng</span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <button
            onClick={() => { onClose(); router.push('/inventory?filter=out_of_stock'); }}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors shadow-sm"
          >
            Xem trong Kho hàng <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </>
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
  pending:    'bg-teal-100 text-teal-700 border-teal-200',
  assigned:   'bg-blue-100 text-blue-700 border-blue-200',
  in_transit: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  delivered:  'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled:  'bg-red-100 text-red-700 border-red-200',
};
const STATUS_LABEL: Record<string, string> = {
  pending:    'Đã hoàn thành',
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
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [stats, setStats] = useState<InventoryStat>({ total: 0, available: 0, outOfStock: 0, totalQuantity: 0, warehouseName: '' });
  const [outOfStockProducts, setOutOfStockProducts] = useState<OutOfStockProduct[]>([]);
  const [pendingPOs, setPendingPOs] = useState<PurchaseOrder[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [pendingDrawerOpen, setPendingDrawerOpen] = useState(false);
  const [outOfStockDrawerOpen, setOutOfStockDrawerOpen] = useState(false);

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

      const res = await fetch(`/api/inventory/history-all${filter}`);
      const json = await res.json();
      if (res.ok) {
        let data = json.data || [];
        setHistory(data.slice(0, 50)); // Show up to 50 combined
      }
    } catch {}
    finally { setHistoryLoading(false); }
  }, []);

  /* Fetch pending Purchase Orders */
  const fetchPendingPOs = useCallback(async () => {
    try {
      const res = await fetch('/api/purchase-orders');
      if (res.ok) {
        const json = await res.json();
        const all: PurchaseOrder[] = json.data || [];
        // Chỉ lấy đơn chưa nhập đủ (confirmed = chưa nhập, partial = nhập một phần)
        setPendingPOs(all.filter(po => po.status === 'confirmed' || po.status === 'partial'));
      }
    } catch {}
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
          // Chế độ warehouse: flat format
          setStats(json);
          setOutOfStockProducts(json.outOfStockProducts || []);
        } else if (json.stats) {
          // Chế độ admin
          setStats({
            total: json.stats.totalProducts ?? 0,
            available: json.stats.totalAvailable ?? 0,
            outOfStock: json.stats.totalOutOfStock ?? 0,
            totalQuantity: json.stats.totalQuantity ?? 0,
            warehouseName: warehouseLabel,
          });
          setOutOfStockProducts(json.outOfStockProducts || []);
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
    fetchPendingPOs();
  }, [fetchHistory, fetchStats, fetchPendingPOs]);

  const pendingCount = pendingPOs.length;
  const todayCount = history.filter(h => {
    const d = new Date(h.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString() && h.type === 'export';
  }).length;

  const handleRefresh = () => {
    fetchHistory();
    fetchStats();
    fetchPendingPOs();
  };

  return (
    <PageLayout title={`Kho — ${warehouseLabel}`} icon={<Warehouse size={16} className="text-emerald-500" />}>

      {/* ── Drawers ──────────────────────────────── */}
      <PendingOrdersDrawer
        open={pendingDrawerOpen}
        onClose={() => setPendingDrawerOpen(false)}
        orders={pendingPOs}
      />
      <OutOfStockDrawer
        open={outOfStockDrawerOpen}
        onClose={() => setOutOfStockDrawerOpen(false)}
        products={outOfStockProducts}
        warehouseLabel={warehouseLabel}
      />

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
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-xs font-semibold">
                  <CheckCircle2 size={12} />
                  {pendingCount} đã hoàn thành
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
          onClick={() => router.push('/goods-issue')}
        />
        <StatCard
          label="Chờ xử lý"
          value={pendingCount}
          sub="phiếu cần xử lý"
          icon={<Clock size={20} />}
          gradient="bg-gradient-to-br from-amber-400 to-orange-500"
          onClick={() => setPendingDrawerOpen(true)}
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
          onClick={() => setOutOfStockDrawerOpen(true)}
        />
      </div>

      {/* ── Main Grid ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Combined History Table (2/3 width) ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full bg-emerald-500" />
              <h2 className="font-extrabold text-gray-900 text-base">Lịch sử xuất / nhập kho gần đây</h2>
            </div>
            <button
              onClick={() => handleRefresh()}
              className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Làm mới <RefreshCw size={12} className={historyLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
            {historyLoading ? (
              <div className="flex items-center justify-center gap-3 py-14 text-gray-300">
                <span className="animate-spin h-6 w-6 border-3 border-emerald-400 border-t-transparent rounded-full" />
                <span className="text-sm font-medium text-gray-400">Đang tải dữ liệu...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                  <Package size={28} className="text-gray-200" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-400">Chưa có dữ liệu lịch sử</p>
                </div>
              </div>
            ) : (
              <div className="min-w-[900px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-extrabold text-gray-500 uppercase tracking-widest">
                      <th className="p-3 text-center w-12">STT</th>
                      <th className="p-3">Ngày nhập/xuất</th>
                      <th className="p-3">Loại</th>
                      <th className="p-3">Số phiếu</th>
                      <th className="p-3">Mã sản phẩm</th>
                      <th className="p-3">Tên sản phẩm</th>
                      <th className="p-3 text-center">ĐVT</th>
                      <th className="p-3 text-right">Số lượng</th>
                      <th className="p-3">Mã đám</th>
                      <th className="p-3 text-right">Đơn giá</th>
                      <th className="p-3">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm">
                    {history.map((item: any, i) => {
                      const createdAt = new Date(item.created_at);
                      const dateStr = createdAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                      const timeStr = createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                      const isImport = item.type === 'import';

                      return (
                        <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="p-3 text-center text-xs font-bold text-gray-400">{i + 1}</td>
                          <td className="p-3 text-xs">
                            <span className="font-semibold text-gray-700">{dateStr}</span>
                            <span className="text-gray-400 ml-1 block text-[10px] sm:inline">{timeStr}</span>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${isImport ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                              {isImport ? 'NHẬP' : 'XUẤT'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-mono text-[11px] font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                              {isImport ? `GRPO • ${item.voucher}` : `IT • ${item.voucher}`}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-mono text-xs font-bold text-gray-900">{item.ma_sp}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-gray-700 text-[13px]">{item.ten_sp}</span>
                          </td>
                          <td className="p-3 text-center text-xs text-gray-500 font-medium">cái</td>
                          <td className="p-3 text-right font-extrabold text-[13px]">
                            {isImport ? (
                              <span className="text-emerald-600 inline-flex items-center gap-0.5">
                                <ArrowRight size={12} className="-rotate-90 stroke-[3]" />
                                {item.so_luong}
                              </span>
                            ) : (
                              <span className="text-red-500 inline-flex items-center gap-0.5">
                                <ArrowRight size={12} className="rotate-90 stroke-[3]" />
                                {item.so_luong}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="text-xs font-semibold text-gray-600">
                              {item.ma_dam || '-'}
                            </span>
                          </td>
                          <td className="p-3 text-right text-xs text-gray-400 italic">
                            Chờ cập nhật
                          </td>
                          <td className="p-3">
                            <span className="text-[11px] text-gray-500 line-clamp-2" title={item.ghi_chu}>
                              {item.ghi_chu || ''}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
