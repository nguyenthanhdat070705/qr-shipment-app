'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart, PackageCheck, TrendingUp, Clock,
  CheckCircle, AlertCircle, Plus, Eye, ArrowRight,
  BarChart3, Tag, Truck, RefreshCw, ChevronRight,
  FileText, DollarSign, Package, Layers
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import type { PurchaseOrder, GoodsReceipt } from '@/types';

/* ─────────────────────────────────────
   Stat Card
───────────────────────────────────── */
function StatCard({
  label, value, sub, icon, gradient, trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  gradient: string;
  trend?: { value: number; label: string };
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-5 shadow-sm hover:shadow-lg transition-all duration-300 group">
      {/* Gradient accent */}
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full opacity-5 -translate-y-8 translate-x-8 ${gradient}`} />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
          <p className="text-3xl font-extrabold text-gray-900 leading-none">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
          {trend && (
            <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[11px] font-semibold
              ${trend.value >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              <TrendingUp size={10} />
              {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
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

/* ─────────────────────────────────────
   Quick Action Card
───────────────────────────────────── */
function QuickAction({
  icon, title, desc, href, color, iconBg,
}: {
  icon: React.ReactNode; title: string; desc: string;
  href: string; color: string; iconBg: string;
}) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(href)}
      className="group flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 text-left w-full"
    >
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg} flex-shrink-0 group-hover:scale-105 transition-transform`}>
        <span className={color}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 truncate">{title}</p>
        <p className="text-xs text-gray-400 truncate">{desc}</p>
      </div>
      <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
    </button>
  );
}

