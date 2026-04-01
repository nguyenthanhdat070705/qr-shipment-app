'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, ArrowLeft, Calendar, User, Building, Warehouse, PackageCheck, CheckCircle2 as CheckBadge, AlertTriangle, Printer } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import type { PurchaseOrder } from '@/types';

export default function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/purchase-orders/${resolvedParams.id}`)
      .then((r) => r.json())
      .then((res) => setPo(res.data || null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <PageLayout title="Đơn mua hàng" icon={<ShoppingCart size={16} className="text-purple-500" />}>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-200 border-t-purple-500" />
        </div>
      </PageLayout>
    );
  }

  if (!po) {
    return (
      <PageLayout title="Đơn mua hàng" icon={<ShoppingCart size={16} className="text-purple-500" />}>
        <div className="flex items-center justify-center py-20 text-red-400">Không tìm thấy đơn hàng.</div>
      </PageLayout>
    );
  }

  const statusBadge = po.status === 'cancelled' ? (
    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
      <AlertTriangle size={12} /> Đã hủy
    </span>
  ) : po.status === 'received' || po.status === 'closed' ? (
    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
      <CheckBadge size={12} /> {po.status === 'closed' ? 'Hoàn thành' : 'Đã nhận hàng'}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 ring-2 ring-purple-300 ring-offset-1">
      <CheckBadge size={12} /> Đã xác nhận
    </span>
  );

  return (
    <PageLayout title="Chi tiết PO" icon={<ShoppingCart size={16} className="text-purple-500" />}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Back + Print buttons */}
        <div className="flex items-center justify-between print:hidden">
          <button
            onClick={() => router.push('/purchase-orders')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} />
            Danh sách PO
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1B2A4A] text-white text-sm font-bold hover:bg-[#162240] shadow-md transition-all"
          >
            <Printer size={14} />
            In phiếu
          </button>
        </div>

        {/* Header card — QR code + info side by side */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 print:shadow-none print:border print:rounded-none">
          <div className="flex gap-6">
            {/* Left: QR Code */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <QRCodeGenerator type="po" id={po.id} code={po.po_code} size={120} />
              <p className="text-[9px] text-gray-400 max-w-[130px] text-center leading-tight">
                Đơn mua hàng<br />
                <span className="font-mono font-bold text-gray-500">{po.po_code}</span>
              </p>
            </div>

            {/* Right: PO info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-4">
                <h1 className="text-2xl font-extrabold text-gray-900 font-mono text-purple-600">{po.po_code}</h1>
                {statusBadge}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                <div className="flex items-start gap-2">
                  <Building size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold uppercase text-gray-400">Nhà CC</p>
                    <p className="text-sm font-semibold text-gray-800">{po.supplier?.name || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Warehouse size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold uppercase text-gray-400">Kho nhận</p>
                    <p className="text-sm font-semibold text-gray-800">{po.warehouse?.name || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <User size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold uppercase text-gray-400">Người đặt</p>
                    <p className="text-sm font-semibold text-gray-800">{po.created_by || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold uppercase text-gray-400">Ngày đặt</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {po.order_date ? new Date(po.order_date).toLocaleDateString('vi-VN') : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold uppercase text-emerald-500">Dự kiến nhận</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {po.expected_date ? new Date(po.expected_date).toLocaleDateString('vi-VN') : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {po.note && (
                <div className="mt-3 p-2.5 rounded-lg bg-gray-50 text-sm text-gray-600">
                  <span className="font-bold text-gray-500">Ghi chú:</span> {po.note}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden print:shadow-none print:border print:rounded-none">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Sản phẩm</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-400">Mã SP</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-400">Tên SP</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-400">SL</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-400">Đơn giá</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-400">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {(po.items || []).map((item) => (
                  <tr key={item.id} className="border-b border-gray-50">
                    <td className="px-4 py-3 font-mono font-semibold text-purple-600">{item.product_code}</td>
                    <td className="px-4 py-3 flex items-center gap-2">
                      {item.product_name}
                      {item.hang_ky_gui && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-purple-100 text-purple-700">Ký gửi</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">{Number(item.unit_price).toLocaleString('vi-VN')} ₫</td>
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{Number(item.total_price).toLocaleString('vi-VN')} ₫</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50/50">
                  <td colSpan={4} className="px-4 py-3 text-right font-bold text-gray-500 uppercase text-xs">Tổng cộng</td>
                  <td className="px-4 py-3 text-right text-lg font-extrabold text-gray-900 whitespace-nowrap">
                    {Number(po.total_amount).toLocaleString('vi-VN')} ₫
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Create GRPO button — appears when PO is confirmed ── */}
        {po.status === 'confirmed' && (
          <div className="rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
            <div>
              <p className="font-bold text-orange-700 text-sm">PO đã xác nhận</p>
              <p className="text-orange-600 text-xs mt-0.5">Kho có thể tạo phiếu nhập hàng (GRPO) cho đơn này.</p>
            </div>
            <button
              onClick={() => router.push(`/goods-receipt/create?po_id=${po.id}&po_code=${po.po_code}&warehouse_id=${po.warehouse_id || ''}`)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all whitespace-nowrap"
            >
              <PackageCheck size={16} />
              Tạo phiếu nhập (GRPO)
            </button>
          </div>
        )}

      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          header, nav, aside, .print\\:hidden {
            display: none !important;
          }
          main, body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border { border: 1px solid #e5e7eb !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
        }
      `}</style>
    </PageLayout>
  );
}
