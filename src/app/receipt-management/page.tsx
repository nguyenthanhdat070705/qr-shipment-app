'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PackageCheck, Eye, Clock, CheckCircle, Search } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import DataTable from '@/components/DataTable';
import StatusTimeline, { GR_STEPS, GR_TEMP_STEPS } from '@/components/StatusTimeline';
import type { GoodsReceipt } from '@/types';

function StatCard({
  label, value, icon, color, bg, border,
}: {
  label: string; value: number;
  icon: React.ReactNode; color: string; bg: string; border: string;
}) {
  return (
    <div className={`rounded-2xl bg-white dark:bg-[#162240] border ${border} dark:border-white/10 p-3 sm:p-5 flex items-center gap-2 sm:gap-4 shadow-sm hover:shadow-md transition-shadow`}>
      <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl ${bg} dark:bg-white/5 flex-shrink-0`}>
        <span className={`${color} dark:text-white`}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-lg sm:text-2xl font-extrabold text-gray-900 dark:text-white leading-none">{value}</p>
        <p className="text-[10px] sm:text-xs font-semibold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wide truncate">{label}</p>
      </div>
    </div>
  );
}

export function ReceiptManagementContent() {
  const router = useRouter();
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
    
    fetch('/api/goods-receipt', { signal: controller.signal })
      .then((r) => r.json())
      .then((res) => {
        if (res.error) {
          setError(res.error);
          setReceipts([]);
        } else {
          setReceipts(res.data || []);
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          setError('Hết thời gian tải dữ liệu. Vui lòng tải lại trang.');
        } else {
          console.error(err);
          setError('Lỗi kết nối server.');
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });
    
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  const total = receipts.length;
  const pendingCount = receipts.filter((r) => 
    (r.status as string) === 'pending' || 
    (r.status as string) === 'inspecting' ||
    (r.status as string) === 'pending_po' ||
    (r.status as string) === 'pending_confirm'
  ).length;
  const completedCount = receipts.filter((r) => r.status === 'completed').length;

  const columns = [
    {
      key: 'gr_code',
      label: 'Mã phiếu',
      sortable: true,
      primaryOnMobile: true,
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
      hideOnMobile: true,
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
      hideOnMobile: true,
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (row: GoodsReceipt & { is_missing_goods?: boolean }) => {
        if (row.status === 'pending_po' || row.status === 'pending_confirm') {
          return <StatusTimeline steps={GR_TEMP_STEPS} current={row.status} />;
        }
        return (
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
        );
      },
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
      hideOnMobile: true,
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
    <>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">Quản lý nhập hàng</h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">Thu mua đối chiếu và duyệt hàng kho đã nhận</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <StatCard label="Tổng phiếu" value={total} icon={<PackageCheck size={22} />} color="text-[#1B2A4A]" bg="bg-[#eef1f7]" border="border-[#d5dbe9]" />
        <StatCard label="Cần duyệt" value={pendingCount} icon={<Clock size={22} />} color="text-yellow-600" bg="bg-yellow-50" border="border-yellow-200" />
        <StatCard label="Đã duyệt" value={completedCount} icon={<CheckCircle size={22} />} color="text-emerald-600" bg="bg-emerald-50" border="border-emerald-200" />
      </div>

      {error && (
        <div className="mb-6 px-5 py-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm font-medium flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
          {error}
          <button 
            onClick={() => window.location.reload()} 
            className="ml-auto px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-500/20 dark:hover:bg-red-500/30 text-red-700 dark:text-red-400 text-xs font-bold transition-colors"
          >
            Tải lại
          </button>
        </div>
      )}

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
    </>
  );
}

export default function ReceiptManagementPage() {
  return (
    <PageLayout title="Quản lý nhập hàng" icon={<PackageCheck size={15} className="text-indigo-500" />}>
      <ReceiptManagementContent />
    </PageLayout>
  );
}
