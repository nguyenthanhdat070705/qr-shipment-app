'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart, Plus, Eye,
  Clock, CheckCircle, PackageCheck, XCircle,
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { getWarehouseFilter } from '@/config/roles.config';
import DataTable from '@/components/DataTable';
import StatusTimeline, { PO_STEPS } from '@/components/StatusTimeline';
import type { PurchaseOrder } from '@/types';

/* ── Stat card ─────────────────────────────────────── */
function StatCard({
  label, value, icon, color, bg, border,
}: {
  label: string; value: number;
  icon: React.ReactNode; color: string; bg: string; border: string;
}) {
  return (
    <div className={`rounded-2xl bg-white border ${border} p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow`}>
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bg} flex-shrink-0`}>
        <span className={color}>{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-extrabold text-gray-900 leading-none">{value}</p>
        <p className="text-xs font-semibold text-gray-400 mt-1 uppercase tracking-wide">{label}</p>
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────── */
export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/purchase-orders')
      .then((r) => r.json())
      .then((res) => {
        let data = res.data || [];
        try {
          const auth = localStorage.getItem('auth_user');
          if (auth) {
            const user = JSON.parse(auth);
            const wFilter = getWarehouseFilter(user.email);
            if (wFilter) {
              data = data.filter((item: PurchaseOrder) => item.warehouse?.name?.includes(wFilter));
            }
          }
        } catch (e) { console.error(e); }
        setOrders(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const total         = orders.length;
  const draftCount    = orders.filter((o) => o.status === 'draft' || o.status === 'submitted').length;
  const approvedCount = orders.filter((o) => o.status === 'approved').length;
  const receivedCount = orders.filter((o) => o.status === 'received').length;
  const closedCount   = orders.filter((o) => o.status === 'closed' || o.status === 'cancelled').length;

  const columns = [
    {
      key: 'po_code',
      label: 'Số đơn hàng',
      sortable: true,
      render: (row: PurchaseOrder) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
            <ShoppingCart size={14} className="text-violet-600" />
          </div>
          <span className="font-mono font-bold text-violet-700 text-sm">{row.po_code}</span>
        </div>
      ),
    },
    {
      key: 'supplier',
      label: 'Nhà cung cấp',
      render: (row: PurchaseOrder) => (
        <div>
          <p className="font-semibold text-gray-800 text-sm">{row.supplier?.name || '—'}</p>
          {row.supplier?.phone && (
            <p className="text-xs text-gray-400">{row.supplier.phone}</p>
          )}
        </div>
      ),
    },
    {
      key: 'warehouse',
      label: 'Kho nhận',
      render: (row: PurchaseOrder) => (
        <span className="text-sm text-gray-700">{row.warehouse?.name || '—'}</span>
      ),
    },
    {
      key: 'created_by',
      label: 'Người đặt',
      sortable: true,
      render: (row: PurchaseOrder) => (
        <span className="text-sm text-gray-700">{row.created_by?.split('@')[0] || '—'}</span>
      ),
    },
    {
      key: 'order_date',
      label: 'Ngày đặt',
      sortable: true,
      render: (row: PurchaseOrder) => (
        <span className="text-sm text-gray-500">
          {new Date(row.order_date).toLocaleDateString('vi-VN')}
        </span>
      ),
    },
    {
      key: 'total_amount',
      label: 'Tổng tiền',
      sortable: true,
      render: (row: PurchaseOrder) => (
        <span className="font-bold text-gray-900">
          {Number(row.total_amount).toLocaleString('vi-VN')} ₫
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (row: PurchaseOrder) => (
        <StatusTimeline steps={PO_STEPS} current={row.status} />
      ),
    },
    {
      key: 'actions',
      label: 'Hành động',
      render: (row: PurchaseOrder) => (
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/purchase-orders/${row.id}`); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-violet-100 text-gray-600 hover:text-violet-700 text-xs font-semibold transition-colors"
        >
          <Eye size={13} />
          Chi tiết
        </button>
      ),
    },
  ];

  return (
    <PageLayout title="Đặt hàng" icon={<ShoppingCart size={15} className="text-violet-500" />}>

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Quản lý Đơn hàng</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Quản lý {total} đơn đặt hàng từ nhà cung cấp.
          </p>
        </div>
        <button
          onClick={() => router.push('/purchase-orders/create')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B2A4A] text-white rounded-xl font-bold text-sm hover:bg-[#162240] shadow-lg shadow-[#1B2A4A]/20 transition-all"
        >
          <Plus size={16} />
          Tạo đơn hàng
        </button>
      </div>

      {/* ── Stat cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Tổng đơn hàng"  value={total}         icon={<ShoppingCart size={22} />} color="text-[#1B2A4A]" bg="bg-[#eef1f7]"    border="border-[#d5dbe9]" />
        <StatCard label="Đang chờ xử lý" value={draftCount}    icon={<Clock size={22} />}        color="text-amber-600"  bg="bg-amber-50"      border="border-amber-200" />
        <StatCard label="Đã xác nhận"    value={approvedCount} icon={<CheckCircle size={22} />}  color="text-emerald-600" bg="bg-emerald-50"   border="border-emerald-200" />
        <StatCard label="Đã giao hàng"   value={receivedCount + closedCount} icon={<PackageCheck size={22} />} color="text-sky-600" bg="bg-sky-50" border="border-sky-200" />
      </div>

      {/* ── Table ──────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-violet-200 border-t-violet-600" />
        </div>
      ) : (
        <DataTable
          data={orders as unknown as Record<string, unknown>[]}
          columns={columns as Parameters<typeof DataTable>[0]['columns']}
          searchPlaceholder="Tìm theo mã đơn, NCC, người đặt..."
          onRowClick={(row) => router.push(`/purchase-orders/${(row as unknown as PurchaseOrder).id}`)}
          emptyMessage="Chưa có đơn mua hàng nào."
        />
      )}

    </PageLayout>
  );
}
