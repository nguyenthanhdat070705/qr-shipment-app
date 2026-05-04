'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import PageLayout from '@/components/PageLayout';
import {
  Crown, Search, Phone, Calendar, CheckCircle, XCircle,
  Clock, AlertCircle, User, Building, CreditCard,
  ArrowRight, Eye, X, Hash, Mail, MapPin, Badge
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// ── Types ────────────────────────────────────────────────────
interface MemberResult {
  id: string;
  member_code: string;
  full_name: string;
  phone_masked: string;
  email_masked: string;
  id_number_masked: string;
  status: string;
  status_label: string;
  status_color: string;
  registered_date: string;
  expiry_date: string;
  branch: string;
  service_package: string;
  service_package_label: string;
  consultant_name: string;
  matched_field: string;
  matched_preview?: string;
}

// ── Helpers ──────────────────────────────────────────────────
const STATUS_STYLE: Record<string, { badge: string; icon: React.ReactNode; dot: string }> = {
  active:     { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle size={12} />, dot: 'bg-emerald-400' },
  pending:    { badge: 'bg-amber-100 text-amber-700 border-amber-200',       icon: <Clock size={12} />,        dot: 'bg-amber-400' },
  expired:    { badge: 'bg-red-100 text-red-700 border-red-200',             icon: <XCircle size={12} />,      dot: 'bg-red-400' },
  terminated: { badge: 'bg-gray-100 text-gray-600 border-gray-200',          icon: <AlertCircle size={12} />, dot: 'bg-gray-300' },
};

const MATCH_LABEL: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  phone:         { label: 'Khớp SĐT',      icon: <Phone size={10} />,    color: 'text-blue-600 bg-blue-50 border-blue-200' },
  id_number:     { label: 'Khớp CCCD',     icon: <CreditCard size={10} />, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  member_code:   { label: 'Khớp mã HV',   icon: <Hash size={10} />,      color: 'text-amber-600 bg-amber-50 border-amber-200' },
  full_name:     { label: 'Khớp tên',      icon: <User size={10} />,      color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  email:         { label: 'Khớp email',    icon: <Mail size={10} />,      color: 'text-sky-600 bg-sky-50 border-sky-200' },
  address:       { label: 'Khớp địa chỉ', icon: <MapPin size={10} />,    color: 'text-pink-600 bg-pink-50 border-pink-200' },
  consultant_name: { label: 'Khớp NV TV', icon: <Badge size={10} />,     color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
};

function fmtDate(s: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Member Card ──────────────────────────────────────────────
function MemberCard({ member, query, onView }: {
  member: MemberResult;
  query: string;
  onView: () => void;
}) {
  const ss = STATUS_STYLE[member.status] || STATUS_STYLE.terminated;
  const match = MATCH_LABEL[member.matched_field];
  const isExpiring = member.expiry_date
    && new Date(member.expiry_date) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  // Highlight tên nếu khớp
  function highlightText(text: string, q: string) {
    if (!q || q.length < 2) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200 text-yellow-900 rounded px-0.5 not-italic">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  }

  return (
    <div
      onClick={onView}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-yellow-300 transition-all cursor-pointer group overflow-hidden"
    >
      {/* Top accent */}
      <div className="h-1 bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400" />

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white font-black text-xl shadow-md">
              {member.full_name.charAt(0).toUpperCase()}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${ss.dot}`} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h3 className="font-extrabold text-gray-900 text-base group-hover:text-yellow-700 transition-colors">
                  {member.matched_field === 'full_name'
                    ? highlightText(member.full_name, query)
                    : member.full_name}
                </h3>
                <p className="text-xs font-mono text-gray-400 mt-0.5">
                  {member.matched_field === 'member_code'
                    ? highlightText(member.member_code, query)
                    : member.member_code}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Match badge */}
                {match && (
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${match.color}`}>
                    {match.icon} {match.label}
                  </span>
                )}
                {/* Status */}
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${ss.badge}`}>
                  {ss.icon} {member.status_label}
                </span>
              </div>
            </div>

            {/* Details grid */}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <Phone size={11} className="text-gray-400 flex-shrink-0" />
                <span className={member.matched_field === 'phone' ? 'font-bold text-blue-600' : ''}>
                  {member.phone_masked}
                </span>
              </div>
              {member.id_number_masked && (
                <div className="flex items-center gap-1.5">
                  <CreditCard size={11} className="text-gray-400 flex-shrink-0" />
                  <span className={member.matched_field === 'id_number' ? 'font-bold text-purple-600' : ''}>
                    {member.id_number_masked}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar size={11} className="text-gray-400 flex-shrink-0" />
                <span>Đăng ký: {fmtDate(member.registered_date)}</span>
              </div>
              <div className={`flex items-center gap-1.5 ${isExpiring ? 'text-orange-600 font-semibold' : ''}`}>
                <Calendar size={11} className={`flex-shrink-0 ${isExpiring ? 'text-orange-400' : 'text-gray-400'}`} />
                <span>HH: {fmtDate(member.expiry_date)}</span>
                {isExpiring && <span className="text-[9px] bg-orange-100 text-orange-600 px-1 rounded-full font-bold">Sắp HH</span>}
              </div>
              {member.branch && (
                <div className="flex items-center gap-1.5">
                  <Building size={11} className="text-gray-400 flex-shrink-0" />
                  <span>{member.branch}</span>
                </div>
              )}
              {member.consultant_name && (
                <div className="flex items-center gap-1.5">
                  <User size={11} className="text-gray-400 flex-shrink-0" />
                  <span className={member.matched_field === 'consultant_name' ? 'font-bold text-indigo-600' : ''}>
                    {member.consultant_name}
                  </span>
                </div>
              )}
              {member.matched_preview && (
                <div className="col-span-2 flex items-center gap-1.5 text-pink-600">
                  <MapPin size={11} className="flex-shrink-0" />
                  <span className="truncate">{member.matched_preview}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
          <span className="text-[11px] px-2.5 py-1 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200 font-semibold">
            {member.service_package_label || '—'}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-xl hover:bg-blue-50 transition-all"
          >
            <Eye size={13} /> Xem chi tiết <ArrowRight size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
type SearchType = 'all' | 'phone' | 'id_number' | 'member_code' | 'name';
const FILTER_TABS: { key: SearchType; label: string; icon: React.ReactNode; hint: string }[] = [
  { key: 'all',         label: 'Tất cả',   icon: <Search size={13} />,     hint: 'Tìm kiếm mọi thông tin...' },
  { key: 'phone',       label: 'SĐT',      icon: <Phone size={13} />,      hint: 'Nhập số điện thoại (09xx...)' },
  { key: 'id_number',   label: 'CCCD',     icon: <CreditCard size={13} />, hint: 'Nhập số CCCD / CMND (9-12 số)' },
  { key: 'member_code', label: 'Mã HV',    icon: <Hash size={13} />,       hint: 'Nhập mã hội viên (Mem...)' },
  { key: 'name',        label: 'Họ tên',   icon: <User size={13} />,       hint: 'Nhập tên hội viên...' },
];

export default function MemberLookupPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchType>('all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MemberResult[] | null>(null);
  const [searchType, setSearchType] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentTab = FILTER_TABS.find(t => t.key === filter)!;

  // ── Auto-build query with filter prefix ──────────────────
  const effectiveQuery = useCallback((q: string, f: SearchType): string => {
    if (f === 'all' || !q) return q;
    return q; // backend handles smart detection; filter just changes placeholder
  }, []);

  // ── Search function ───────────────────────────────────────
  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults(null);
      setNotFound(false);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    setNotFound(false);
    setResults(null);

    try {
      const params = new URLSearchParams({ q: trimmed, limit: '10' });
      const res = await fetch(`/api/membership/lookup?${params}`);
      const data = await res.json();

      if (!res.ok) { setError(data.error || 'Lỗi hệ thống'); return; }
      if (data.found) {
        setResults(data.results);
        setSearchType(data.search_type || '');
        setTotal(data.total || data.results.length);
      } else {
        setNotFound(true);
      }
    } catch {
      setError('Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Debounced search (real-time) ─────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults(null); setNotFound(false); setError('');
      return;
    }
    debounceRef.current = setTimeout(() => {
      doSearch(effectiveQuery(query, filter));
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, filter, doSearch, effectiveQuery]);

  function handleClear() {
    setQuery('');
    setResults(null);
    setNotFound(false);
    setError('');
    inputRef.current?.focus();
  }

  const SEARCH_TYPE_LABEL: Record<string, string> = {
    phone:       '📱 Tìm theo SĐT',
    id_number:   '🪪 Tìm theo CCCD/CMND',
    member_code: '🏷 Tìm theo mã hội viên',
    full_text:   '🔍 Tìm toàn bộ thông tin',
  };

  return (
    <PageLayout title="Tra cứu HV" icon={<Crown size={18} className="text-yellow-500" />}>
      <div className="max-w-3xl mx-auto space-y-5">

        {/* ── Header ── */}
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">🔍 Tra Cứu Hội Viên</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tìm kiếm theo <strong>bất kỳ thông tin nào</strong> — SĐT, CCCD, mã HV, họ tên, email, địa chỉ...
          </p>
        </div>

        {/* ── Filter tabs ── */}
        <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1.5 overflow-x-auto">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setFilter(tab.key); inputRef.current?.focus(); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                filter === tab.key
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── Search box ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSearch(query)}
                placeholder={currentTab.hint}
                autoFocus
                className="w-full pl-11 pr-10 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all bg-gray-50 focus:bg-white"
              />
              {query && (
                <button
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={() => doSearch(query)}
              disabled={loading || !query.trim() || query.trim().length < 2}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-xl font-bold text-sm shadow hover:shadow-md hover:scale-[1.02] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Search size={15} />}
              Tìm
            </button>
          </div>

          {/* Quick searches */}
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-[11px] text-gray-400 self-center">Thử nhanh:</span>
            {[
              { label: 'SĐT: 09...', val: '09' },
              { label: 'Mã: Mem26...', val: 'Mem26' },
              { label: 'CCCD: 0...', val: '07' },
            ].map(s => (
              <button
                key={s.val}
                onClick={() => setQuery(s.val)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 hover:bg-yellow-50 hover:border-yellow-300 hover:text-yellow-700 transition-all font-mono"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm font-semibold text-red-600">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* ── Loading skeleton ── */}
        {loading && (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-4 bg-gray-200 rounded w-48" />
                    <div className="h-3 bg-gray-100 rounded w-32" />
                    <div className="grid grid-cols-4 gap-3 mt-3">
                      {[1,2,3,4].map(j => <div key={j} className="h-3 bg-gray-100 rounded" />)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Results ── */}
        {!loading && results && results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-700">
                  <strong className="text-gray-900">{total}</strong> kết quả
                </p>
                {searchType && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                    {SEARCH_TYPE_LABEL[searchType] || searchType}
                  </span>
                )}
              </div>
              <button
                onClick={handleClear}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={12} /> Xóa
              </button>
            </div>
            {results.map(m => (
              <MemberCard
                key={m.id}
                member={m}
                query={query}
                onView={() => router.push(`/membership/${m.id}`)}
              />
            ))}
          </div>
        )}

        {/* ── Not found ── */}
        {!loading && notFound && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Crown size={28} className="text-gray-300" />
            </div>
            <h3 className="text-base font-bold text-gray-700">Không tìm thấy hội viên</h3>
            <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">
              Không có kết quả cho <strong>&quot;{query}&quot;</strong>. Kiểm tra lại hoặc thử từ khoá khác.
            </p>
            <div className="flex gap-3 justify-center mt-5">
              <button
                onClick={handleClear}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
              >
                Tìm lại
              </button>
              <button
                onClick={() => router.push('/membership/register')}
                className="px-4 py-2 rounded-xl bg-yellow-500 text-white text-sm font-bold hover:bg-yellow-600 transition-all"
              >
                + Đăng ký mới
              </button>
            </div>
          </div>
        )}

        {/* ── Idle state ── */}
        {!loading && !results && !notFound && !error && (
          <div className="bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 rounded-2xl border border-yellow-100 p-8">
            <div className="text-center mb-6">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Search size={28} className="text-white" />
              </div>
              <h3 className="text-base font-bold text-gray-800">Tìm kiếm thông minh</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                Hệ thống tự nhận diện loại thông tin và tìm kết quả phù hợp nhất
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { icon: '📱', label: 'Số điện thoại', example: '0901 234 567', color: 'bg-blue-50 border-blue-100' },
                { icon: '🪪', label: 'CCCD / CMND', example: '079123456789', color: 'bg-purple-50 border-purple-100' },
                { icon: '🏷', label: 'Mã hội viên', example: 'Mem260415001', color: 'bg-amber-50 border-amber-100' },
                { icon: '👤', label: 'Họ và tên', example: 'Nguyễn Văn An', color: 'bg-emerald-50 border-emerald-100' },
                { icon: '📧', label: 'Email', example: 'ten@gmail.com', color: 'bg-sky-50 border-sky-100' },
                { icon: '📍', label: 'Địa chỉ', example: 'Quận 1, HCM', color: 'bg-pink-50 border-pink-100' },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => inputRef.current?.focus()}
                  className={`text-left p-3 rounded-xl border ${item.color} hover:shadow-sm transition-all`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{item.icon}</span>
                    <span className="text-[11px] font-bold text-gray-600">{item.label}</span>
                  </div>
                  <p className="font-mono text-[11px] text-gray-500">{item.example}</p>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </PageLayout>
  );
}
