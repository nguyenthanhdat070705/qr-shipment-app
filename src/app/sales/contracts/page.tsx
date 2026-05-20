'use client';
import { useState, useEffect, useCallback } from 'react';
import PageLayout from '@/components/PageLayout';
import {
  FileText, Search, ChevronLeft, ChevronRight, RefreshCw, Download,
  CheckCircle, Database, Phone, Mail, MapPin, User, Calendar,
  DollarSign, Eye, X, Clock, ExternalLink, Filter
} from 'lucide-react';

interface Contract {
  id: string;
  getfly_contract_id: string;
  contract_name: string | null;
  contract_code: string | null;
  source_contract_code: string | null;
  contract_status: string | null;
  contract_status_code: string | null;
  contract_type: string | null;
  remaining_days: number | null;
  created_date: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  person_in_charge: string | null;
  contract_value: number;
  actual_value: number;
  executed_amount: number;
  paid_amount: number;
  debt_amount: number;
  beneficiary_name_1: string | null;
  beneficiary_vneid_1: string | null;
  beneficiary_phone_1: string | null;
  beneficiary_address_1: string | null;
  beneficiary_name_2: string | null;
  beneficiary_vneid_2: string | null;
  beneficiary_phone_2: string | null;
  beneficiary_address_2: string | null;
  buyer_email: string | null;
  synced_at: string;
}

type StatusFilter = 'all' | string;

const STATUS_TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'Chờ duyệt', label: 'Chờ duyệt' },
  { id: 'Đã duyệt', label: 'Đã duyệt' },
  { id: 'Đã gia hạn', label: 'Đã gia hạn' },
  { id: 'Đang thực hiện', label: 'Đang thực hiện' },
  { id: 'Đã hoàn thành', label: 'Đã hoàn thành' },
  { id: 'Tự động gia hạn lần 1', label: 'Tự động gia hạn lần 1' },
  { id: 'Đã kết thúc', label: 'Đã kết thúc' },
  { id: 'Đã hủy', label: 'Đã hủy' },
];

function fmtVND(n: number): string {
  if (!n) return '0';
  return new Intl.NumberFormat('vi-VN').format(n);
}

