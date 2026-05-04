'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PackageCheck, Plus, Eye, CheckCircle, PackageOpen, ClipboardList, Clock } from 'lucide-react';
import { getWarehouseFilter } from '@/config/roles.config';
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
    <div className={`rounded-2xl bg-white dark:bg-slate-800 border ${border} p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow`}>
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bg} flex-shrink-0`}>
        <span className={color}>{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-extrabold text-gray-900 dark:text-white leading-none">{value}</p>
        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wide">{label}</p>
      </div>
    </div>
  );
}

export default function ImportTab() {
  const router = useRouter();
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/goods-receipt')
      .then((r) => r.json())
      .then((res) => {
        let data = res.data || [];
        try {
          const auth = localStorage.getItem('auth_user');
          if (auth) {
            const user = JSON.parse(auth);
            const wFilter = getWarehouseFilter(user.email);
            if (wFilter) {
              data = data.filter((item: any) => item.warehouse?.name?.includes(wFilter));
            }
          }
        } catch(e) { console.error(e); }
        setReceipts(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const total = receipts.length;
  const completedCount = receipts.filter((r) => r.status === 'completed').length;
  const pendingPoCount = receipts.filter((r) => r.status === 'pending_po').length;

  const columns = [
    {
      key: 'gr_code',
      label: 'Mã phiếu',
      sortable: true,
      render: (row: GoodsReceipt) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
            <PackageCheck size={14} className="text-orange-600" />
          </div>
          <span className="font-mono font-bold text-orange-700 text-sm">{row.gr_code}</span>
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
      label: 'Người nhận',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (row: GoodsReceipt & { is_missing_goods?: boolean }) => {
        // Temporary receipt → use GR_TEMP_STEPS
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
      render: (row: GoodsReceipt) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/goods-receipt/${row.id}`);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-orange-100 text-gray-600 hover:text-orange-700 text-xs font-semibold transition-colors"
        >
          <Eye size={13} />
          Chi tiết
        </button>
      ),
    },
  ];

  return (
    <div className="@container">
      <div className="mb-5 flex flex-col gap-3">
        <div>
          <h1 className="text-xl @2xl:text-2xl font-extrabold text-gray-900 dark:text-white">Danh sách phiếu nhập</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Quản lý nhập hàng (GRPO) từ các PO đã xác nhận</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => router.push('/goods-receipt/create?temporary=true')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 shadow-lg shadow-amber-200 dark:shadow-amber-900/30 transition-all"
          >
            <ClipboardList size={16} />
            Nhập tạm
          </button>
          <button
            onClick={() => router.push('/goods-receipt/create')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1B2A4A] text-white rounded-xl font-bold text-sm hover:bg-[#162240] shadow-lg shadow-[#1B2A4A]/20 transition-all"
          >
            <Plus size={16} />
            Tạo phiếu nhập
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 @lg:grid-cols-3 gap-3 mb-5">
        <StatCard label="Tổng phiếu" value={total} icon={<PackageOpen size={22} />} color="text-[#1B2A4A] dark:text-blue-300" bg="bg-[#eef1f7] dark:bg-blue-900/30" border="border-[#d5dbe9] dark:border-blue-800" />
        <StatCard label="Hoàn tất" value={completedCount} icon={<CheckCircle size={22} />} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-900/30" border="border-emerald-200 dark:border-emerald-800" />
        {pendingPoCount > 0 && (
          <StatCard label="Chờ PO" value={pendingPoCount} icon={<Clock size={22} />} color="text-amber-600 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-900/30" border="border-amber-200 dark:border-amber-800" />
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-orange-200 border-t-orange-600" />
        </div>
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
  );
}
