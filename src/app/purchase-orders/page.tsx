'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Plus, Eye } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import DataTable from '@/components/DataTable';
import StatusTimeline, { PO_STEPS } from '@/components/StatusTimeline';
import type { PurchaseOrder } from '@/types';

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/purchase-orders')
      .then((r) => r.json())
      .then((res) => setOrders(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Stats
  const total = orders.length;
  const draftCount = orders.filter((o) => o.status === 'draft').length;
  const approvedCount = orders.filter((o) => o.status === 'approved').length;
  const receivedCount = orders.filter((o) => o.status === 'received').length;

  const columns = [
    {
      key: 'po_code',
      label: 'Mã PO',
      sortable: true,
      render: (row: PurchaseOrder) => (
        <span className="font-mono font-bold text-purple-600">{row.po_code}</span>
      ),
    },
    {
      key: 'supplier',
      label: 'Nhà cung cấp',
      render: (row: PurchaseOrder) => (
        <span>{row.supplier?.name || '—'}</span>
      ),
    },
    {
      key: 'warehouse',
      label: 'Kho nhận',
      render: (row: PurchaseOrder) => (
        <span>{row.warehouse?.name || '—'}</span>
      ),
    },
    {
      key: 'total_amount',
      label: 'Tổng tiền',
      sortable: true,
      render: (row: PurchaseOrder) => (
        <span className="font-semibold">
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
      key: 'order_date',
      label: 'Ngày đặt',
      sortable: true,
      render: (row: PurchaseOrder) =>
        new Date(row.order_date).toLocaleDateString('vi-VN'),
    },
    {
      key: 'actions',
      label: '',
      render: (row: PurchaseOrder) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/purchase-orders/${row.id}`);
          }}
          className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-500 transition-colors"
        >
          <Eye size={16} />
        </button>
      ),
    },
  ];

  return (
    <PageLayout title="Đơn mua hàng" icon={<ShoppingCart size={16} className="text-purple-500" />}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Đơn mua hàng</h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý Purchase Orders (PO)</p>
          </div>
          <button
            onClick={() => router.push('/purchase-orders/create')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl font-semibold text-sm hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all"
          >
            <Plus size={16} />
            Tạo PO mới
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-white border border-gray-200 p-4 text-center">
            <p className="text-2xl font-extrabold text-gray-900">{total}</p>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1">Tổng PO</p>
          </div>
          <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 text-center">
            <p className="text-2xl font-extrabold text-gray-500">{draftCount}</p>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1">Nháp</p>
          </div>
          <div className="rounded-2xl bg-purple-50 border border-purple-200 p-4 text-center">
            <p className="text-2xl font-extrabold text-purple-600">{approvedCount}</p>
            <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide mt-1">Đã duyệt</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center">
            <p className="text-2xl font-extrabold text-emerald-600">{receivedCount}</p>
            <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide mt-1">Đã nhận</p>
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Đang tải...</div>
        ) : (
          <DataTable
            data={orders as unknown as Record<string, unknown>[]}
            columns={columns as Parameters<typeof DataTable>[0]['columns']}
            searchPlaceholder="Tìm theo mã PO, nhà cung cấp..."
            onRowClick={(row) => router.push(`/purchase-orders/${(row as unknown as PurchaseOrder).id}`)}
            emptyMessage="Chưa có đơn mua hàng nào."
          />
        )}
      </div>
    </PageLayout>
  );
}
