'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  Search, Crown, Phone, Calendar, CheckCircle, XCircle,
  Clock, AlertCircle, RefreshCw, Sparkles, CreditCard,
  Building, User, Shield, ChevronDown, ChevronUp
} from 'lucide-react';

/* ─────────────────── Types ─────────────────── */
interface MemberResult {
  id: string;
  member_code: string;
  full_name: string;
  phone_masked: string;
  email_masked: string;
  status: string;
  status_label: string;
  registered_date: string;
  expiry_date: string;
  branch: string;
  service_package_label: string;
  consultant_name: string;
}

/* ─────────────────── Status config ─────────────────── */
const STATUS_CONFIG: Record<string, { icon: React.ReactNode; badge: string; bar: string }> = {
  active: {
    icon: <CheckCircle size={18} className="text-emerald-500" />,
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    bar: 'bg-emerald-500',
  },
  pending: {
    icon: <Clock size={18} className="text-amber-500" />,
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    bar: 'bg-amber-500',
  },
  expired: {
    icon: <XCircle size={18} className="text-red-500" />,
    badge: 'bg-red-100 text-red-700 border-red-200',
    bar: 'bg-red-500',
  },
  terminated: {
    icon: <AlertCircle size={18} className="text-gray-400" />,
    badge: 'bg-gray-100 text-gray-600 border-gray-200',
    bar: 'bg-gray-400',
  },
};

