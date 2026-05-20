'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import MemberImportModal from '@/components/MemberImportModal';
import Link from 'next/link';
import { Crown, Search, Phone, Calendar, UserPlus, Upload, Download, RefreshCw, Eye, FileText } from 'lucide-react';

interface Member {
  id: string;
  member_code: string;
  full_name: string;
  phone: string;
  email: string;
  status: string;
  registered_date: string;
  expiry_date: string;
  branch: string;
  consultant_name: string;
}

export default function MemberListPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [importModalOpen, setImportModalOpen] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/membership/list');
      const data = await res.json();
      setMembers(data.members || []);
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const filtered = members.filter(m => {
    const matchSearch = !search || 
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.member_code.includes(search) ||
      (m.phone && m.phone.includes(search));
    const matchStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusLabels: Record<string, { label: string; cls: string }> = {
    active: { label: 'Hoạt động', cls: 'bg-emerald-100 text-emerald-700' },
    pending: { label: 'Chờ duyệt', cls: 'bg-amber-100 text-amber-700' },
    expired: { label: 'Hết hạn', cls: 'bg-red-100 text-red-700' },
    terminated: { label: 'Đã kết thúc', cls: 'bg-gray-100 text-gray-700' },
  };

  const statusCounts = {
    all: members.length,
    active: members.filter(m => m.status === 'active').length,
    pending: members.filter(m => m.status === 'pending').length,
    expired: members.filter(m => m.status === 'expired').length,
  };

  return (
    <PageLayout title="Danh sách HV" icon={<Crown size={18} className="text-yellow-500" />}>

      {/* Import Modal */}
      <MemberImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportDone={fetchMembers}
      />

      <div className="space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-gray-900">Danh Sách Hội Viên</h1>
            <p className="text-xs sm:text-sm text-gray-500">{members.length} hội viên</p>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            <button
              onClick={() => setImportModalOpen(true)}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-xs sm:text-sm hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
            >
              <Upload size={15} />
              Import Excel
            </button>
            <Link
              href="/membership/register"
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
            >
              <UserPlus size={15} />
              Đăng ký mới
            </Link>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all"
              placeholder="Tìm theo tên, SĐT, mã HV..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
            {(['all', 'active', 'pending', 'expired'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`flex-shrink-0 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap ${
                  statusFilter === s
                    ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}>
                {s === 'all' ? 'Tất cả' : statusLabels[s]?.label || s}
                <span className={`ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  statusFilter === s ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {statusCounts[s]}
                </span>
              </button>
            ))}
            <button
              onClick={fetchMembers}
              className="flex-shrink-0 p-2 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              title="Làm mới"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Table (desktop) + Cards (mobile) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Hội viên</th>
                  <th className="text-left px-5 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Mã HV</th>
                  <th className="text-left px-5 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider">SĐT</th>
                  <th className="text-left px-5 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Ngày ĐK</th>
                  <th className="text-left px-5 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider hidden lg:table-cell">Hết hạn</th>
                  <th className="text-left px-5 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider hidden lg:table-cell">Chi nhánh</th>
                  <th className="text-left px-5 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Trạng thái</th>
                  <th className="text-center px-5 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={8} className="py-16 text-center text-gray-400">
                    <RefreshCw size={20} className="mx-auto mb-2 animate-spin text-gray-300" />
                    Đang tải...
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="py-16 text-center text-gray-400">
                    <Crown size={28} className="mx-auto mb-2 text-gray-300" />
                    <p className="font-semibold">Không tìm thấy hội viên</p>
                    <p className="text-xs text-gray-300 mt-1">Hãy &quot;Đăng ký mới&quot; hoặc &quot;Import Excel&quot; để thêm hội viên</p>
                  </td></tr>
                ) : (
                  filtered.map(m => {
                    const st = statusLabels[m.status] || { label: m.status, cls: 'bg-gray-100 text-gray-600' };
                    return (
                      <tr key={m.id} className="hover:bg-yellow-50/30 transition-colors group">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-white font-bold text-sm flex-shrink-0">
                              {m.full_name.charAt(0)}
                            </div>
                            <span className="font-semibold text-gray-800">{m.full_name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-gray-600">{m.member_code}</td>
                        <td className="px-5 py-3.5 text-gray-600">
                          <span className="flex items-center gap-1"><Phone size={12} />{m.phone || '—'}</span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-600">
                          <span className="flex items-center gap-1"><Calendar size={12} />{m.registered_date ? new Date(m.registered_date).toLocaleDateString('vi-VN') : '—'}</span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-600 text-xs hidden lg:table-cell">
                          {m.expiry_date ? new Date(m.expiry_date).toLocaleDateString('vi-VN') : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-gray-600 text-xs hidden lg:table-cell">{m.branch || '—'}</td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => router.push(`/membership/${m.id}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-[11px] font-semibold hover:bg-blue-100 transition-all group-hover:bg-blue-100"
                          >
                            <Eye size={13} />
                            Xem chi tiết
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-50">
            {loading ? (
              <div className="py-12 text-center text-gray-400">
                <RefreshCw size={20} className="mx-auto mb-2 animate-spin text-gray-300" />
                Đang tải...
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-gray-400 px-4">
                <Crown size={28} className="mx-auto mb-2 text-gray-300" />
                <p className="font-semibold">Không tìm thấy hội viên</p>
                <p className="text-xs text-gray-300 mt-1">Hãy &quot;Đăng ký mới&quot; hoặc &quot;Import Excel&quot; để thêm hội viên</p>
              </div>
            ) : (
              filtered.map(m => {
                const st = statusLabels[m.status] || { label: m.status, cls: 'bg-gray-100 text-gray-600' };
                return (
                  <button
                    key={m.id}
                    onClick={() => router.push(`/membership/${m.id}`)}
                    className="w-full text-left px-4 py-3 hover:bg-yellow-50/30 active:bg-yellow-50/60 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-white font-bold text-sm flex-shrink-0">
                        {m.full_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-gray-800 text-sm truncate">{m.full_name}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${st.cls}`}>{st.label}</span>
                        </div>
                        <p className="text-[11px] font-mono text-gray-500 mt-0.5 truncate">{m.member_code}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-gray-500">
                          <span className="flex items-center gap-1"><Phone size={10} />{m.phone || '—'}</span>
                          <span className="flex items-center gap-1"><Calendar size={10} />{m.registered_date ? new Date(m.registered_date).toLocaleDateString('vi-VN') : '—'}</span>
                          {m.branch && <span>{m.branch}</span>}
                        </div>
                      </div>
                      <Eye size={14} className="text-gray-300 flex-shrink-0 mt-1" />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer summary */}
          {!loading && filtered.length > 0 && (
            <div className="px-4 sm:px-5 py-3 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[11px] sm:text-xs text-gray-400">
              <span>Hiển thị {filtered.length} / {members.length} hội viên</span>
              <span className="hidden sm:inline">Nhấn vào hội viên để xem chi tiết</span>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
