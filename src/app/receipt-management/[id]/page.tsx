'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { PackageCheck, ArrowLeft, Warehouse as WarehouseIcon, Calendar, User, FileText, Printer, Link as LinkIcon, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import StatusTimeline, { GR_STEPS, GR_TEMP_STEPS } from '@/components/StatusTimeline';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import type { GoodsReceipt, PurchaseOrder } from '@/types';

const STATUS_ACTIONS: Record<string, { label: string; next: string; color: string }[]> = {
  pending:    [{ label: 'Bắt đầu kiểm tra', next: 'inspecting', color: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' }],
  inspecting: [{ label: 'Duyệt (Sinh QR Đám)', next: 'completed', color: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' },
               { label: 'Từ chối', next: 'rejected', color: 'bg-red-500 hover:bg-red-600 shadow-red-200' }],
};

export default function ReceiptManagementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [gr, setGr] = useState<GoodsReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // States for linking PO
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [selectedPoId, setSelectedPoId] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [loadingPos, setLoadingPos] = useState(false);

  useEffect(() => {
    fetch(`/api/goods-receipt/${resolvedParams.id}`)
      .then((r) => r.json())
      .then((res) => setGr(res.data || null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [resolvedParams.id]);

  // Fetch active POs if status is pending_po
  useEffect(() => {
    if (gr?.status === 'pending_po') {
      setLoadingPos(true);
      fetch('/api/purchase-orders')
        .then(r => r.json())
        .then(res => {
          const activePos = (res.data || []).filter((po: any) => po.status === 'confirmed');
          setPos(activePos);
        })
        .finally(() => setLoadingPos(false));
    }
  }, [gr?.status]);

  const handleApproveTempGR = async () => {
    if (!selectedPoId) {
      alert('Vui lòng chọn một PO để liên kết!');
      return;
    }
    if (!gr) return;
    setIsLinking(true);
    try {
      // Step 1: Link PO
      const res1 = await fetch(`/api/goods-receipt/${gr.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link_po_id: selectedPoId }),
      });
      const result1 = await res1.json();
      if (!res1.ok) throw new Error(result1.error || 'Lỗi liên kết PO');
      
      // Step 2: Confirm receipt & update inventory
      const res2 = await fetch(`/api/goods-receipt/${gr.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm_receipt: true }),
      });
      const result2 = await res2.json();
      if (!res2.ok) throw new Error(result2.error || 'Lỗi duyệt nhập kho');

      setGr(result2.data);
      alert('Đã duyệt phiếu và cộng tồn kho thành công!');
    } catch (e: any) {
      alert(e.message || 'Có lỗi xảy ra');
    } finally {
      setIsLinking(false);
    }
  };

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
      <PageLayout title="Quản lý nhập hàng" icon={<PackageCheck size={16} className="text-indigo-500" />}>
        <div className="flex items-center justify-center py-20 text-gray-400">Đang tải...</div>
      </PageLayout>
    );
  }

  if (!gr) {
    return (
      <PageLayout title="Quản lý nhập hàng" icon={<PackageCheck size={16} className="text-indigo-500" />}>
        <div className="flex items-center justify-center py-20 text-red-400">Không tìm thấy phiếu.</div>
      </PageLayout>
    );
  }

  const actions = STATUS_ACTIONS[gr.status] || [];
  const poCode = (gr.purchase_order as unknown as Record<string, unknown> | undefined)?.po_code as string | undefined;

  return (
    <PageLayout title="Chi tiết Quản lý nhập hàng" icon={<PackageCheck size={16} className="text-indigo-500" />}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/receipt-management')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} />
            Danh sách phiếu nhập
          </button>
          
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-xl font-bold text-sm transition-colors shadow-sm"
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
                <span className="font-mono text-indigo-600">{gr.gr_code}</span>
              </h1>
              <div className="mt-3">
                <StatusTimeline 
                  steps={(gr.status === 'pending_po' || gr.status === 'pending_confirm') ? GR_TEMP_STEPS : GR_STEPS} 
                  current={gr.status} 
                />
              </div>
            </div>
            {/* Thu mua reviews it, so they also see the QR just in case, or can jump to PO */}
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
                <p className="text-[10px] font-bold uppercase text-gray-400">Người nhận (Kho)</p>
                <p className="text-sm font-semibold text-gray-800">{gr.received_by}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Đối chiếu hàng hóa</h2>
            {gr.status === 'completed' && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md">
                Đã sinh QR Kho (Mã Đám)
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-400">Mã SP</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-400">Tên SP</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-400">SL yêu cầu (PO)</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-400">SL thực nhận (Kho)</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase text-gray-400">Trạng thái đối chiếu</th>
                </tr>
              </thead>
              <tbody>
                {(gr.items || []).map((item) => {
                  const match = item.received_qty >= item.expected_qty;
                  return (
                    <tr key={item.id} className="border-b border-gray-50">
                      <td className="px-4 py-3 font-mono font-semibold text-indigo-600">{item.product_code}</td>
                      <td className="px-4 py-3">{item.product_name}</td>
                      <td className="px-4 py-3 text-right">{item.expected_qty}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{item.received_qty}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          match ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {match ? 'Khớp / Đủ' : 'Thiếu hàng'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Purchase/Admin: Approve Temporary GRPO */}
        {gr.status === 'pending_po' && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-xl">
                <LinkIcon size={20} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-blue-900">Duyệt phiếu nhập tạm (Thu mua)</h3>
                <p className="text-xs text-blue-700 mt-0.5">Liên kết với PO thực tế để hệ thống tự động đối chiếu và cộng tồn kho.</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <select
                  value={selectedPoId}
                  onChange={(e) => setSelectedPoId(e.target.value)}
                  disabled={loadingPos || isLinking}
                  className="w-full h-11 px-4 rounded-xl border border-blue-200 bg-white text-sm font-medium text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:opacity-60"
                >
                  <option value="">-- Chọn Đơn mua hàng (PO) --</option>
                  {pos.map(po => (
                    <option key={po.id} value={po.id}>
                      {po.po_code} - {po.supplier?.name || 'Không rõ NCC'}
                    </option>
                  ))}
                </select>
                {loadingPos && <p className="text-[10px] text-blue-500 mt-1.5 animate-pulse">Đang tải danh sách PO...</p>}
              </div>
              <button
                onClick={handleApproveTempGR}
                disabled={isLinking || !selectedPoId}
                className="h-11 px-6 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:hover:bg-blue-600 shadow-md shadow-blue-200 inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {isLinking ? (
                  <><Loader2 size={16} className="animate-spin" /> Đang xử lý…</>
                ) : (
                  <><CheckCircle size={16} /> Liên kết & Duyệt nhập kho</>
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-blue-200" /></div>
              <div className="relative flex justify-center"><span className="bg-blue-50 px-3 text-xs font-bold text-blue-400 uppercase tracking-widest">hoặc</span></div>
            </div>

            {/* Direct confirm without PO */}
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <div className="flex items-start gap-3 mb-3">
                <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-amber-800">Xác nhận trực tiếp (Không cần PO)</h4>
                  <p className="text-[11px] text-amber-700 mt-0.5">Cộng tồn kho ngay mà không cần liên kết PO. Chỉ dùng khi không có PO tương ứng.</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!confirm('⚠️ Xác nhận nhập kho KHÔNG CẦN PO?\n\nTồn kho sẽ được cộng ngay. Hành động này không thể hoàn tác.')) return;
                  setIsLinking(true);
                  try {
                    const res = await fetch(`/api/goods-receipt/${gr.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ confirm_without_po: true }),
                    });
                    const result = await res.json();
                    if (!res.ok) throw new Error(result.error || 'Lỗi xác nhận');
                    setGr(result.data);
                    alert('Đã xác nhận nhập kho trực tiếp thành công!');
                  } catch (e: any) {
                    alert(e.message || 'Có lỗi xảy ra');
                  } finally {
                    setIsLinking(false);
                  }
                }}
                disabled={isLinking}
                className="w-full h-10 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 transition-all disabled:opacity-50 shadow-md shadow-amber-200 inline-flex items-center justify-center gap-2"
              >
                {isLinking ? (
                  <><Loader2 size={14} className="animate-spin" /> Đang xử lý…</>
                ) : (
                  <>⚡ Xác nhận nhập kho (Không PO)</>
                )}
              </button>
            </div>
          </div>
        )}

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