/* ─────────────────── Membership Card ─────────────────── */
function MembershipCard({ member }: { member: MemberResult }) {
  const [expanded, setExpanded] = useState(false);
  const config = STATUS_CONFIG[member.status] || STATUS_CONFIG.terminated;

  const regDate  = member.registered_date ? new Date(member.registered_date).toLocaleDateString('vi-VN') : '—';
  const expDate  = member.expiry_date     ? new Date(member.expiry_date).toLocaleDateString('vi-VN')     : '—';
  const expRaw   = member.expiry_date ? new Date(member.expiry_date) : null;
  const daysLeft = expRaw ? Math.ceil((expRaw.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  // Compute progress bar (10 year = 3650 days)
  let progress = 100;
  if (member.registered_date && member.expiry_date) {
    const start  = new Date(member.registered_date).getTime();
    const end    = new Date(member.expiry_date).getTime();
    const now    = Date.now();
    progress = Math.max(0, Math.min(100, Math.round((1 - (end - now) / (end - start)) * 100)));
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-white/60 shadow-xl overflow-hidden transition-all duration-300">
      {/* Gold bar */}
      <div className="h-1 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-400" />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 text-white font-black text-2xl flex-shrink-0 shadow-lg select-none">
            {member.full_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-gray-900 leading-tight">{member.full_name}</h2>
            <p className="text-xs font-mono text-amber-600 mt-0.5 flex items-center gap-1">
              <CreditCard size={11} className="flex-shrink-0" />
              {member.member_code}
            </p>
          </div>
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border flex-shrink-0 ${config.badge}`}>
            {config.icon}
            {member.status_label}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 mb-1.5">
            <span>Thời gian hiệu lực</span>
            {daysLeft !== null && (
              <span className={daysLeft < 90 ? 'text-orange-500 font-bold' : 'text-gray-500'}>
                {daysLeft > 0 ? `Còn ${daysLeft} ngày` : 'Đã hết hạn'}
              </span>
            )}
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${config.bar}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>{regDate}</span>
            <span>{expDate}</span>
          </div>
        </div>

        {/* Basic info */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <InfoRow icon={<Phone size={13} />} label="SĐT" value={member.phone_masked} />
          <InfoRow icon={<Building size={13} />} label="Chi nhánh" value={member.branch || '—'} />
        </div>

        {/* Package badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-50 to-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold">
            <Crown size={12} className="text-amber-500" />
            {member.service_package_label}
          </span>
          {member.consultant_name && (
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <User size={10} /> {member.consultant_name}
            </span>
          )}
        </div>

        {/* Expandable details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 py-1 transition-colors"
        >
          {expanded ? <><ChevronUp size={14} /> Thu gọn</> : <><ChevronDown size={14} /> Xem thêm chi tiết</>}
        </button>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-200">
            <InfoRow icon={<Calendar size={13} />} label="Ngày đăng ký" value={regDate} />
            <InfoRow icon={<Calendar size={13} />} label="Ngày hết hạn" value={expDate} />
            {member.email_masked && (
              <InfoRow icon={<Shield size={13} />} label="Email" value={member.email_masked} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <p className="text-[10px] text-gray-400 font-semibold">{label}</p>
        <p className="text-sm text-gray-700 font-semibold">{value}</p>
      </div>
    </div>
  );
}

/* ─────────────────── Main Page ─────────────────── */
export default function PublicLookupPage() {
  const [query, setQuery]     = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MemberResult[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError]     = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

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
      if (data.found) setResults(data.results);
      else setNotFound(true);
    } catch {
      setError('Không thể kết nối. Vui lòng thử lại.');
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
    <div className="min-h-screen bg-gradient-to-br from-[#0d1b35] via-[#1a2a50] to-[#0d1b35] relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/3 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-center py-8 px-4">
          <div className="text-center">
            {/* Logo area */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 shadow-lg shadow-amber-500/30">
                <Crown size={24} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-white font-black text-lg leading-none">BLACKSTONES</p>
                <p className="text-yellow-400/70 text-[11px] font-semibold tracking-wider uppercase">Hội Viên Trăm Tuổi</p>
              </div>
            </div>
            <h1 className="text-white/80 text-sm font-medium">Tra cứu thông tin thẻ hội viên</h1>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 px-4 pb-10 max-w-lg mx-auto w-full">

          {/* Search box */}
          <div className="mb-6">
            <form onSubmit={handleSearch}>
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-4 shadow-2xl">
                <p className="text-white/60 text-xs font-semibold mb-3 text-center">
                  Nhập SĐT hoặc Mã hội viên
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      ref={inputRef}
                      type="text"
                      inputMode="text"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="09xx... hoặc BS-2026-..."
                      className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-white/15 border border-white/20 text-white placeholder-white/30 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400/40 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || query.trim().length < 3}
                    className="flex items-center gap-1.5 px-5 py-3.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:scale-100"
                  >
                    {loading ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
                  </button>
                </div>

                {/* Error */}
                {error && (
                  <p className="text-red-300 text-xs font-semibold mt-2 flex items-center gap-1">
                    <AlertCircle size={12} /> {error}
                  </p>
                )}
              </div>
            </form>
          </div>

          {/* Loading */}
          {loading && (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="bg-white/10 backdrop-blur-sm rounded-3xl border border-white/10 p-6 animate-pulse">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-14 w-14 rounded-2xl bg-white/10 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-white/10 rounded-xl w-3/4" />
                      <div className="h-3 bg-white/5 rounded-xl w-1/2" />
                    </div>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full mb-4" />
                  <div className="grid grid-cols-2 gap-3">
                    {[1,2,3,4].map(j => <div key={j} className="h-8 bg-white/5 rounded-xl" />)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {!loading && results && results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/60 text-xs font-semibold">
                  Tìm thấy <span className="text-yellow-400 font-bold">{results.length}</span> kết quả
                </p>
                <button
                  onClick={handleClear}
                  className="text-white/40 text-xs hover:text-white/70 transition-colors"
                >
                  Tìm lại
                </button>
              </div>
              {results.map(m => <MembershipCard key={m.id} member={m} />)}
            </div>
          )}

          {/* Not found */}
          {!loading && notFound && (
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl border border-white/10 p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 mx-auto mb-4">
                <Crown size={28} className="text-white/20" />
              </div>
              <h3 className="text-white font-bold text-base mb-2">Không tìm thấy hội viên</h3>
              <p className="text-white/50 text-sm">
                Không có kết quả cho <strong className="text-white/70">&quot;{query}&quot;</strong>.<br />
                Kiểm tra lại số điện thoại hoặc mã hội viên.
              </p>
              <button
                onClick={handleClear}
                className="mt-4 px-5 py-2.5 bg-white/10 border border-white/20 text-white/70 rounded-xl text-sm font-semibold hover:bg-white/20 transition-all"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Idle */}
          {!loading && !results && !notFound && !error && (
            <div className="text-center py-4">
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="flex-1 h-px bg-white/10" />
                <Sparkles size={16} className="text-yellow-400/50" />
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-8">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left">
                  <p className="text-yellow-400/70 text-[10px] font-bold uppercase tracking-wider mb-2">📱 Theo SĐT</p>
                  <p className="font-mono text-white/60 text-sm">0901 234 567</p>
                  <p className="text-white/30 text-[10px] mt-1">Số điện thoại đăng ký</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left">
                  <p className="text-yellow-400/70 text-[10px] font-bold uppercase tracking-wider mb-2">🏷 Theo mã HV</p>
                  <p className="font-mono text-white/60 text-sm">BS-2026-001</p>
                  <p className="text-white/30 text-[10px] mt-1">Mã in trên thẻ hội viên</p>
                </div>
              </div>

              {/* Benefits teaser */}
              <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border border-yellow-500/20 rounded-2xl p-5 text-left">
                <p className="text-yellow-400 text-xs font-bold mb-3 flex items-center gap-2">
                  <Crown size={14} /> Quyền lợi Hội Viên Trăm Tuổi
                </p>
                <ul className="space-y-2">
                  {[
                    'Bảo hiểm tang lễ trọn gói 10 năm',
                    'Ưu tiên phục vụ 24/7 tại mọi chi nhánh',
                    'Giảm giá dịch vụ tối đa 30%',
                    'Hỗ trợ gia đình trong lúc khó khăn',
                  ].map(b => (
                    <li key={b} className="flex items-center gap-2 text-white/60 text-xs">
                      <CheckCircle size={11} className="text-emerald-400 flex-shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="text-center py-6 px-4">
          <p className="text-white/20 text-xs">
            © 2026 BlackStones · Hội Viên Trăm Tuổi · Hotline: 1900 xxxx
          </p>
          <p className="text-white/10 text-[10px] mt-1">
            Dữ liệu được bảo mật · Thông tin chỉ hiển thị một phần
          </p>
        </footer>
      </div>
    </div>
  );
}
