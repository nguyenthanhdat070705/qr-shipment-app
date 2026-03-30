'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  PackageCheck, ArrowLeft, Warehouse as WarehouseIcon,
  Calendar, User, FileText, Printer, CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import StatusTimeline, { GR_STEPS } from '@/components/StatusTimeline';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import type { GoodsReceipt } from '@/types';

export default function GoodsReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [gr, setGr] = useState<GoodsReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetch(`/api/goods-receipt/${resolvedParams.id}`)
      .then((r) => r.json())
      .then((res) => setGr(res.data || null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <PageLayout title="Nhập kho" icon={<PackageCheck size={16} className="text-orange-500" />}>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-orange-200 border-t-orange-500" />
        </div>
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

  const poCode = (gr.purchase_order as unknown as Record<string, unknown> | undefined)?.po_code as string | undefined;
  const items = gr.items || [];
  const totalExpected = items.reduce((s, i) => s + i.expected_qty, 0);
  const totalReceived = items.reduce((s, i) => s + i.received_qty, 0);
  const matchRate = totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0;

  return (
    <PageLayout title="Chi tiết phiếu nhập" icon={<PackageCheck size={16} className="text-orange-500" />}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-xl font-semibold text-sm flex items-center gap-2 transition-all
            ${toast.type === 'ok' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            {toast.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {toast.msg}
          </div>
        )}

        {/* Topbar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/goods-receipt')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} />
            Danh sách phiếu nhập
          </button>
          <button
            onClick={() => window.open(`/goods-receipt/${resolvedParams.id}/print`, '_blank')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-xl font-bold text-sm transition-colors shadow-sm"
          >
            <Printer size={16} />
            In phiếu
          </button>
        </div>

        {/* Header card */}
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

          {/* Progress bar */}
          {items.length > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-gray-500">Tiến độ nhận hàng</span>
                <span className={`text-xs font-bold ${matchRate >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {totalReceived}/{totalExpected} ({matchRate}%)
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${matchRate >= 100 ? 'bg-emerald-500' : 'bg-amber-400'}`}
                  style={{ width: `${Math.min(matchRate, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Items table — read-only */}
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
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-400">SL thực nhận</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase text-gray-400">KQ</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const match = item.received_qty >= item.expected_qty;
                  return (
                    <tr key={item.id} className="border-b border-gray-50">
                      <td className="px-4 py-3 font-mono font-semibold text-orange-600 text-xs">{item.product_code}</td>
                      <td className="px-4 py-3 text-gray-800">{item.product_name}</td>
                      <td className="px-4 py-3 text-right font-medium">{item.expected_qty}</td>
                      <td className="px-4 py-3 text-right font-semibold">{item.received_qty}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          match ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {match ? '✓ Đủ' : '⚠ Thiếu'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                      Chưa có hàng hóa trong phiếu này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </PageLayout>
  );
}
