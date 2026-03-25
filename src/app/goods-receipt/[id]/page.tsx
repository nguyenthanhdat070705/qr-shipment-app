'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { PackageCheck, ArrowLeft, Warehouse as WarehouseIcon, Calendar, User, FileText, Printer } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import StatusTimeline, { GR_STEPS } from '@/components/StatusTimeline';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import type { GoodsReceipt } from '@/types';

const STATUS_ACTIONS: Record<string, { label: string; next: string; color: string }[]> = {
  pending:    [{ label: 'Bắt đầu kiểm tra', next: 'inspecting', color: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' }],
  inspecting: [{ label: 'Xác nhận hoàn tất', next: 'completed', color: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' },
               { label: 'Từ chối', next: 'rejected', color: 'bg-red-500 hover:bg-red-600 shadow-red-200' }],
};

export default function GoodsReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [gr, setGr] = useState<GoodsReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetch(`/api/goods-receipt/${resolvedParams.id}`)
      .then((r) => r.json())
      .then((res) => setGr(res.data || null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [resolvedParams.id]);

  const handleStatusChange = async (nextStatus: string) => {
    if (!gr) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/goods-receipt/${gr.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await res.json();
      if (res.ok) setGr({ ...gr, ...result.data });
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="Nhập kho" icon={<PackageCheck size={16} className="text-orange-500" />}>
        <div className="flex items-center justify-center py-20 text-gray-400">Đang tải...</div>
      </PageLayout>
    );
  }

  if (!gr) {
    return (
      <PageLayout title="Nhập kho" icon={<PackageCheck size={16} className="text-orange-500" />}>
        <div className="flex items-center justify-center py-20 text-red-400">Không tìm thấy phiếu nhập.</div>
      </PageLayout>
    );
  }

  const actions = STATUS_ACTIONS[gr.status] || [];
  const poCode = (gr.purchase_order as unknown as Record<string, unknown> | undefined)?.po_code as string | undefined;

  return (
    <PageLayout title="Chi tiết phiếu nhập" icon={<PackageCheck size={16} className="text-orange-500" />}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/goods-receipt')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} />
            Danh sách phiếu nhập
          </button>
          
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-xl font-bold text-sm transition-colors shadow-sm"
          >
            <Printer size={16} />
            In phiếu
          </button>
        </div>

        {/* Header */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">
                <span className="font-mono text-orange-600">{gr.gr_code}</span>
              </h1>
              <div className="mt-3">
                <StatusTimeline steps={GR_STEPS} current={gr.status} />
              </div>
            </div>
            <QRCodeGenerator type="grpo" id={gr.id} code={gr.gr_code} size={100} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-start gap-2">
              <WarehouseIcon size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">Kho nhận</p>
                <p className="text-sm font-semibold text-gray-800">{gr.warehouse?.name || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">PO liên kết</p>
                <p className="text-sm font-semibold text-purple-600 font-mono">{poCode || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">Ngày nhận</p>
                <p className="text-sm font-semibold text-gray-800">
                  {new Date(gr.received_date).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">Người nhận</p>
                <p className="text-sm font-semibold text-gray-800">{gr.received_by}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Hàng hóa</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-400">Mã SP</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-400">Tên SP</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-400">SL yêu cầu</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-400">SL nhận</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase text-gray-400">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {(gr.items || []).map((item) => {
                  const match = item.received_qty >= item.expected_qty;
                  return (
                    <tr key={item.id} className="border-b border-gray-50">
                      <td className="px-4 py-3 font-mono font-semibold text-orange-600">{item.product_code}</td>
                      <td className="px-4 py-3">{item.product_name}</td>
                      <td className="px-4 py-3 text-right">{item.expected_qty}</td>
                      <td className="px-4 py-3 text-right font-semibold">{item.received_qty}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          match ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {match ? 'Đủ' : 'Thiếu'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div className="flex gap-3">
            {actions.map((action) => (
              <button
                key={action.next}
                onClick={() => handleStatusChange(action.next)}
                disabled={updating}
                className={`flex-1 py-3 rounded-xl font-bold text-sm text-white shadow-lg disabled:opacity-50 transition-all ${action.color}`}
              >
                {updating ? 'Đang xử lý...' : action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
