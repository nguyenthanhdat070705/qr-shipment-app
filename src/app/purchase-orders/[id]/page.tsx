'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, ArrowLeft, FileText, Calendar, User, Building, PackageCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import StatusTimeline, { PO_STEPS } from '@/components/StatusTimeline';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import type { PurchaseOrder } from '@/types';

const STATUS_ACTIONS: Record<string, { label: string; next: string; color: string }[]> = {
  draft:     [{ label: 'Gửi duyệt', next: 'submitted', color: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' }],
  submitted: [{ label: 'Duyệt', next: 'approved', color: 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' },
              { label: 'Hủy', next: 'cancelled', color: 'bg-red-500 hover:bg-red-600 shadow-red-200' }],
  approved:  [{ label: 'Xác nhận nhận hàng', next: 'received', color: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' }],
  received:  [{ label: 'Đóng PO', next: 'closed', color: 'bg-gray-600 hover:bg-gray-700 shadow-gray-200' }],
};

export default function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetch(`/api/purchase-orders/${resolvedParams.id}`)
      .then((r) => r.json())
      .then((res) => setPo(res.data || null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [resolvedParams.id]);

  const handleStatusChange = async (nextStatus: string) => {
    if (!po) return;
    setUpdating(true);

    let approvedBy: string | undefined;
    if (nextStatus === 'approved') {
      try {
        const raw = localStorage.getItem('auth_user');
        if (raw) approvedBy = JSON.parse(raw).email;
      } catch { /* ignore */ }
    }

    try {
      const res = await fetch(`/api/purchase-orders/${po.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, approved_by: approvedBy }),
      });
      const result = await res.json();
      if (res.ok) {
        setPo({ ...po, ...result.data });
        showToast(
          nextStatus === 'approved' ? 'PO đã được duyệt!' :
          nextStatus === 'cancelled' ? 'PO đã bị hủy.' :
          'Cập nhật trạng thái thành công.',
          nextStatus === 'cancelled' ? 'err' : 'ok'
        );
      } else {
        showToast(result.error || 'Có lỗi xảy ra.', 'err');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi kết nối server.', 'err');
    } finally {
      setUpdating(false);
    }
  };

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

  const actions = STATUS_ACTIONS[po.status] || [];

  return (
    <PageLayout title="Chi tiết PO" icon={<ShoppingCart size={16} className="text-purple-500" />}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Toast ──────────────────────────────────────────── */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-xl font-semibold text-sm flex items-center gap-2 transition-all
            ${toast.type === 'ok' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            {toast.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {toast.msg}
          </div>
        )}

        {/* Back */}
        <button
          onClick={() => router.push('/purchase-orders')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} />
          Danh sách PO
        </button>

        {/* Header card */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                <span className="font-mono text-purple-600">{po.po_code}</span>
              </h1>
              <div className="mt-3">
                <StatusTimeline steps={PO_STEPS} current={po.status} />
              </div>
            </div>
            {/* QR Code */}
            <div className="flex flex-col items-center gap-2">
              <QRCodeGenerator type="po" id={po.id} code={po.po_code} size={100} />
              <p className="text-[10px] text-gray-400 max-w-[120px] text-center leading-tight">
                * Người đặt hàng gửi mã QR cho NCC mang tới kho
              </p>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-start gap-2">
              <Building size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">Nhà CC</p>
                <p className="text-sm font-semibold text-gray-800">{po.supplier?.name || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">Kho nhận</p>
                <p className="text-sm font-semibold text-gray-800">{po.warehouse?.name || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">Ngày đặt</p>
                <p className="text-sm font-semibold text-gray-800">
                  {new Date(po.order_date).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">Người đặt</p>
                <p className="text-sm font-semibold text-gray-800">{po.created_by}</p>
              </div>
            </div>
          </div>

          {po.note && (
            <div className="mt-4 p-3 rounded-xl bg-gray-50 text-sm text-gray-600">
              <span className="font-bold text-gray-500">Ghi chú:</span> {po.note}
            </div>
          )}
        </div>

        {/* Items */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Sản phẩm</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-400">Mã sản phẩm</th>
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
                    <td className="px-4 py-3">{item.product_name}</td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">{Number(item.unit_price).toLocaleString('vi-VN')} ₫</td>
                    <td className="px-4 py-3 text-right font-semibold">{Number(item.total_price).toLocaleString('vi-VN')} ₫</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50/50">
                  <td colSpan={4} className="px-4 py-3 text-right font-bold text-gray-500 uppercase text-xs">Tổng cộng</td>
                  <td className="px-4 py-3 text-right text-lg font-extrabold text-gray-900">
                    {Number(po.total_amount).toLocaleString('vi-VN')} ₫
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Action buttons */}
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

        {/* ── Create GRPO button — appears when PO is approved ── */}
        {po.status === 'approved' && (
          <div className="rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-bold text-orange-700 text-sm">PO đã được duyệt</p>
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
    </PageLayout>
  );
}
