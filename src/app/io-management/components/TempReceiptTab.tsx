'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { PackageOpen, CheckCircle, XCircle, Clock, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { getWarehouseFilter } from '@/config/roles.config';

interface TempReceipt {
  id: string;
  gr_code: string;
  warehouse?: { name: string } | null;
  status: string;
  note: string;
  received_by: string;
  received_date: string;
  created_at: string;
  is_missing_goods?: boolean;
}

interface TempReceiptItem {
  id: string;
  product_code: string;
  product_name: string;
  expected_qty: number;
  received_qty: number;
  note: string;
}

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

export default function TempReceiptTab() {
  const [receipts, setReceipts] = useState<TempReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<TempReceiptItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');

  const fetchReceipts = useCallback(() => {
    setLoading(true);
    fetch('/api/goods-receipt')
      .then((r) => r.json())
      .then((res) => {
        let data = (res.data || []) as TempReceipt[];

        try {
          const auth = localStorage.getItem('auth_user');
          if (auth) {
            const user = JSON.parse(auth);
            setUserRole(user.role || '');
            const wFilter = getWarehouseFilter(user.email);
            if (wFilter) {
              data = data.filter((item) => item.warehouse?.name?.includes(wFilter));
            }
          }
        } catch (e) { console.error(e); }

        // Only show temp receipts (pending_approval, pending_po, pending_confirm)
        const tempStatuses = ['pending_approval', 'pending_po', 'pending_confirm'];
        const tempReceipts = data.filter((r) => tempStatuses.includes(r.status));
        setReceipts(tempReceipts);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedItems([]);
      return;
    }
    setExpandedId(id);
    setLoadingItems(true);
    try {
      const res = await fetch(`/api/goods-receipt/${id}`);
      const json = await res.json();
      setExpandedItems(json.data?.items || []);
    } catch {
      setExpandedItems([]);
    }
    setLoadingItems(false);
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Bạn có chắc chắn DUYỆT NHẬN phiếu nhập tạm này?\nHệ thống sẽ tự tạo PO tương ứng.')) return;
    setActionLoading(id);
    try {
      const auth = localStorage.getItem('auth_user');
      const user = auth ? JSON.parse(auth) : {};
      const res = await fetch(`/api/goods-receipt/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve_receipt: true, approved_by: user.email || '' }),
      });
      const json = await res.json();
      if (res.ok) {
        alert(`✅ ${json.message || 'Duyệt thành công!'}\n${json.po_code ? `PO: ${json.po_code}` : ''}`);
        fetchReceipts();
      } else {
        alert(`❌ ${json.error || 'Lỗi duyệt phiếu.'}`);
      }
    } catch (err) {
      alert('Lỗi kết nối.');
    }
    setActionLoading(null);
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      const auth = localStorage.getItem('auth_user');
      const user = auth ? JSON.parse(auth) : {};
      const res = await fetch(`/api/goods-receipt/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reject_receipt: true, reject_reason: rejectReason, approved_by: user.email || '' }),
      });
      const json = await res.json();
      if (res.ok) {
        alert(`✅ ${json.message || 'Đã hủy phiếu. Tồn kho đã trả lại.'}`);
        setShowRejectDialog(null);
        setRejectReason('');
        fetchReceipts();
      } else {
        alert(`❌ ${json.error || 'Lỗi hủy phiếu.'}`);
      }
    } catch (err) {
      alert('Lỗi kết nối.');
    }
    setActionLoading(null);
  };

  const pendingCount = receipts.filter((r) => r.status === 'pending_approval').length;
  const otherCount = receipts.filter((r) => r.status !== 'pending_approval').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><Clock size={12} /> Chờ duyệt</span>;
      case 'pending_po':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><Clock size={12} /> Chờ PO</span>;
      case 'pending_confirm':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"><Clock size={12} /> Chờ xác nhận</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600">{status}</span>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Quản lý phiếu nhập tạm</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Duyệt nhận hoặc hủy các phiếu nhập tạm từ kho. Hàng đã vào kho (treo) — có thể xuất được.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          label="Tổng phiếu tạm" value={receipts.length}
          icon={<PackageOpen size={20} />}
          color="text-amber-600" bg="bg-amber-50 dark:bg-amber-900/20" border="border-amber-100 dark:border-amber-800/30"
        />
        <StatCard
          label="Chờ duyệt" value={pendingCount}
          icon={<Clock size={20} />}
          color="text-orange-600" bg="bg-orange-50 dark:bg-orange-900/20" border="border-orange-100 dark:border-orange-800/30"
        />
        <StatCard
          label="Trạng thái khác" value={otherCount}
          icon={<Eye size={20} />}
          color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" border="border-blue-100 dark:border-blue-800/30"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
      ) : receipts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <PackageOpen size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold">Không có phiếu nhập tạm nào</p>
          <p className="text-sm mt-1">Tất cả phiếu đã được xử lý.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-600">
                  <th className="text-left px-4 py-3 font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Mã phiếu</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Kho nhận</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Người nhận</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Trạng thái</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Ngày nhận</th>
                  <th className="text-center px-4 py-3 font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((receipt) => (
                  <Fragment key={receipt.id}>
                    <tr
                      className={`border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer ${
                        expandedId === receipt.id ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''
                      }`}
                      onClick={() => toggleExpand(receipt.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {expandedId === receipt.id ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                          <span className="font-bold text-gray-900 dark:text-white">{receipt.gr_code}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{receipt.warehouse?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{receipt.received_by || '—'}</td>
                      <td className="px-4 py-3">{getStatusBadge(receipt.status)}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{receipt.received_date || '—'}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {receipt.status === 'pending_approval' && (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleApprove(receipt.id)}
                              disabled={actionLoading === receipt.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors shadow-sm"
                            >
                              <CheckCircle size={13} />
                              {actionLoading === receipt.id ? '...' : 'Duyệt nhận'}
                            </button>
                            {userRole === 'admin' && (
                              <button
                                onClick={() => { setShowRejectDialog(receipt.id); setRejectReason(''); }}
                                disabled={actionLoading === receipt.id}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors shadow-sm"
                              >
                                <XCircle size={13} />
                                Hủy
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* Expanded items */}
                    {expandedId === receipt.id && (
                      <tr key={`${receipt.id}-items`}>
                        <td colSpan={6} className="px-0 py-0">
                          <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-gray-100 dark:border-slate-700">
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">Chi tiết hàng hóa</p>
                            {receipt.note && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 italic">📝 {receipt.note}</p>
                            )}
                            {loadingItems ? (
                              <div className="flex items-center gap-2 py-3 text-gray-400">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" /> Đang tải...
                              </div>
                            ) : expandedItems.length === 0 ? (
                              <p className="text-gray-400 text-xs">Không có chi tiết hàng hóa.</p>
                            ) : (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-gray-400 dark:text-gray-500">
                                    <th className="text-left py-2 pr-4 font-semibold">Mã SP</th>
                                    <th className="text-left py-2 pr-4 font-semibold">Tên sản phẩm</th>
                                    <th className="text-center py-2 pr-4 font-semibold">SL yêu cầu</th>
                                    <th className="text-center py-2 pr-4 font-semibold">SL thực nhận</th>
                                    <th className="text-left py-2 font-semibold">Ghi chú</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {expandedItems.map((item) => (
                                    <tr key={item.id} className="border-t border-gray-100 dark:border-slate-700/50">
                                      <td className="py-2 pr-4 font-mono font-bold text-gray-700 dark:text-gray-300">{item.product_code}</td>
                                      <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">{item.product_name}</td>
                                      <td className="py-2 pr-4 text-center text-gray-500">{item.expected_qty}</td>
                                      <td className="py-2 pr-4 text-center font-bold text-gray-900 dark:text-white">{item.received_qty}</td>
                                      <td className="py-2 text-gray-400">{item.note || '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <XCircle size={20} className="text-red-500" />
              Hủy phiếu nhập tạm
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ⚠️ Hàng đã cộng vào kho sẽ được <strong>trừ lại tự động</strong>.
            </p>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Lý do hủy (không bắt buộc)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="VD: Hàng không đúng chất lượng, không đúng đơn..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 dark:text-white resize-none"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setShowRejectDialog(null); setRejectReason(''); }}
                className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={() => handleReject(showRejectDialog)}
                disabled={actionLoading === showRejectDialog}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors shadow-sm"
              >
                {actionLoading === showRejectDialog ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
