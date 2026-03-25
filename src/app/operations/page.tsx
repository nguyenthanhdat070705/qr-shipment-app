'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Plus, Eye } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import DataTable from '@/components/DataTable';
import StatusTimeline, { DELIVERY_STEPS } from '@/components/StatusTimeline';
import type { DeliveryOrder } from '@/types';

export default function OperationsPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/operations')
      .then((r) => r.json())
      .then((res) => setOrders(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const total = orders.length;
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const inTransitCount = orders.filter((o) => o.status === 'in_transit').length;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;

  const columns = [
    {
      key: 'do_code',
      label: 'Mã đơn',
      sortable: true,
      render: (row: DeliveryOrder) => (
        <span className="font-mono font-bold text-amber-600">{row.do_code}</span>
      ),
    },
    {
      key: 'customer_name',
      label: 'Khách hàng',
      sortable: true,
      render: (row: DeliveryOrder) => (
        <div>
          <p className="font-semibold">{row.customer_name || '—'}</p>
          {row.customer_phone && <p className="text-xs text-gray-400">{row.customer_phone}</p>}
        </div>
      ),
    },
    {
      key: 'warehouse',
      label: 'Kho xuất',
      render: (row: DeliveryOrder) => <span>{row.warehouse?.name || '—'}</span>,
    },
    {
      key: 'assigned_to',
      label: 'Người giao',
      render: (row: DeliveryOrder) => <span>{row.assigned_to || '—'}</span>,
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (row: DeliveryOrder) => (
        <StatusTimeline steps={DELIVERY_STEPS} current={row.status} />
      ),
    },
    {
      key: 'delivery_date',
      label: 'Ngày giao',
      sortable: true,
      render: (row: DeliveryOrder) =>
        row.delivery_date ? new Date(row.delivery_date).toLocaleDateString('vi-VN') : '—',
    },
    {
      key: 'actions',
      label: '',
      render: (row: DeliveryOrder) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/operations/${row.id}`);
          }}
          className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors"
        >
          <Eye size={16} />
        </button>
      ),
    },
  ];

  return (
    <PageLayout title="Vận hành" icon={<Truck size={16} className="text-amber-500" />}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Vận hành</h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý đơn giao hàng</p>
          </div>
          <button
            onClick={() => router.push('/operations/create')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all"
          >
            <Plus size={16} />
            Tạo đơn giao
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-white border border-gray-200 p-4 text-center">
            <p className="text-2xl font-extrabold text-gray-900">{total}</p>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1">Tổng đơn</p>
          </div>
          <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-4 text-center">
            <p className="text-2xl font-extrabold text-yellow-600">{pendingCount}</p>
            <p className="text-xs font-semibold text-yellow-500 uppercase tracking-wide mt-1">Chờ</p>
          </div>
          <div className="rounded-2xl bg-orange-50 border border-orange-200 p-4 text-center">
            <p className="text-2xl font-extrabold text-orange-600">{inTransitCount}</p>
            <p className="text-xs font-semibold text-orange-500 uppercase tracking-wide mt-1">Đang giao</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center">
            <p className="text-2xl font-extrabold text-emerald-600">{deliveredCount}</p>
            <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide mt-1">Đã giao</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Đang tải...</div>
        ) : (
          <DataTable
            data={orders as unknown as Record<string, unknown>[]}
            columns={columns as Parameters<typeof DataTable>[0]['columns']}
            searchPlaceholder="Tìm theo mã đơn, khách hàng..."
            onRowClick={(row) => router.push(`/operations/${(row as unknown as DeliveryOrder).id}`)}
            emptyMessage="Chưa có đơn giao hàng nào."
          />
        )}
      </div>
    </PageLayout>
  );
}
