'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  PackageCheck, ArrowLeft, Warehouse as WarehouseIcon,
  Calendar, User, FileText, Printer, CheckCircle2,
  AlertTriangle, Save, QrCode
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import StatusTimeline, { GR_STEPS } from '@/components/StatusTimeline';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import type { GoodsReceipt, GoodsReceiptItem } from '@/types';

/* ────────────────────────────────────────────────────────────────
   Types
──────────────────────────────────────────────────────────────── */
interface EditableItem extends GoodsReceiptItem {
  _editQty: number;
  _dirty: boolean;
}

/* ────────────────────────────────────────────────────────────────
   Page
──────────────────────────────────────────────────────────────── */
export default function GoodsReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [gr, setGr] = useState<GoodsReceipt | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [generatedQRs, setGeneratedQRs] = useState<string[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetch(`/api/goods-receipt/${resolvedParams.id}`)
      .then((r) => r.json())
      .then((res) => {
        const data: GoodsReceipt = res.data;
        setGr(data);
        setItems(
          (data.items || []).map((item) => ({
            ...item,
            _editQty: item.received_qty,
            _dirty: false,
          }))
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [resolvedParams.id]);

  /* ── Save individual item qty ──────────────────────────────── */
  const handleSaveItems = async () => {
    const dirty = items.filter((i) => i._dirty);
    if (dirty.length === 0) { showToast('Không có thay đổi.', 'err'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/goods-receipt/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ update_items: dirty.map((i) => ({ id: i.id, received_qty: i._editQty })) }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setItems((prev) => prev.map((i) => ({ ...i, _dirty: false, received_qty: i._editQty })));
      showToast('Đã lưu số lượng nhận.', 'ok');
    } catch (err: unknown) {
      showToast(`Lỗi: ${err instanceof Error ? err.message : 'Unknown'}`, 'err');
    } finally {
      setSaving(false);
    }
  };

  /* ── Complete GR → triggers QR generation ──────────────────── */
  const handleComplete = async () => {
    if (!gr) return;
    if (items.some((i) => i._dirty)) {
      showToast('Hãy lưu thay đổi số lượng trước.', 'err');
      return;
    }
    setCompleting(true);
    try {
      const res = await fetch(`/api/goods-receipt/${gr.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setGr((prev) => prev ? { ...prev, status: 'completed' } : prev);
      if (result.qr_codes) setGeneratedQRs(result.qr_codes);
      showToast('Hoàn tất nhập kho! Mã QR lô hàng đã được tạo.', 'ok');
    } catch (err: unknown) {
      showToast(`Lỗi: ${err instanceof Error ? err.message : 'Unknown'}`, 'err');
    } finally {
      setCompleting(false);
    }
  };

  /* ── Other status change ───────────────────────────────────── */
  const handleStatusChange = async (nextStatus: string) => {
    if (!gr) return;
    try {
      const res = await fetch(`/api/goods-receipt/${gr.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await res.json();
      if (res.ok) setGr((prev) => prev ? { ...prev, status: result.data.status } : prev);
    } catch (err) { console.error(err); }
  };

  /* ── Loading / not found ───────────────────────────────────── */
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
  const isEditable = gr.status === 'pending' || gr.status === 'inspecting';
  const canComplete = gr.status === 'inspecting';
  const hasDirty = items.some((i) => i._dirty);
  const totalExpected = items.reduce((s, i) => s + i.expected_qty, 0);
  const totalReceived = items.reduce((s, i) => s + i._editQty, 0);
  const matchRate = totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0;

  return (
    <PageLayout title="Chi tiết phiếu nhập" icon={<PackageCheck size={16} className="text-orange-500" />}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Toast ──────────────────────────────────────────── */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-xl font-semibold text-sm flex items-center gap-2 transition-all
            ${toast.type === 'ok' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            {toast.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {toast.msg}
          </div>
        )}

        {/* ── Topbar ─────────────────────────────────────────── */}
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

        {/* ── Header card ────────────────────────────────────── */}
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

        {/* ── Items table — editable if pending/inspecting ──── */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Hàng hóa</h2>
            {isEditable && hasDirty && (
              <button
                onClick={handleSaveItems}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 disabled:opacity-50 shadow-sm transition-all"
              >
                <Save size={14} />
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-400">Mã SP</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-400">Tên SP</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-400">SL yêu cầu</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-400 min-w-[120px]">
                    SL thực nhận
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase text-gray-400">KQ</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const match = item._editQty >= item.expected_qty;
                  return (
                    <tr key={item.id} className={`border-b border-gray-50 ${item._dirty ? 'bg-orange-50/40' : ''}`}>
                      <td className="px-4 py-3 font-mono font-semibold text-orange-600 text-xs">{item.product_code}</td>
                      <td className="px-4 py-3 text-gray-800">{item.product_name}</td>
                      <td className="px-4 py-3 text-right font-medium">{item.expected_qty}</td>
                      <td className="px-4 py-3 text-right">
                        {isEditable ? (
                          <input
                            type="number"
                            min={0}
                            value={item._editQty}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setItems((prev) =>
                                prev.map((it, i) =>
                                  i === idx ? { ...it, _editQty: val, _dirty: val !== it.received_qty } : it
                                )
                              );
                            }}
                            className="w-24 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-right focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all"
                          />
                        ) : (
                          <span className="font-semibold">{item.received_qty}</span>
                        )}
                      </td>
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

        {/* ── Generated QR codes (after completion) ────────── */}
        {generatedQRs.length > 0 && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 space-y-3">
            <div className="flex items-center gap-2 text-emerald-700">
              <QrCode size={18} />
              <h2 className="font-bold text-sm uppercase tracking-wider">Mã QR lô hàng đã tạo</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {generatedQRs.map((code) => (
                <span key={code} className="px-3 py-1 bg-white border border-emerald-200 rounded-lg font-mono text-xs text-emerald-800 shadow-sm">
                  {code}
                </span>
              ))}
            </div>
            <p className="text-xs text-emerald-600">Các mã QR này hiện đang active trong kho — dùng để xuất hàng.</p>
          </div>
        )}

        {/* ── Action buttons ──────────────────────────────────── */}
        <div className="flex gap-3">
          {gr.status === 'pending' && (
            <button
              onClick={() => handleStatusChange('inspecting')}
              className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
            >
              Bắt đầu kiểm tra
            </button>
          )}
          {canComplete && (
            <>
              <button
                onClick={() => handleStatusChange('rejected')}
                className="py-3 px-5 rounded-xl font-bold text-sm text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200 transition-all"
              >
                Từ chối
              </button>
              <button
                onClick={handleComplete}
                disabled={completing || hasDirty}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                {completing ? 'Đang xử lý...' : 'Hoàn tất nhập kho & Tạo QR'}
              </button>
            </>
          )}
        </div>

      </div>
    </PageLayout>
  );
}
