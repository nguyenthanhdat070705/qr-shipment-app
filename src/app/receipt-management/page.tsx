'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PackageCheck, Eye, Clock, CheckCircle, Search } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import DataTable from '@/components/DataTable';
import StatusTimeline, { GR_STEPS } from '@/components/StatusTimeline';
import type { GoodsReceipt } from '@/types';

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

export default function ReceiptManagementPage() {
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
  const pendingCount = receipts.filter((r) => (r.status as string) === 'pending' || (r.status as string) === 'inspecting').length;
  const completedCount = receipts.filter((r) => r.status === 'completed').length;

  const columns = [
    {
      key: 'gr_code',
      label: 'Mã phiếu',
      sortable: true,
      render: (row: GoodsReceipt) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <PackageCheck size={14} className="text-indigo-600" />
          </div>
          <span className="font-mono font-bold text-indigo-700 text-sm">{row.gr_code}</span>
        </div>
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
      label: 'Người nhận (Kho)',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (row: GoodsReceipt & { is_missing_goods?: boolean }) => (
        <StatusTimeline 
          steps={GR_STEPS} 
          current={row.status} 
          stepOverrides={{
            completed: {
              label: row.is_missing_goods ? 'Thiếu hàng' : 'Đầy đủ',
              color: row.is_missing_goods 
                ? 'bg-yellow-200 text-red-600 font-extrabold ring-red-300' 
                : 'bg-emerald-100 text-emerald-700'
            }
          }}
        />
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
      label: 'Hành động',
      render: (row: GoodsReceipt) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/receipt-management/${row.id}`);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-indigo-100 text-gray-600 hover:text-indigo-700 text-xs font-semibold transition-colors"
        >
          <Eye size={13} />
          Chi tiết
        </button>
      ),
    },
  ];

  return (
    <PageLayout title="Quản lý nhập hàng" icon={<PackageCheck size={15} className="text-indigo-500" />}>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Quản lý nhập hàng</h1>
        <p className="text-sm text-gray-500 mt-0.5">Thu mua đối chiếu và duyệt hàng kho đã nhận</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Tổng phiếu" value={total} icon={<PackageCheck size={22} />} color="text-[#1B2A4A]" bg="bg-[#eef1f7]" border="border-[#d5dbe9]" />
        <StatCard label="Cần duyệt" value={pendingCount} icon={<Clock size={22} />} color="text-yellow-600" bg="bg-yellow-50" border="border-yellow-200" />
        <StatCard label="Đã duyệt" value={completedCount} icon={<CheckCircle size={22} />} color="text-emerald-600" bg="bg-emerald-50" border="border-emerald-200" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : (
        <DataTable
          data={receipts as unknown as Record<string, unknown>[]}
          columns={columns as Parameters<typeof DataTable>[0]['columns']}
          searchPlaceholder="Tìm theo mã phiếu, kho, PO..."
          onRowClick={(row) => router.push(`/receipt-management/${(row as unknown as GoodsReceipt).id}`)}
          emptyMessage="Chưa có phiếu nhập kho nào."
        />
      )}
    </PageLayout>
  );
}