function statusBadge(s: string | null) {
  const v = (s || '').toLowerCase();
  if (v.includes('duyệt') && !v.includes('chờ')) return 'bg-emerald-100 text-emerald-700';
  if (v.includes('hoàn thành')) return 'bg-blue-100 text-blue-700';
  if (v.includes('chờ')) return 'bg-amber-100 text-amber-700';
  if (v.includes('thực hiện')) return 'bg-sky-100 text-sky-700';
  if (v.includes('gia hạn')) return 'bg-violet-100 text-violet-700';
  if (v.includes('kết thúc')) return 'bg-gray-100 text-gray-600';
  if (v.includes('hủy')) return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{success?:boolean;synced?:number;message?:string;error?:string}|null>(null);
  const [selected, setSelected] = useState<Contract|null>(null);
  const [lastSync, setLastSync] = useState<string|null>(null);
  const perPage = 20;

  const loadContracts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), per_page: String(perPage),
      });
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/getfly-contracts?${params}`);
      const d = await res.json();
      setContracts(d.records || []);
      setTotal(d.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  const loadSyncInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/sync-getfly-contracts');
      const d = await res.json();
      setLastSync(d.last_sync || null);
      if (!total) setTotal(d.synced_count || 0);
    } catch {}
  }, []);

  useEffect(() => { loadSyncInfo(); }, []);
  useEffect(() => { loadContracts(); }, [loadContracts]);

  async function handleSync() {
    setSyncing(true); setSyncResult(null);
    try {
      const res = await fetch('/api/sync-getfly-contracts', { method: 'POST' });
      const data = await res.json();
      setSyncResult(data);
      if (data.success) { loadContracts(); loadSyncInfo(); }
    } catch (err) { setSyncResult({ error: String(err) }); }
    finally { setSyncing(false); }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault(); setPage(1); setSearch(searchInput);
  }

  const totalPages = Math.ceil(total / perPage);

  // Totals for current page
  const totalContractValue = contracts.reduce((s, c) => s + (c.contract_value || 0), 0);
  const totalPaid = contracts.reduce((s, c) => s + (c.paid_amount || 0), 0);
  const totalDebt = contracts.reduce((s, c) => s + (c.debt_amount || 0), 0);

  return (
    <PageLayout title="Quản lý hợp đồng bán" icon={<FileText size={18} className="text-indigo-500" />}>
      <div className="space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-gray-900">Quản lý hợp đồng bán</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Dữ liệu sync từ GetFly CRM
              {lastSync && <span className="text-violet-500 block sm:inline"> · Lần cuối: {new Date(lastSync).toLocaleString('vi-VN')}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleSync} disabled={syncing}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-all shadow-sm min-h-[40px]">
              {syncing ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
              {syncing ? 'Đang sync...' : 'Sync từ GetFly'}
            </button>
            <a href="https://blackstonesdvtl.getflycrm.com" target="_blank" rel="noopener noreferrer"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all min-h-[40px]">
              <ExternalLink size={14} /> Mở GetFly
            </a>
          </div>
        </div>

        {/* Sync result banner */}
        {syncResult && (
          <div className={`px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${
            syncResult.error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
          }`}>
            {syncResult.error ? '⚠️' : <CheckCircle size={16} />}
            {syncResult.error || syncResult.message || `Đã sync ${syncResult.synced} hợp đồng`}
            <button onClick={() => setSyncResult(null)} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Info bar */}
        <div className="flex items-center justify-between gap-2 bg-indigo-50 border border-indigo-100 rounded-2xl px-3 sm:px-5 py-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
            <Database size={16} className="text-indigo-500 flex-shrink-0" />
            <span className="font-bold text-indigo-800 truncate">{total.toLocaleString()} HĐ đã sync</span>
          </div>
          <span className="text-[10px] sm:text-xs text-indigo-400 hidden sm:inline">Dữ liệu lưu trong Supabase</span>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
          {STATUS_TABS.map(tab => (
            <button key={tab.id} onClick={() => { setStatusFilter(tab.id); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              placeholder="Tìm tên HĐ, số HĐ hoặc SĐT..."
              value={searchInput} onChange={e => setSearchInput(e.target.value)} />
          </div>
          <button type="submit" className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all min-h-[44px]">Tìm</button>
        </form>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {total === 0 && !loading ? (
            <div className="py-16 text-center">
              <FileText size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="font-semibold text-gray-500">Chưa có dữ liệu hợp đồng</p>
              <p className="text-sm text-gray-400 mt-1">Nhấn nút <strong>"Sync từ GetFly"</strong> để tải dữ liệu về</p>
            </div>
          ) : (
            <>
              {/* Mobile: Card list */}
              <div className="lg:hidden divide-y divide-gray-50">
                {loading ? (
                  <div className="py-12 text-center">
                    <RefreshCw size={24} className="mx-auto mb-2 text-gray-300 animate-spin" />
                    <p className="text-sm text-gray-400">Đang tải...</p>
                  </div>
                ) : contracts.map(c => {
                  const remain = c.remaining_days;
                  return (
                    <button key={c.id} onClick={() => setSelected(c)}
                      className="w-full px-4 py-3.5 hover:bg-indigo-50/30 transition-colors text-left">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm truncate">{c.contract_name || '—'}</p>
                          <p className="font-mono text-[11px] text-indigo-700 font-semibold mt-0.5">{c.contract_code || '—'}</p>
                        </div>
                        {remain !== null && remain !== undefined && (
                          <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            remain < 0 ? 'bg-red-100 text-red-700' : remain < 90 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>{remain}d</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {c.contract_status && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadge(c.contract_status)}`}>
                            {c.contract_status}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-gray-500 mb-2">
                        <div className="truncate"><span className="text-gray-400">KH:</span> <span className="text-gray-700 font-medium">{c.customer_name || '—'}</span></div>
                        <div className="truncate"><span className="text-gray-400">PT:</span> <span className="text-gray-700">{c.person_in_charge || '—'}</span></div>
                        <div className="truncate"><span className="text-gray-400">SĐT:</span> <span className="font-mono text-gray-600">{c.customer_phone || '—'}</span></div>
                        <div className="truncate"><span className="text-gray-400">Ngày tạo:</span> <span className="text-gray-600">{c.created_date || '—'}</span></div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                        <div>
                          <p className="text-[9px] text-gray-400 uppercase">GT HĐ</p>
                          <p className="text-xs font-bold text-indigo-600">{c.contract_value ? fmtVND(c.contract_value) : '—'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-400 uppercase">Đã TT</p>
                          <p className="text-xs font-semibold text-emerald-600">{c.paid_amount ? fmtVND(c.paid_amount) : '0'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-400 uppercase">Công nợ</p>
                          <p className="text-xs font-bold text-red-600">{c.debt_amount ? fmtVND(c.debt_amount) : '0'}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Desktop: Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-3 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">Ngày còn lại</th>
                      <th className="text-left px-3 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">Tên hợp đồng</th>
                      <th className="text-left px-3 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">Số HĐ</th>
                      <th className="text-left px-3 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">Trạng thái</th>
                      <th className="text-left px-3 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">Kiểu</th>
                      <th className="text-left px-3 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">Ngày tạo</th>
                      <th className="text-left px-3 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">Hiệu lực</th>
                      <th className="text-left px-3 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">Hết hiệu lực</th>
                      <th className="text-left px-3 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">Khách hàng</th>
                      <th className="text-left px-3 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">SĐT KH</th>
                      <th className="text-left px-3 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">Phụ trách</th>
                      <th className="text-right px-3 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">GT HĐ</th>
                      <th className="text-right px-3 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">GT Thực</th>
                      <th className="text-right px-3 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">Đã TH</th>
                      <th className="text-right px-3 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">Đã TT</th>
                      <th className="text-right px-3 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">Công nợ</th>
                      <th className="text-left px-3 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">Người TH 1</th>
                      <th className="text-left px-3 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">VnEID TH 1</th>
                      <th className="text-left px-3 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">Người TH 2</th>
                      <th className="text-left px-3 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">VnEID TH 2</th>
                      <th className="text-left px-3 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">Email người mua</th>
                      <th className="text-left px-3 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">SĐT TH 1</th>
                      <th className="text-left px-3 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">SĐT TH 2</th>
                      <th className="text-left px-3 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">Địa chỉ TH 1</th>
                      <th className="text-left px-3 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">Địa chỉ TH 2</th>
                      <th className="text-center px-3 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading ? (
                      <tr><td colSpan={26} className="py-12 text-center">
                        <RefreshCw size={24} className="mx-auto mb-2 text-gray-300 animate-spin" />
                        <p className="text-sm text-gray-400">Đang tải...</p>
                      </td></tr>
                    ) : contracts.map(c => {
                      const remain = c.remaining_days;
                      return (
                        <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors group">
                          <td className="px-3 py-2.5 text-center">
                            {remain !== null && remain !== undefined ? (
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                remain < 0 ? 'bg-red-100 text-red-700' : remain < 90 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>{remain}</span>
                            ) : '—'}
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="font-semibold text-gray-800 text-xs truncate max-w-[180px]">{c.contract_name || '—'}</p>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs text-indigo-700 font-semibold">{c.contract_code || '—'}</td>
                          <td className="px-3 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadge(c.contract_status)}`}>
                              {c.contract_status || '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-500">{c.contract_type || '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-500">{c.created_date || '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-500">{c.effective_date || '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-500">{c.expiry_date || '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-700 font-medium truncate max-w-[120px]">{c.customer_name || '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-600 font-mono">{c.customer_phone || '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-500">{c.person_in_charge || '—'}</td>
                          <td className="px-3 py-2.5 text-right text-xs font-bold text-indigo-600">{c.contract_value ? fmtVND(c.contract_value) : '—'}</td>
                          <td className="px-3 py-2.5 text-right text-xs font-bold text-emerald-600">{c.actual_value ? fmtVND(c.actual_value) : '—'}</td>
                          <td className="px-3 py-2.5 text-right text-xs text-gray-600">{c.executed_amount ? fmtVND(c.executed_amount) : '0'}</td>
                          <td className="px-3 py-2.5 text-right text-xs text-emerald-600">{c.paid_amount ? fmtVND(c.paid_amount) : '0'}</td>
                          <td className="px-3 py-2.5 text-right text-xs text-red-600 font-semibold">{c.debt_amount ? fmtVND(c.debt_amount) : '0'}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-600 min-w-[140px]">{c.beneficiary_name_1 || '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-600 min-w-[140px]">{c.beneficiary_vneid_1 || '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-600 min-w-[140px]">{c.beneficiary_name_2 || '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-600 min-w-[140px]">{c.beneficiary_vneid_2 || '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-600 min-w-[180px]">{c.buyer_email || '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-600 font-mono">{c.beneficiary_phone_1 || '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-600 font-mono">{c.beneficiary_phone_2 || '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-600 min-w-[220px]">{c.beneficiary_address_1 || '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-600 min-w-[220px]">{c.beneficiary_address_2 || '—'}</td>
                          <td className="px-3 py-2.5 text-center">
                            <button onClick={() => setSelected(c)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-semibold hover:bg-indigo-100 transition-all opacity-0 group-hover:opacity-100">
                              <Eye size={12} /> Chi tiết
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Totals row */}
                  {!loading && contracts.length > 0 && (
                    <tfoot>
                      <tr className="bg-gray-50 border-t-2 border-gray-200">
                        <td colSpan={11} className="px-3 py-2.5 text-right text-xs font-bold text-gray-600">Tổng trang này:</td>
                        <td className="px-3 py-2.5 text-right text-xs font-extrabold text-indigo-700">{fmtVND(totalContractValue)}</td>
                        <td className="px-3 py-2.5"></td>
                        <td className="px-3 py-2.5"></td>
                        <td className="px-3 py-2.5 text-right text-xs font-extrabold text-emerald-700">{fmtVND(totalPaid)}</td>
                        <td className="px-3 py-2.5 text-right text-xs font-extrabold text-red-700">{fmtVND(totalDebt)}</td>
                        <td colSpan={9}></td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                <span className="text-xs text-gray-500">{total.toLocaleString()} hợp đồng · Trang {page}/{totalPages || 1}</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page<=1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-white disabled:opacity-30 transition-all">
                    <ChevronLeft size={14} /> Trước
                  </button>
                  <button onClick={() => setPage(p => p+1)} disabled={page>=totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-white disabled:opacity-30 transition-all">
                    Sau <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Detail Modal */}
        {selected && <ContractDetailModal contract={selected} onClose={() => setSelected(null)} />}
      </div>
    </PageLayout>
  );
}

function ContractDetailModal({ contract: c, onClose }: { contract: Contract; onClose: () => void }) {
  const sections = [
    { title: 'Thông tin hợp đồng', rows: [
      { label: 'Tên hợp đồng', value: c.contract_name },
      { label: 'Số hợp đồng', value: c.contract_code },
      { label: 'Mã hợp đồng Getfly', value: c.source_contract_code },
      { label: 'Trạng thái', value: c.contract_status },
      { label: 'Kiểu hợp đồng', value: c.contract_type },
      { label: 'Số ngày còn lại', value: c.remaining_days !== null ? String(c.remaining_days) : null },
      { label: 'Ngày tạo', value: c.created_date },
      { label: 'Ngày có hiệu lực', value: c.effective_date },
      { label: 'Ngày hết hiệu lực', value: c.expiry_date },
      { label: 'Khách hàng', value: c.customer_name },
      { label: 'SĐT khách hàng', value: c.customer_phone },
      { label: 'Người phụ trách', value: c.person_in_charge },
    ]},
    { title: 'Tài chính', rows: [
      { label: 'Giá trị hợp đồng', value: c.contract_value ? fmtVND(c.contract_value) + 'đ' : null },
      { label: 'Giá trị thực', value: c.actual_value ? fmtVND(c.actual_value) + 'đ' : null },
      { label: 'Đã thực hiện', value: fmtVND(c.executed_amount) + 'đ' },
      { label: 'Đã thanh toán', value: fmtVND(c.paid_amount) + 'đ' },
      { label: 'Công nợ', value: fmtVND(c.debt_amount) + 'đ' },
    ]},
    { title: 'Người thụ hưởng 01', rows: [
      { label: 'Họ tên', value: c.beneficiary_name_1 },
      { label: 'VnEid', value: c.beneficiary_vneid_1 },
      { label: 'Số điện thoại', value: c.beneficiary_phone_1 },
      { label: 'Địa chỉ', value: c.beneficiary_address_1 },
    ]},
    { title: 'Người thụ hưởng 02', rows: [
      { label: 'Họ tên', value: c.beneficiary_name_2 },
      { label: 'VnEid', value: c.beneficiary_vneid_2 },
      { label: 'Số điện thoại', value: c.beneficiary_phone_2 },
      { label: 'Địa chỉ', value: c.beneficiary_address_2 },
    ]},
    { title: 'Người mua', rows: [
      { label: 'Email', value: c.buyer_email },
    ]},
  ];

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center sm:justify-end bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="h-[92vh] sm:h-full w-full sm:max-w-xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-right duration-300 rounded-t-2xl sm:rounded-none">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-lg font-extrabold shadow-lg flex-shrink-0">
              <FileText size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-gray-900 truncate">{c.contract_name || 'Hợp đồng'}</h2>
              <p className="text-xs text-gray-500 mt-0.5 truncate">Mã: {c.contract_code || c.getfly_contract_id}</p>
              {c.contract_status && (
                <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusBadge(c.contract_status)}`}>
                  {c.contract_status}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5 sm:space-y-6">
          {sections.map(section => (
            <div key={section.title}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{section.title}</p>
              {section.rows.map(({ label, value }) => (
                <div key={label} className="flex items-start gap-3 py-2 border-b border-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
                    <p className="text-sm text-gray-800 font-medium mt-0.5 break-words">
                      {value || <span className="text-gray-300 italic">Chưa có</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {/* Sync info */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Hệ thống</p>
            <div className="flex items-center gap-3 py-2">
              <Database size={14} className="text-gray-400" />
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase">Synced lúc</p>
                <p className="text-sm text-gray-700 mt-0.5">{new Date(c.synced_at).toLocaleString('vi-VN')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 bg-gray-50 flex gap-3 safe-bottom">
          <button onClick={onClose}
            className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all min-h-[44px]">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
