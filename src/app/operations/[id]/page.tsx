'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, ArrowLeft, MapPin, Phone, User, Calendar, Warehouse as WarehouseIcon } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import StatusTimeline, { DELIVERY_STEPS } from '@/components/StatusTimeline';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import type { DeliveryOrder } from '@/types';

const STATUS_ACTIONS: Record<string, { label: string; next: string; color: string }[]> = {
  pending:    [{ label: 'Giao việc', next: 'assigned', color: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' }],
  assigned:   [{ label: 'Bắt đầu giao', next: 'in_transit', color: 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' }],
  in_transit: [{ label: 'Xác nhận đã giao', next: 'delivered', color: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' }],
};

export default function OperationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<DeliveryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetch(`/api/operations/${resolvedParams.id}`)
      .then((r) => r.json())
      .then((res) => setOrder(res.data || null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [resolvedParams.id]);

  const handleStatusChange = async (nextStatus: string) => {
    if (!order) return;
    setUpdating(true);

    let assignedTo: string | undefined;
    if (nextStatus === 'assigned') {
      try {
        const raw = localStorage.getItem('auth_user');
        if (raw) assignedTo = JSON.parse(raw).email;
      } catch { /* ignore */ }
    }

    try {
      const res = await fetch(`/api/operations/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, assigned_to: assignedTo }),
      });
      const result = await res.json();
      if (res.ok) setOrder({ ...order, ...result.data });
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="Vận hành" icon={<Truck size={16} className="text-amber-500" />}>
        <div className="flex items-center justify-center py-20 text-gray-400">Đang tải...</div>
      </PageLayout>
    );
  }

  if (!order) {
    return (
      <PageLayout title="Vận hành" icon={<Truck size={16} className="text-amber-500" />}>
        <div className="flex items-center justify-center py-20 text-red-400">Không tìm thấy đơn giao hàng.</div>
      </PageLayout>
    );
  }

  const actions = STATUS_ACTIONS[order.status] || [];

  return (
    <PageLayout title="Chi tiết đơn giao" icon={<Truck size={16} className="text-amber-500" />}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <button
          onClick={() => router.push('/operations')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} />
          Danh sách đơn giao
        </button>

        {/* Header */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">
                <span className="font-mono text-amber-600">{order.do_code}</span>
              </h1>
              <div className="mt-3">
                <StatusTimeline steps={DELIVERY_STEPS} current={order.status} />
              </div>
            </div>
            <QRCodeGenerator type="delivery" id={order.id} code={order.do_code} size={100} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-start gap-2">
              <User size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">Khách hàng</p>
                <p className="text-sm font-semibold text-gray-800">{order.customer_name || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Phone size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">Điện thoại</p>
                <p className="text-sm font-semibold text-gray-800">{order.customer_phone || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">Địa chỉ</p>
                <p className="text-sm font-semibold text-gray-800">{order.customer_address || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <WarehouseIcon size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">Kho xuất</p>
                <p className="text-sm font-semibold text-gray-800">{order.warehouse?.name || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">Ngày giao</p>
                <p className="text-sm font-semibold text-gray-800">
                  {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('vi-VN') : '—'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">Người giao</p>
                <p className="text-sm font-semibold text-gray-800">{order.assigned_to || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Sản phẩm giao</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-400">Mã SP</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-400">Tên SP</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-400">Số lượng</th>
                </tr>
              </thead>
              <tbody>
                {(order.items || []).map((item) => (
                  <tr key={item.id} className="border-b border-gray-50">
                    <td className="px-4 py-3 font-mono font-semibold text-amber-600">{item.product_code}</td>
                    <td className="px-4 py-3">{item.product_name}</td>
                    <td className="px-4 py-3 text-right font-semibold">{item.quantity}</td>
                  </tr>
                ))}
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
