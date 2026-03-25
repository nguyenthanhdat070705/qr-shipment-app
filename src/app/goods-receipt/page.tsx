'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PackageCheck, Plus, Eye } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import DataTable from '@/components/DataTable';
import StatusTimeline, { GR_STEPS } from '@/components/StatusTimeline';
import type { GoodsReceipt } from '@/types';

export default function GoodsReceiptPage() {
  const router = useRouter();
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/goods-receipt')
      .then((r) => r.json())
      .then((res) => setReceipts(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const total = receipts.length;
  const pendingCount = receipts.filter((r) => r.status === 'pending').length;
  const completedCount = receipts.filter((r) => r.status === 'completed').length;

  const columns = [
    {
      key: 'gr_code',
      label: 'Mã phiếu',
      sortable: true,
      render: (row: GoodsReceipt) => (
        <span className="font-mono font-bold text-orange-600">{row.gr_code}</span>
      ),
    },
    {
      key: 'po',
      label: 'PO liên kết',
      render: (row: GoodsReceipt) => (
        <span className="text-purple-600 font-mono text-xs">
          {(row.purchase_order as unknown as Record<string, unknown> | undefined)?.po_code as string || '—'}
        </span>
      ),
    },
    {
      key: 'warehouse',
      label: 'Kho nhận',
      render: (row: GoodsReceipt) => (
        <span>{row.warehouse?.name || '—'}</span>
      ),
    },
    {
      key: 'received_by',
      label: 'Người nhận',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (row: GoodsReceipt) => (
        <StatusTimeline steps={GR_STEPS} current={row.status} />
      ),
    },
    {
      key: 'received_date',
      label: 'Ngày nhận',
      sortable: true,
      render: (row: GoodsReceipt) =>
        new Date(row.received_date).toLocaleDateString('vi-VN'),
    },
    {
      key: 'actions',
      label: '',
      render: (row: GoodsReceipt) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/goods-receipt/${row.id}`);
          }}
          className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-500 transition-colors"
        >
          <Eye size={16} />
        </button>
      ),
    },
  ];

  return (
    <PageLayout title="Nhập kho" icon={<PackageCheck size={16} className="text-orange-500" />}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Nhập kho</h1>
            <p className="text-sm text-gray-500 mt-1">Phiếu nhập hàng (GRPO)</p>
          </div>
          <button
            onClick={() => router.push('/goods-receipt/create')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all"
          >
            <Plus size={16} />
            Tạo phiếu nhập
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white border border-gray-200 p-4 text-center">
            <p className="text-2xl font-extrabold text-gray-900">{total}</p>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1">Tổng phiếu</p>
          </div>
          <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-4 text-center">
            <p className="text-2xl font-extrabold text-yellow-600">{pendingCount}</p>
            <p className="text-xs font-semibold text-yellow-500 uppercase tracking-wide mt-1">Chờ xử lý</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center">
            <p className="text-2xl font-extrabold text-emerald-600">{completedCount}</p>
            <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide mt-1">Hoàn tất</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Đang tải...</div>
        ) : (
          <DataTable
            data={receipts as unknown as Record<string, unknown>[]}
            columns={columns as Parameters<typeof DataTable>[0]['columns']}
            searchPlaceholder="Tìm theo mã phiếu, kho, PO..."
            onRowClick={(row) => router.push(`/goods-receipt/${(row as unknown as GoodsReceipt).id}`)}
            emptyMessage="Chưa có phiếu nhập kho nào."
          />
        )}
      </div>
    </PageLayout>
  );
}
