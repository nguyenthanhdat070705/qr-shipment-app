'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  PackageCheck, ArrowLeft, Warehouse as WarehouseIcon,
  Calendar, User, FileText, Printer, CheckCircle2,
  AlertTriangle, XCircle, Loader2, ShieldAlert, Link, CheckCircle
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import StatusTimeline, { GR_STEPS } from '@/components/StatusTimeline';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import type { GoodsReceipt, PurchaseOrder } from '@/types';

export default function GoodsReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [gr, setGr] = useState<GoodsReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // States for linking PO
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [selectedPoId, setSelectedPoId] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [loadingPos, setLoadingPos] = useState(false);

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

  // Check if user is admin
  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        setIsAdmin(u.vai_tro === 'admin');
      }
    } catch { /* ignore */ }
  }, []);

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

  const handleApproveGR = async () => {
    if (!selectedPoId) {
      showToast('Vui lòng chọn một PO để liên kết!', 'err');
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
      showToast('Đã duyệt phiếu và cộng tồn kho thành công!', 'ok');
    } catch (e: any) {
      showToast(e.message || 'Có lỗi xảy ra', 'err');
    } finally {
      setIsLinking(false);
    }
  };

  // Cancel GRPO handler
  const handleCancelGR = async () => {
    if (!gr) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/goods-receipt/${gr.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      const result = await res.json();
      if (!res.ok) {
        showToast(result.error || 'Hủy phiếu thất bại!', 'err');
      } else {
        showToast('Đã hủy phiếu nhập và trừ tồn kho thành công!', 'ok');
        setGr({ ...gr, status: 'cancelled' });
      }
    } catch {
      showToast('Lỗi kết nối mạng.', 'err');
    } finally {
      setCancelling(false);
      setShowCancelConfirm(false);
    }
  };

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
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 left-4 sm:left-auto z-50 px-4 sm:px-5 py-3 rounded-2xl shadow-xl font-semibold text-sm flex items-center gap-2 transition-all
            ${toast.type === 'ok' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            {toast.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {toast.msg}
          </div>
        )}

        {/* Topbar */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => router.push('/goods-receipt')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors min-h-[40px]"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Danh sách phiếu nhập</span>
            <span className="sm:hidden">Quay lại</span>
          </button>
          <button
            onClick={() => window.open(`/goods-receipt/${resolvedParams.id}/print`, '_blank')}
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 min-h-[40px] bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-xl font-bold text-sm transition-colors shadow-sm"
          >
            <Printer size={16} />
            In phiếu
          </button>
        </div>

        {/* Header card */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">
                <span className="font-mono text-orange-600 break-all">{gr.gr_code}</span>
              </h1>
              <div className="mt-3">
                <StatusTimeline steps={GR_STEPS} current={gr.status} />
              </div>
            </div>
            <div className="flex-shrink-0 self-start">
              <QRCodeGenerator type="grpo" id={gr.id} code={gr.gr_code} size={100} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-100">
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
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Hàng hóa</h2>
          </div>
          {/* Mobile: card list */}
          <div className="sm:hidden divide-y divide-gray-100">
            {items.map((item) => {
              const match = item.received_qty >= item.expected_qty;
              return (
                <div key={item.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono font-bold text-orange-600 text-xs break-all">{item.product_code}</p>
                      <p className="text-sm text-gray-800 mt-0.5 break-words">{item.product_name}</p>
                    </div>
                    <span className={`flex-shrink-0 inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      match ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {match ? '✓ Đủ' : '⚠ Thiếu'}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-gray-500">
                    <span>Yêu cầu: <span className="font-semibold text-gray-700">{item.expected_qty}</span></span>
                    <span>Thực nhận: <span className="font-semibold text-gray-900">{item.received_qty}</span></span>
                  </div>
                </div>
              );
            })}
            {items.length === 0 && (
              <p className="px-4 py-6 text-center text-gray-400 text-sm">Chưa có hàng hóa trong phiếu này.</p>
            )}
          </div>
          {/* Desktop: table */}
          <div className="hidden sm:block overflow-x-auto">
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

        {/* Purchase/Admin: Approve Temporary GRPO */}
        {gr.status === 'pending_po' && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 sm:p-6 shadow-sm">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-xl flex-shrink-0">
                <Link size={20} className="text-blue-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-blue-900">Duyệt phiếu nhập tạm (Dành cho Thu mua)</h3>
                <p className="text-xs text-blue-700 mt-0.5">Liên kết với PO thực tế để hệ thống tự động đối chiếu và cộng tồn kho.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <select
                  value={selectedPoId}
                  onChange={(e) => setSelectedPoId(e.target.value)}
                  disabled={loadingPos || isLinking}
                  className="w-full h-11 min-h-[44px] px-4 rounded-xl border border-blue-200 bg-white text-sm font-medium text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:opacity-60"
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
                onClick={handleApproveGR}
                disabled={isLinking || !selectedPoId}
                className="h-11 min-h-[44px] w-full sm:w-auto px-6 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:hover:bg-blue-600 shadow-md shadow-blue-200 inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {isLinking ? (
                  <><Loader2 size={16} className="animate-spin" /> Đang xử lý…</>
                ) : (
                  <><CheckCircle size={16} /> Liên kết & Duyệt nhập kho</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Admin-only: Cancel GRPO */}
        {isAdmin && gr.status !== 'cancelled' && (
          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <ShieldAlert size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-red-800">Hủy phiếu nhập hàng</p>
                  <p className="text-xs text-red-600">Tồn kho sẽ tự động trừ theo số lượng đã nhận. Chỉ Admin mới thấy chức năng này.</p>
                </div>
              </div>
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[44px] w-full sm:w-auto bg-red-600 text-white hover:bg-red-700 rounded-xl font-bold text-sm transition-colors shadow-sm"
              >
                <XCircle size={16} />
                Hủy phiếu
              </button>
            </div>
          </div>
        )}

        {gr.status === 'cancelled' && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-5">
            <div className="flex items-center gap-3">
              <XCircle size={20} className="text-red-500" />
              <div>
                <p className="text-sm font-bold text-red-800">Phiếu đã bị hủy</p>
                <p className="text-xs text-red-600">Tồn kho đã được trừ tương ứng.</p>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Confirmation Modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md sm:mx-4 overflow-hidden safe-bottom">
              <div className="bg-red-50 p-4 sm:p-5 border-b border-red-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-xl flex-shrink-0">
                    <AlertTriangle size={24} className="text-red-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-red-900 text-base sm:text-lg">Xác nhận hủy phiếu</h3>
                    <p className="text-xs sm:text-sm text-red-600 mt-0.5">Hành động này không thể hoàn tác</p>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-sm text-gray-700">
                  Bạn có chắc muốn hủy phiếu nhập <strong className="text-orange-600 font-mono break-all">{gr.gr_code}</strong>?
                </p>
                <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-xs text-amber-800 font-semibold">⚠️ Lưu ý:</p>
                  <ul className="text-xs text-amber-700 mt-1 space-y-0.5 list-disc list-inside">
                    <li>Tồn kho sẽ tự động giảm theo SL đã nhận</li>
                    <li>Không thể phục hồi phiếu sau khi hủy</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-2 sm:gap-3 p-4 sm:p-5 pt-0">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={cancelling}
                  className="flex-1 py-2.5 min-h-[44px] rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Quay lại
                </button>
                <button
                  onClick={handleCancelGR}
                  disabled={cancelling}
                  className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {cancelling ? (
                    <><Loader2 size={16} className="animate-spin" /> Đang hủy…</>
                  ) : (
                    <><XCircle size={16} /> Xác nhận hủy</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </PageLayout>
  );
}
