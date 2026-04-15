'use client';

import { useState, useRef } from 'react';
import PageLayout from '@/components/PageLayout';
import {
  Crown, Search, Phone, Calendar, CheckCircle, XCircle,
  Clock, AlertCircle, RefreshCw, User, Building, CreditCard,
  Sparkles, ArrowRight, Eye
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MemberResult {
  id: string;
  member_code: string;
  full_name: string;
  phone_masked: string;
  email_masked: string;
  status: string;
  status_label: string;
  status_color: string;
  registered_date: string;
  expiry_date: string;
  branch: string;
  service_package: string;
  service_package_label: string;
  consultant_name: string;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  active:     <CheckCircle  size={16} className="text-emerald-500" />,
  pending:    <Clock        size={16} className="text-amber-500" />,
  expired:    <XCircle      size={16} className="text-red-500" />,
  terminated: <AlertCircle  size={16} className="text-gray-400" />,
};

const STATUS_BADGE: Record<string, string> = {
  active:     'bg-emerald-100 text-emerald-700 border-emerald-200',
  pending:    'bg-amber-100  text-amber-700  border-amber-200',
  expired:    'bg-red-100    text-red-700    border-red-200',
  terminated: 'bg-gray-100   text-gray-600   border-gray-200',
};

function MemberCard({ member, onViewDetail }: { member: MemberResult; onViewDetail: (id: string) => void }) {
  const regDate  = member.registered_date ? new Date(member.registered_date).toLocaleDateString('vi-VN') : '—';
  const expDate  = member.expiry_date     ? new Date(member.expiry_date).toLocaleDateString('vi-VN')     : '—';
  const isExpiring = member.expiry_date && new Date(member.expiry_date) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
      {/* Top bar */}
      <div className="h-1.5 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-400" />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          {/* Avatar + name */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 text-white font-extrabold text-lg flex-shrink-0 shadow-md">
              {member.full_name.charAt(0)}
            </div>
            <div>
              <p className="font-extrabold text-gray-900 text-base leading-tight">{member.full_name}</p>
              <p className="text-xs font-mono text-gray-400 mt-0.5 flex items-center gap-1">
                <CreditCard size={11} /> {member.member_code}
              </p>
            </div>
          </div>
          {/* Status badge */}
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${STATUS_BADGE[member.status] || STATUS_BADGE.terminated}`}>
            {STATUS_ICONS[member.status]}
            {member.status_label}
          </span>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div className="flex items-center gap-2 text-gray-600">
            <Phone size={13} className="text-gray-400" />
            <span>{member.phone_masked}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Building size={13} className="text-gray-400" />
            <span>{member.branch || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar size={13} className="text-gray-400" />
            <span>Đăng ký: {regDate}</span>
          </div>
          <div className={`flex items-center gap-2 ${isExpiring ? 'text-orange-600 font-semibold' : 'text-gray-600'}`}>
            <Calendar size={13} className={isExpiring ? 'text-orange-400' : 'text-gray-400'} />
            <span>Hết hạn: {expDate}</span>
            {isExpiring && <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-bold">Sắp HH</span>}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] px-2 py-1 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200 font-semibold">
              {member.service_package_label}
            </span>
            {member.consultant_name && (
              <span className="text-[11px] text-gray-400 flex items-center gap-1">
                <User size={10} /> {member.consultant_name}
              </span>
            )}
          </div>
          <button
            onClick={() => onViewDetail(member.id)}
            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-xl hover:bg-blue-50 transition-all"
          >
            <Eye size={13} /> Xem đầy đủ <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MemberLookupPage() {
  const router = useRouter();
  const [query, setQuery]   = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MemberResult[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError]   = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q || q.length < 3) {
      setError('Vui lòng nhập ít nhất 3 ký tự');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);
    setNotFound(false);

    try {
      const res  = await fetch(`/api/membership/lookup?q=${encodeURIComponent(q)}&type=auto`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Lỗi hệ thống');
        return;
      }

      if (data.found) {
        setResults(data.results);
      } else {
        setNotFound(true);
      }
    } catch {
      setError('Không thể kết nối đến máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setQuery('');
    setResults(null);
    setNotFound(false);
    setError('');
    inputRef.current?.focus();
  }

  return (
    <PageLayout title="Tra cứu HV" icon={<Crown size={18} className="text-yellow-500" />}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Tra Cứu Hội Viên</h1>
          <p className="text-sm text-gray-500 mt-1">Tìm kiếm bằng số điện thoại, mã hội viên hoặc số CCCD</p>
        </div>

        {/* Search box */}
        <form onSubmit={handleSearch}>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Nhập SĐT (09xx...), Mã HV (BS-...) hoặc CCCD (12 số)..."
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading || query.trim().length < 3}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
              >
                {loading ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
                Tra cứu
              </button>
            </div>

            {/* Quick hints */}
            <div className="flex flex-wrap gap-2 mt-3">
              {['0901', '0912', 'BS-', 'HV-', '001'].map(hint => (
                <button
                  key={hint}
                  type="button"
                  onClick={() => { setQuery(hint); inputRef.current?.focus(); }}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-yellow-50 hover:text-yellow-700 transition-colors font-mono"
                >
                  {hint}...
                </button>
              ))}
              <span className="text-[11px] text-gray-400 self-center ml-1">Gợi ý nhanh</span>
            </div>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm font-semibold text-red-600">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-2xl bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-48" />
                    <div className="h-3 bg-gray-100 rounded w-32" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[1,2,3,4].map(j => <div key={j} className="h-4 bg-gray-100 rounded" />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && results && results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-600">
                Tìm thấy <strong className="text-gray-900">{results.length}</strong> kết quả
              </p>
              <button onClick={handleClear} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                Xóa kết quả
              </button>
            </div>
            {results.map(m => (
              <MemberCard
                key={m.id}
                member={m}
                onViewDetail={(id) => router.push(`/membership/${id}`)}
              />
            ))}
          </div>
        )}

        {/* Not found */}
        {!loading && notFound && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 mx-auto mb-4">
              <Crown size={28} className="text-gray-300" />
            </div>
            <h3 className="text-base font-bold text-gray-700">Không tìm thấy hội viên</h3>
            <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
              Kiểm tra lại số điện thoại hoặc mã hội viên, hoặc{' '}
              <button
                onClick={() => router.push('/membership/register')}
                className="text-yellow-600 font-semibold hover:underline"
              >
                đăng ký mới
              </button>
            </p>
          </div>
        )}

        {/* Idle state */}
        {!loading && !results && !notFound && !error && (
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl border border-yellow-100 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 mx-auto mb-4 shadow-lg">
              <Sparkles size={28} className="text-white" />
            </div>
            <h3 className="text-base font-bold text-gray-800">Tra Cứu Thông Tin Hội Viên</h3>
            <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
              Nhập <strong>số điện thoại</strong>, <strong>mã hội viên</strong> hoặc <strong>số CCCD</strong> để xem thông tin và trạng thái thẻ.
            </p>

            <div className="grid grid-cols-3 gap-3 mt-6 text-left max-w-md mx-auto">
              <div className="bg-white rounded-xl p-3 border border-yellow-100">
                <p className="text-[11px] font-bold text-gray-500 mb-1">📱 Theo SĐT</p>
                <p className="font-mono text-sm text-gray-700">0901 234 567</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-yellow-100">
                <p className="text-[11px] font-bold text-gray-500 mb-1">🏷 Theo mã HV</p>
                <p className="font-mono text-sm text-gray-700">BS-2026-001</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-yellow-100">
                <p className="text-[11px] font-bold text-gray-500 mb-1">🪪 Theo CCCD</p>
                <p className="font-mono text-sm text-gray-700">001234567890</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
