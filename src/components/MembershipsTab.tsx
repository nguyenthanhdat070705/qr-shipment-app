'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Phone, ChevronLeft, ChevronRight, Eye, RefreshCw, Download, CheckCircle, FileText, DownloadCloud, User, CreditCard, Camera } from 'lucide-react';

interface ContractAttachment {
  id: string;
  vneid_front_url: string | null;
  vneid_back_url: string | null;
  contract_scan_url: string | null;
  membership_form_url: string | null;
}

interface Contract {
  id: string;
  getfly_contract_id: string;
  contract_name: string;
  contract_code: string;
  contract_status: string;
  customer_name: string;
  person_in_charge: string;
  contract_value: number;
  paid_amount: number;
  debt_amount: number;
  synced_at: string;
  beneficiary_name_1: string;
  beneficiary_vneid_1: string;
  beneficiary_phone_1: string;
}

export default function MembershipsTab() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState<Contract | null>(null);
  const perPage = 20;

  const loadContracts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), per_page: String(perPage),
      });
      if (search) params.set('search', search);
      // Giả sử lấy những hợp đồng/đơn hàng được đánh dấu là Hội viên
      // Tạm thời lấy danh sách hợp đồng chung
      const res = await fetch(`/api/getfly-contracts?${params}`);
      const d = await res.json();
      setContracts(d.records || []);
      setTotal(d.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { loadContracts(); }, [loadContracts]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault(); setPage(1); setSearch(searchInput);
  }

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <form onSubmit={handleSearch} className="flex gap-3 flex-1 min-w-[300px]">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
              placeholder="Tìm theo tên hội viên, SĐT, VNeID..."
              value={searchInput} onChange={e => setSearchInput(e.target.value)} />
          </div>
          <button type="submit" className="px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-all">Tìm</button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {total === 0 && !loading ? (
          <div className="py-16 text-center">
            <User size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="font-semibold text-gray-500">Chưa có dữ liệu hội viên</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">Hội viên</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">Trạng thái HĐ</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">Người thụ hưởng</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">VNeID / Hồ sơ</th>
                    <th className="text-center px-4 py-3 font-bold text-gray-600 text-[10px] uppercase whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={5} className="py-10 text-center text-gray-400"><RefreshCw size={24} className="animate-spin mx-auto" /></td></tr>
                  ) : contracts.map(c => (
                    <tr key={c.id} className="hover:bg-violet-50/30 transition-colors group">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800 text-sm">{c.customer_name || '—'}</p>
                        <p className="font-mono text-[10px] text-gray-500 mt-0.5">{c.contract_code}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700">
                          {c.contract_status || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700 font-medium">{c.beneficiary_name_1 || '—'}</p>
                        {c.beneficiary_phone_1 && <p className="text-[10px] text-gray-500"><Phone size={10} className="inline mr-1" />{c.beneficiary_phone_1}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {c.beneficiary_vneid_1 ? (
                          <span className="flex items-center gap-1 text-emerald-600 font-semibold"><CreditCard size={12} /> {c.beneficiary_vneid_1}</span>
                        ) : (
                          <span className="text-gray-400">Thiếu VNeID</span>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="flex items-center gap-1 text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded" title="Thiếu ảnh VNeID">
                            <Camera size={10} /> Trống
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded" title="Thiếu file scan">
                            <FileText size={10} /> Trống
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setSelected(c)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-600 text-[11px] font-semibold hover:bg-violet-100 transition-all opacity-0 group-hover:opacity-100">
                          <Eye size={13} /> Hồ sơ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-white disabled:opacity-30"><ChevronLeft size={14} /> Trước</button>
              <span className="text-xs font-semibold text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200">Trang {page} / {totalPages || 1}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages || contracts.length < perPage}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-white disabled:opacity-30">Sau <ChevronRight size={14} /></button>
            </div>
          </>
        )}
      </div>

      {selected && <MembershipDetailModal contract={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function MembershipDetailModal({ contract: c, onClose }: { contract: Contract, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">Hồ sơ hội viên: {c.customer_name}</h2>
            <p className="text-sm text-gray-500">Mã: {c.contract_code} · Thụ hưởng: {c.beneficiary_name_1 || 'Chưa cập nhật'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-600 transition-colors">
            Đóng
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/3 space-y-4">
            <h3 className="font-bold text-gray-800 border-b pb-2">Thông tin</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Người thụ hưởng:</span> <span className="font-semibold">{c.beneficiary_name_1 || '—'}</span></p>
              <p><span className="text-gray-500">VNeID:</span> <span className="font-mono">{c.beneficiary_vneid_1 || '—'}</span></p>
              <p><span className="text-gray-500">SĐT:</span> <span>{c.beneficiary_phone_1 || '—'}</span></p>
            </div>

            <div className="mt-6 p-4 bg-violet-50 rounded-xl border border-violet-100">
              <h4 className="font-bold text-violet-800 text-sm mb-2 flex items-center gap-2"><DownloadCloud size={14}/> Trạng thái Backup</h4>
              <p className="text-xs text-violet-600 mb-1">Dữ liệu được tự động lưu trữ từ Getfly để đảm bảo an toàn.</p>
              <div className="space-y-1 text-xs font-semibold mt-3">
                <p className="flex justify-between text-gray-600"><span>VNeID mặt trước:</span> <span className="text-red-500">Chưa có file</span></p>
                <p className="flex justify-between text-gray-600"><span>VNeID mặt sau:</span> <span className="text-red-500">Chưa có file</span></p>
                <p className="flex justify-between text-gray-600"><span>File scan HĐ:</span> <span className="text-red-500">Chưa có file</span></p>
                <p className="flex justify-between text-gray-600"><span>Phiếu hội viên:</span> <span className="text-red-500">Chưa có file</span></p>
              </div>
            </div>
          </div>

          <div className="w-full md:w-2/3 border-l border-gray-100 pl-0 md:pl-6">
             <h3 className="font-bold text-gray-800 border-b pb-2 mb-4">Tài liệu đính kèm</h3>
             
             <div className="grid grid-cols-2 gap-4">
                <div className="aspect-video bg-gray-50 rounded-xl border border-gray-200 border-dashed flex flex-col items-center justify-center text-gray-400 group relative">
                   <Camera size={24} className="mb-2 opacity-50" />
                   <p className="text-sm font-medium">VNeID mặt trước</p>
                   <p className="text-[10px]">Chưa tải về từ Getfly</p>
                </div>
                <div className="aspect-video bg-gray-50 rounded-xl border border-gray-200 border-dashed flex flex-col items-center justify-center text-gray-400">
                   <Camera size={24} className="mb-2 opacity-50" />
                   <p className="text-sm font-medium">VNeID mặt sau</p>
                   <p className="text-[10px]">Chưa tải về từ Getfly</p>
                </div>
                <div className="aspect-[1/1.4] col-span-2 sm:col-span-1 bg-gray-50 rounded-xl border border-gray-200 border-dashed flex flex-col items-center justify-center text-gray-400">
                   <FileText size={24} className="mb-2 opacity-50" />
                   <p className="text-sm font-medium">Bản scan Hợp đồng</p>
                   <p className="text-[10px]">Chưa tải về từ Getfly</p>
                </div>
                <div className="aspect-[1/1.4] col-span-2 sm:col-span-1 bg-gray-50 rounded-xl border border-gray-200 border-dashed flex flex-col items-center justify-center text-gray-400">
                   <FileText size={24} className="mb-2 opacity-50" />
                   <p className="text-sm font-medium">Phiếu đăng ký Hội viên</p>
                   <p className="text-[10px]">Chưa tải về từ Getfly</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
