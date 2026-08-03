'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  Infinity as InfinityIcon, Users, FileText, Search, RefreshCw, Download,
  Wallet, Coins, AlertCircle, CheckCircle2, X,
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { formatVnd } from '@/lib/normalize';
import { type KhttRecord } from '@/lib/khtt';

type Tab = 'khach-hang' | 'hop-dong';

function fmtDate(s: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString('vi-VN');
}

function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 flex items-center gap-4">
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${accent}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-lg sm:text-xl font-extrabold text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}

function TramTuoiContent() {
  const searchParams = useSearchParams();
  const initialTab: Tab = searchParams.get('view') === 'hop-dong' ? 'hop-dong' : 'khach-hang';

  const [tab, setTab] = useState<Tab>(initialTab);
  const [rows, setRows] = useState<KhttRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setTab(initialTab); }, [initialTab]);

  const showToast = useCallback((kind: 'ok' | 'err', msg: string) => {
    setToast({ kind, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/getfly-khtt', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Lỗi tải dữ liệu'); setRows([]); }
      else setRows(data.results || []);
    } catch {
      setError('Không thể kết nối máy chủ.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      // Đồng bộ Google Sheets → Supabase (KHTT lấy từ bảng Đơn Bán đã mirror).
      const res = await fetch('/api/crm/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) { showToast('err', data.error || 'Đồng bộ thất bại'); }
      else { showToast('ok', `Đồng bộ thành công (${data.total_records ?? 0} bản ghi)`); await load(); }
    } catch {
      showToast('err', 'Không thể kết nối nguồn dữ liệu.');
    } finally {
      setSyncing(false);
    }
  }, [load, showToast]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.customer_name, r.customer_phone, r.customer_code, r.order_code, r.beneficiary_name]
        .some((v) => String(v || '').toLowerCase().includes(q)),
    );
  }, [rows, query]);

  const totals = useMemo(() => ({
    count: filtered.length,
    value: filtered.reduce((s, r) => s + (r.total_value || 0), 0),
    remaining: filtered.reduce((s, r) => s + (r.remaining_amount || 0), 0),
  }), [filtered]);

  function exportExcel() {
    const data = filtered.map((r) => ({
      'Họ tên': r.customer_name || '',
      'SĐT': r.customer_phone || '',
      'Mã khách hàng': r.customer_code || '',
      'Mã đơn / HĐ nền': r.order_code || '',
      'Gói sử dụng': r.package_name || '',
      'Tổng giá trị gói': r.total_value || 0,
      'Đã thanh toán': r.paid_amount || 0,
      'Số tiền còn lại': r.remaining_amount || 0,
      'Ngày đặt hàng': r.order_date || '',
      'Người thụ hưởng': r.beneficiary_name || '',
      'SĐT người thụ hưởng': r.beneficiary_phone || '',
      'Trạng thái': r.order_status || '',
      'Người phụ trách': r.person_in_charge || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'KHTT');
    XLSX.writeFile(wb, `KHTT_TramTuoi_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'khach-hang', label: 'Khách Hàng', icon: <Users size={15} /> },
    { key: 'hop-dong', label: 'Quản lý hợp đồng', icon: <FileText size={15} /> },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 flex items-center gap-2">
            <InfinityIcon size={20} className="text-amber-500" /> Khách Hàng Trăm Tuổi
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Hợp đồng nền Trăm Tuổi đang <strong>Chờ duyệt</strong> — đồng bộ từ GetFly CRM.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportExcel}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-40"
          >
            <Download size={15} /> Xuất Excel
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-sm font-bold shadow hover:shadow-md transition-all disabled:opacity-60"
          >
            <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Đang đồng bộ...' : 'Đồng bộ GetFly'}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border ${
          toast.kind === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          {toast.kind === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span className="flex-1">{toast.msg}</span>
          <button onClick={() => setToast(null)}><X size={15} /></button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <KpiCard icon={<Users size={20} className="text-amber-600" />} accent="bg-amber-100" label="Số khách hàng" value={String(totals.count)} />
        <KpiCard icon={<Wallet size={20} className="text-blue-600" />} accent="bg-blue-100" label="Tổng giá trị gói" value={formatVnd(totals.value)} />
        <KpiCard icon={<Coins size={20} className="text-rose-600" />} accent="bg-rose-100" label="Tổng còn lại" value={formatVnd(totals.remaining)} />
      </div>

      {/* Tabs + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1.5 w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                tab === t.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Lọc theo tên, SĐT, mã KH, mã đơn..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400 text-sm">
          <RefreshCw size={22} className="animate-spin mx-auto mb-3 text-gray-300" /> Đang tải dữ liệu...
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm font-semibold text-red-600">
          <AlertCircle size={15} /> {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <InfinityIcon size={28} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            {rows.length === 0
              ? 'Chưa có dữ liệu. Bấm “Đồng bộ GetFly” để tải hợp đồng Trăm Tuổi.'
              : 'Không có kết quả khớp bộ lọc.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wide text-left">
                  {tab === 'khach-hang' ? (
                    <>
                      <th className="px-4 py-3 font-bold">Họ tên</th>
                      <th className="px-4 py-3 font-bold">SĐT</th>
                      <th className="px-4 py-3 font-bold">Mã KH</th>
                      <th className="px-4 py-3 font-bold">Gói sử dụng</th>
                      <th className="px-4 py-3 font-bold text-right">Tổng giá trị</th>
                      <th className="px-4 py-3 font-bold text-right">Còn lại</th>
                      <th className="px-4 py-3 font-bold">Ngày đặt</th>
                      <th className="px-4 py-3 font-bold">Người thụ hưởng</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 font-bold">Mã HĐ nền</th>
                      <th className="px-4 py-3 font-bold">Họ tên</th>
                      <th className="px-4 py-3 font-bold">Gói nền</th>
                      <th className="px-4 py-3 font-bold text-right">Tổng giá trị</th>
                      <th className="px-4 py-3 font-bold text-right">Đã đóng</th>
                      <th className="px-4 py-3 font-bold text-right">Còn lại</th>
                      <th className="px-4 py-3 font-bold">Trạng thái</th>
                      <th className="px-4 py-3 font-bold">Người thụ hưởng</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((r) => (
                  <tr key={r.getfly_order_id} className="hover:bg-amber-50/40 transition-colors">
                    {tab === 'khach-hang' ? (
                      <>
                        <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">{r.customer_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap font-mono">{r.customer_phone || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap font-mono">{r.customer_code || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{r.package_name || '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800 whitespace-nowrap">{formatVnd(r.total_value)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-rose-600 whitespace-nowrap">{formatVnd(r.remaining_amount)}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(r.order_date)}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {r.beneficiary_name || '—'}
                          {r.beneficiary_phone && <span className="text-gray-400 text-xs block">{r.beneficiary_phone}</span>}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-mono font-bold text-gray-900 whitespace-nowrap">{r.order_code || '—'}</td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{r.customer_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{r.package_name || '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800 whitespace-nowrap">{formatVnd(r.total_value)}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 whitespace-nowrap">{formatVnd(r.paid_amount)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-rose-600 whitespace-nowrap">{formatVnd(r.remaining_amount)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                            {r.order_status || 'Chờ duyệt'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {r.beneficiary_name || '—'}
                          {r.beneficiary_phone && <span className="text-gray-400 text-xs block">{r.beneficiary_phone}</span>}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TramTuoiPage() {
  return (
    <PageLayout title="Khách Hàng Trăm Tuổi" icon={<InfinityIcon size={15} className="text-amber-500" />}>
      <Suspense fallback={<div className="p-10 text-center text-gray-400 text-sm">Đang tải...</div>}>
        <TramTuoiContent />
      </Suspense>
    </PageLayout>
  );
}