/* ─────────────────────────────────────
   Status Badge
───────────────────────────────────── */
function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    confirmed:  { label: 'Đã xác nhận', cls: 'bg-purple-100 text-purple-700' },
    received:   { label: 'Đã nhận',     cls: 'bg-emerald-100 text-emerald-700' },
    closed:     { label: 'Hoàn thành',  cls: 'bg-sky-100 text-sky-700' },
    cancelled:  { label: 'Đã huỷ',      cls: 'bg-red-100 text-red-600' },
    pending:    { label: 'Chờ duyệt',   cls: 'bg-amber-100 text-amber-700' },
    inspecting: { label: 'Đang kiểm',   cls: 'bg-purple-100 text-purple-700' },
    completed:  { label: 'Hoàn thành',  cls: 'bg-emerald-100 text-emerald-700' },
  };
  const s = map[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

/* ─────────────────────────────────────
   Main Page
───────────────────────────────────── */
export default function ProcurementDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordRes, recRes] = await Promise.all([
        fetch('/api/purchase-orders').then(r => r.json()),
        fetch('/api/goods-receipt').then(r => r.json()),
      ]);
      setOrders(ordRes.data || []);
      setReceipts(recRes.data || []);
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    try {
      const u = JSON.parse(localStorage.getItem('auth_user') || '{}');
      setUserName(u.email?.split('@')[0] || 'Thu mua');
    } catch { /* */ }
  }, [loadData]);

  /* ── Derived stats ── */
  const totalPO       = orders.length;
  const confirmedPO   = orders.filter(o => o.status === 'confirmed').length;
  const receivedPO    = orders.filter(o => ['received', 'closed'].includes(o.status)).length;
  const totalSpend    = orders.reduce((s, o) => s + Number(o.total_amount || 0), 0);

  const totalReceipts = receipts.length;
  const needApproval  = receipts.filter(r => ['pending', 'inspecting'].includes(r.status)).length;
  const doneReceipts  = receipts.filter(r => r.status === 'completed').length;

  /* ── Recent POs (last 5) ── */
  const recentPOs = [...orders]
    .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())
    .slice(0, 5);

  /* ── Urgent (pending approval) ── */
  const urgentReceipts = receipts
    .filter(r => ['pending', 'inspecting'].includes(r.status))
    .slice(0, 4);

  return (
    <PageLayout
      title="Quản lý Thu mua"
      icon={<ShoppingCart size={16} className="text-violet-500" />}
    >
      {/* ── Welcome Banner ────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1B2A4A] via-[#2d4a7a] to-[#3b5fa8] p-6 mb-6 shadow-xl">
        {/* Decorative orbs */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute bottom-0 left-20 w-24 h-24 rounded-full bg-violet-400/10 blur-xl" />

        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-white/60 font-medium">Bộ phận Thu mua · Đang hoạt động</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-1">
              Chào, {userName} 👋
            </h1>
            <p className="text-white/60 text-sm">
              Hôm nay {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white/80 text-xs font-semibold hover:bg-white/20 transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </button>
            <button
              onClick={() => router.push('/purchase-orders/create')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-[#1B2A4A] text-sm font-extrabold hover:bg-white/90 shadow-lg transition-all"
            >
              <Plus size={15} />
              Tạo đơn mới
            </button>
          </div>
        </div>

        {/* Alert if pending */}
        {(confirmedPO > 0 || needApproval > 0) && (
          <div className="mt-4 flex items-center gap-2 bg-amber-400/20 border border-amber-400/30 rounded-xl px-4 py-2.5">
            <AlertCircle size={15} className="text-amber-300 flex-shrink-0" />
            <p className="text-xs text-amber-200 font-medium">
              Có <strong className="text-amber-100">{confirmedPO} đơn hàng</strong> đã xác nhận, chờ nhận hàng
              {needApproval > 0 && <> và <strong className="text-amber-100">{needApproval} phiếu nhập</strong> cần duyệt</>}.
            </p>
          </div>
        )}
      </div>

      {/* ── KPI Stats ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Tổng đơn mua"
          value={totalPO}
          sub={`${confirmedPO} chờ nhận hàng`}
          icon={<ShoppingCart size={20} />}
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
        />
        <StatCard
          label="Đã xác nhận"
          value={confirmedPO}
          sub="Chờ nhận hàng"
          icon={<Clock size={20} />}
          gradient="bg-gradient-to-br from-amber-400 to-orange-500"
        />
        <StatCard
          label="Phiếu nhập cần duyệt"
          value={needApproval}
          sub={`${doneReceipts}/${totalReceipts} hoàn thành`}
          icon={<PackageCheck size={20} />}
          gradient="bg-gradient-to-br from-indigo-500 to-blue-600"
        />
        <StatCard
          label="Tổng chi tiêu"
          value={totalSpend > 0 ? `${(totalSpend / 1_000_000_000).toFixed(2)} Tỷ` : '—'}
          sub={`${receivedPO} đơn đã giao`}
          icon={<DollarSign size={20} />}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
        />
      </div>

      {/* ── Main grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Recent POs ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full bg-violet-500" />
              <h2 className="font-extrabold text-gray-900 text-base">Đơn hàng gần đây</h2>
            </div>
            <button
              onClick={() => router.push('/purchase-orders')}
              className="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors"
            >
              Xem tất cả <ArrowRight size={13} />
            </button>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-violet-100 border-t-violet-500" />
            </div>
          ) : recentPOs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <ShoppingCart size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm font-medium">Chưa có đơn hàng nào</p>
              <button
                onClick={() => router.push('/purchase-orders/create')}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-50 text-violet-600 text-sm font-bold hover:bg-violet-100 transition-colors"
              >
                <Plus size={14} /> Tạo đơn đầu tiên
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/50">
                    <th className="text-left px-5 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wide">Mã đơn</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wide hidden md:table-cell">Nhà CC</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wide">Trạng thái</th>
                    <th className="text-right px-5 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wide hidden sm:table-cell">Giá trị</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentPOs.map((po) => (
                    <tr
                      key={po.id}
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                      onClick={() => router.push(`/purchase-orders/${po.id}`)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                            <FileText size={12} className="text-violet-600" />
                          </div>
                          <span className="font-mono font-bold text-violet-700 text-xs">{po.po_code}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <p className="text-xs font-semibold text-gray-700 truncate max-w-[140px]">{po.supplier?.name || '—'}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusPill status={po.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right hidden sm:table-cell">
                        <span className="text-sm font-bold text-gray-900">
                          {(() => {
                            const amt = Number(po.total_amount || 0);
                            if (amt === 0) return '0₫';
                            if (amt >= 1_000_000_000) return `${(amt / 1_000_000_000).toFixed(2)} Tỷ`;
                            if (amt >= 1_000_000) return `${(amt / 1_000_000).toFixed(1)}M₫`;
                            return amt.toLocaleString('vi-VN') + '₫';
                          })()}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye size={14} className="text-gray-400" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Receipt management summary */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full bg-indigo-500" />
              <h2 className="font-extrabold text-gray-900 text-base">Phiếu cần duyệt</h2>
              {needApproval > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {needApproval}
                </span>
              )}
            </div>
            <button
              onClick={() => router.push('/receipt-management')}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Xem tất cả <ArrowRight size={13} />
            </button>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-3 border-indigo-100 border-t-indigo-500" />
            </div>
          ) : urgentReceipts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center gap-3">
              <CheckCircle size={20} className="text-emerald-500" />
              <p className="text-sm text-gray-500 font-medium">Không có phiếu nào cần duyệt gấp.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {urgentReceipts.map((r) => (
                <div
                  key={r.id}
                  onClick={() => router.push(`/receipt-management/${r.id}`)}
                  className="bg-white rounded-xl border border-amber-100 p-4 flex items-center gap-3 cursor-pointer hover:bg-amber-50/50 hover:border-amber-200 transition-all group"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <PackageCheck size={16} className="text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">{r.gr_code}</p>
                    <p className="text-xs text-gray-400 truncate">Kho: {r.warehouse?.name || '—'} · {new Date(r.received_date).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <StatusPill status={r.status} />
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Quick Actions + Progress ── */}
        <div className="space-y-5">

          {/* Quick Actions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 rounded-full bg-emerald-500" />
              <h2 className="font-extrabold text-gray-900 text-base">Thao tác nhanh</h2>
            </div>
            <div className="space-y-2">
              <QuickAction
                icon={<Plus size={18} />}
                title="Tạo đơn mua hàng"
                desc="Tạo Purchase Order mới"
                href="/purchase-orders/create"
                color="text-violet-600"
                iconBg="bg-violet-100"
              />
              <QuickAction
                icon={<ShoppingCart size={18} />}
                title="Quản lý đơn hàng"
                desc="Xem & theo dõi tất cả PO"
                href="/purchase-orders"
                color="text-blue-600"
                iconBg="bg-blue-100"
              />
              <QuickAction
                icon={<PackageCheck size={18} />}
                title="Duyệt nhập hàng"
                desc="Đối chiếu & xác nhận phiếu"
                href="/receipt-management"
                color="text-indigo-600"
                iconBg="bg-indigo-100"
              />
              <QuickAction
                icon={<Layers size={18} />}
                title="Kho hàng"
                desc="Xem tồn kho hiện tại"
                href="/inventory"
                color="text-sky-600"
                iconBg="bg-sky-100"
              />
              <QuickAction
                icon={<Package size={18} />}
                title="Danh sách sản phẩm"
                desc="Xem toàn bộ hàng hoá"
                href="/product/fullproductlist"
                color="text-teal-600"
                iconBg="bg-teal-100"
              />
            </div>
          </div>

          {/* PO Progress Summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-violet-500" />
              <h3 className="font-extrabold text-gray-900 text-sm">Tiến độ đơn hàng</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Đã nhận hàng', count: receivedPO, total: totalPO, color: 'bg-emerald-500' },
                { label: 'Đã xác nhận', count: confirmedPO, total: totalPO, color: 'bg-purple-500' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-500 font-medium">{item.label}</span>
                    <span className="text-xs font-bold text-gray-700">{item.count}/{totalPO}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color} transition-all duration-700`}
                      style={{ width: totalPO > 0 ? `${Math.round((item.count / totalPO) * 100)}%` : '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-3 gap-2">
              {[
                { label: 'PO đã nhận', value: receivedPO, color: 'text-emerald-600' },
                { label: 'Nhập hoàn thành', value: doneReceipts, color: 'text-blue-600' },
                { label: 'Cần duyệt', value: needApproval, color: 'text-amber-600' },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-gray-400 font-medium leading-tight">{s.label}</p>
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
    </PageLayout>
  );
}
