'use client';

import { useState, useRef, useEffect } from 'react';
import { Playfair_Display } from 'next/font/google';
import { Search, RefreshCw, AlertCircle, ShieldCheck, Lock, ArrowLeft } from 'lucide-react';
import Image from 'next/image';

const serif = Playfair_Display({ subsets: ['latin', 'vietnamese'], weight: ['500', '600', '700'], display: 'swap' });

/* Dải phân cách vàng tinh tế dùng chung */
function GoldDivider() {
  return (
    <div className="mx-auto mt-3 flex items-center justify-center gap-2">
      <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#d4af37]/70" />
      <span className="h-1.5 w-1.5 rotate-45 bg-[#d4af37]" />
      <span className="h-px w-10 bg-gradient-to-l from-transparent to-[#d4af37]/70" />
    </div>
  );
}

/* ─────────────────── Types ─────────────────── */
interface MemberResult {
  id: string;
  member_code: string;
  full_name: string;
  status: string;
  status_label: string;
  registered_date: string;
  expiry_date: string;
  consultant_name?: string;
  address?: string;
  beneficiary_1?: string;
  beneficiary_2?: string;
  contract_value?: number;
}

const STATUS_CONFIG: Record<string, { dot: string; pill: string }> = {
  active:     { dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending:    { dot: 'bg-amber-500',   pill: 'bg-amber-50 text-amber-700 border-amber-200' },
  expired:    { dot: 'bg-rose-500',    pill: 'bg-rose-50 text-rose-700 border-rose-200' },
  terminated: { dot: 'bg-gray-400',    pill: 'bg-gray-100 text-gray-600 border-gray-200' },
  completed:  { dot: 'bg-blue-500',    pill: 'bg-blue-50 text-blue-700 border-blue-200' },
};

/* ─────────────────── Field Row (leader dots kiểu chứng nhận) ─────────────────── */
function DottedRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-2.5 sm:py-3 border-b border-dotted border-[#d4af37]/25 last:border-0">
      <span className="text-[#7a8194] text-sm sm:text-[15px] font-medium shrink-0">{label}:</span>
      <span className="text-[#14213d] text-sm sm:text-lg font-semibold [text-wrap:pretty]">{value}</span>
    </div>
  );
}

/* ─────────────────── Membership Card (chứng nhận khung vàng) ─────────────────── */
function MembershipCard({ member }: { member: MemberResult }) {
  const config = STATUS_CONFIG[member.status] || STATUS_CONFIG.terminated;
  const regDate = member.registered_date ? new Date(member.registered_date).toLocaleDateString('vi-VN') : '—';
  const expDate = member.expiry_date ? new Date(member.expiry_date).toLocaleDateString('vi-VN') : '—';

  return (
    <div className="mt-7 sm:mt-9 relative w-full max-w-3xl mx-auto">
      <div className="relative bg-[#fffdf8] rounded-2xl border border-[#ece1c2] shadow-[0_30px_70px_-30px_rgba(20,33,61,0.4)] overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#bf953f]" />
        <div className="pointer-events-none absolute inset-4 sm:inset-6 top-6 sm:top-8 rounded-xl border border-[#d4af37]/20" />
        <div className="relative px-5 py-6 sm:px-12 sm:py-10">
          <div className={`absolute right-5 top-5 sm:right-10 sm:top-9 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs sm:text-sm font-semibold ${config.pill}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${config.dot} animate-pulse`} />
            {member.status_label}
          </div>

          <div className="text-center mb-6 sm:mb-9 pt-7 sm:pt-1">
            <div className="mx-auto mb-3 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-[#14213d] ring-1 ring-[#d4af37]/50 flex items-center justify-center">
              <ShieldCheck className="text-[#d4af37]" size={26} />
            </div>
            <div className="text-[11px] tracking-[0.28em] text-[#b8941f] font-semibold uppercase">Blackstones Lifecare</div>
            <h2 className={`${serif.className} text-[#14213d] text-2xl sm:text-3xl font-semibold mt-1`}>Hội Viên Trăm Tuổi</h2>
            <GoldDivider />
          </div>

          <div className="flex flex-col">
            <DottedRow label="Mã hội viên" value={member.member_code} />
            <DottedRow label="Tên hội viên" value={member.full_name} />
            <DottedRow label="Ngày ký kết" value={regDate} />
            <DottedRow label="Ngày hết hạn" value={expDate} />
            <DottedRow label="Địa chỉ" value={member.address || '—'} />
            <DottedRow label="Người thụ hưởng 1" value={member.beneficiary_1 || '—'} />
            <DottedRow label="Người thụ hưởng 2" value={member.beneficiary_2 || '—'} />
            <DottedRow label="Số tiền đã đóng" value={member.contract_value ? `${Number(member.contract_value).toLocaleString('vi-VN')} ₫` : '—'} />
            <DottedRow label="Sale phụ trách" value={member.consultant_name || '—'} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── KHTT (Khách Hàng Trăm Tuổi) ─────────────────── */
interface KhttResult {
  getfly_order_id: string;
  order_code: string | null;
  order_date: string | null;
  order_status: string | null;
  customer_code: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  package_name: string | null;
  total_value: number;
  paid_amount: number;
  remaining_amount: number;
  beneficiary_name: string | null;
  beneficiary_phone: string | null;
  expiry_date?: string | null;
}

function fmtVnd(n: number) {
  return `${Number(n || 0).toLocaleString('vi-VN')} VNĐ`;
}
function fmtKhttDate(s: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString('vi-VN');
}

function KhttCard({ row }: { row: KhttResult }) {
  return (
    <div className="mt-7 sm:mt-9 relative w-full max-w-3xl mx-auto">
      <div className="relative bg-[#fffdf8] rounded-2xl border border-[#ece1c2] shadow-[0_30px_70px_-30px_rgba(20,33,61,0.4)] overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#bf953f]" />
        <div className="pointer-events-none absolute inset-4 sm:inset-6 top-6 sm:top-8 rounded-xl border border-[#d4af37]/20" />
        <div className="relative px-5 py-6 sm:px-12 sm:py-10">
          <div className="absolute right-5 top-5 sm:right-10 sm:top-9 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-3 py-1 text-xs sm:text-sm font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            {row.order_status || 'Chờ duyệt'}
          </div>

          <div className="text-center mb-6 sm:mb-9 pt-7 sm:pt-1">
            <div className="mx-auto mb-3 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-[#14213d] ring-1 ring-[#d4af37]/50 flex items-center justify-center">
              <ShieldCheck className="text-[#d4af37]" size={26} />
            </div>
            <div className="text-[11px] tracking-[0.28em] text-[#b8941f] font-semibold uppercase">Blackstones Lifecare</div>
            <h2 className={`${serif.className} text-[#14213d] text-2xl sm:text-3xl font-semibold mt-1`}>Khách Hàng Trăm Tuổi</h2>
            {row.order_code && (
              <p className="text-[#9aa1b1] text-xs sm:text-sm font-mono mt-1.5">Mã đơn: {row.order_code}</p>
            )}
            <GoldDivider />
          </div>

          <div className="flex flex-col">
            <DottedRow label="Mã khách hàng" value={row.customer_code || '—'} />
            <DottedRow label="Họ tên" value={row.customer_name || '—'} />
            <DottedRow label="Số điện thoại" value={row.customer_phone || '—'} />
            <DottedRow label="Gói dịch vụ" value={row.package_name || '—'} />
            <DottedRow label="Tổng giá trị gói" value={fmtVnd(row.total_value)} />
            <DottedRow label="Số tiền đặt cọc" value={fmtVnd(row.paid_amount)} />
            <DottedRow label="Số tiền còn lại" value={fmtVnd(row.remaining_amount)} />
            <DottedRow label="Ngày đặt hàng" value={fmtKhttDate(row.order_date)} />
            <DottedRow label="Ngày hết hạn" value={fmtKhttDate(row.expiry_date ?? null)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function KhttLookupSection() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<KhttResult[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const val = phone.trim();
    if (!val) { setError('Vui lòng nhập Số điện thoại'); return; }

    setLoading(true);
    setError('');
    setResults(null);
    setNotFound(false);
    try {
      const res = await fetch(`/api/getfly-khtt?phone=${encodeURIComponent(val)}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Lỗi hệ thống'); return; }
      if (data.found) setResults(data.results);
      else setNotFound(true);
    } catch {
      setError('Không thể kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setPhone('');
    setResults(null);
    setNotFound(false);
    setError('');
    inputRef.current?.focus();
  }

  return (
    <div>
      <div className="text-center mb-6 sm:mb-8">
        <div className="text-[10px] sm:text-[11px] tracking-[0.28em] text-[#b8941f] font-semibold uppercase">Blackstones Lifecare</div>
        <h2 className={`${serif.className} text-[#14213d] text-2xl sm:text-3xl font-semibold mt-1.5`}>
          Tra Cứu Khách Hàng Trăm Tuổi
        </h2>
        <GoldDivider />
        <p className="text-[#7a8194] text-xs sm:text-sm font-medium mt-3">
          Nhập Số điện thoại để tra cứu hợp đồng nền Trăm Tuổi
        </p>
      </div>

      <div className="max-w-xl mx-auto">
        <form onSubmit={handleSearch} className="flex flex-col gap-3.5 justify-center">
          <div className="relative w-full">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#b8941f]" />
            <input
              ref={inputRef}
              type="text"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Nhập số điện thoại..."
              className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-[#e3d9bf] bg-white text-[#14213d] text-base font-medium placeholder-[#9aa1b1] shadow-sm focus:outline-none focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/15 transition-all"
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="w-full sm:w-auto px-9 sm:px-12 py-3.5 rounded-xl bg-gradient-to-b from-[#243a66] to-[#14213d] text-[#e8d49a] text-sm font-semibold uppercase tracking-[0.12em] ring-1 ring-[#d4af37]/30 shadow-[0_12px_26px_-10px_rgba(20,33,61,0.65)] hover:from-[#2c4578] hover:to-[#1a2a50] disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2 min-h-[50px]"
            >
              {loading ? (<><RefreshCw size={18} className="animate-spin" /> Đang tìm...</>) : (<>Tìm kiếm</>)}
            </button>
            {phone && (
              <button
                type="button"
                onClick={handleClear}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-[#e3d9bf] bg-white text-[#6b7280] text-sm font-semibold hover:bg-[#faf6ec] hover:text-[#14213d] transition-all shadow-sm flex items-center justify-center min-h-[50px]"
                title="Xoá nội dung"
              >
                Làm mới
              </button>
            )}
          </div>
        </form>

        {error && (
          <div className="text-rose-600 text-center mt-3.5 font-medium flex justify-center items-center gap-1.5 text-sm">
            <AlertCircle size={15} /> {error}
          </div>
        )}
      </div>

      {!loading && results && results.length > 0 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">
          {results.map((r) => (<KhttCard key={r.getfly_order_id} row={r} />))}
        </div>
      )}

      {!loading && notFound && (
        <div className="mt-8 sm:mt-10 text-center py-10 px-4 rounded-2xl border border-[#ece1c2] bg-[#fffdf8] max-w-xl mx-auto shadow-[0_20px_50px_-30px_rgba(20,33,61,0.35)]">
          <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-[#faf6ec] ring-1 ring-[#d4af37]/30 flex items-center justify-center">
            <AlertCircle size={26} className="text-[#b8941f]" />
          </div>
          <h3 className={`${serif.className} text-lg sm:text-xl font-semibold text-[#14213d] mb-1`}>Không tìm thấy dữ liệu</h3>
          <p className="text-[#7a8194] max-w-md mx-auto text-sm">
            Không có khách hàng Trăm Tuổi nào khớp Số điện thoại này. Vui lòng kiểm tra lại.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── Main Page ─────────────────── */
export default function PublicLookupPage() {
  const [searchTab, setSearchTab] = useState<'hoi-vien' | 'khach-hang'>('hoi-vien');
  // Tra cứu hội viên 2 bước: nhập SĐT → nhập mật khẩu = CCCD → xem thẻ.
  const [step, setStep] = useState<'phone' | 'password'>('phone');
  const [phone, setPhone] = useState('');
  const [cccd, setCccd] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MemberResult[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const phoneRef = useRef<HTMLInputElement>(null);
  const cccdRef = useRef<HTMLInputElement>(null);

  useEffect(() => { phoneRef.current?.focus(); }, []);

  // Bước 1 — tìm theo SĐT (chưa trả thông tin, chỉ kiểm tra tồn tại).
  async function handlePhone(e?: React.FormEvent) {
    e?.preventDefault();
    const val = phone.trim();
    if (!val) { setError('Vui lòng nhập Số điện thoại'); return; }
    setLoading(true); setError(''); setResults(null); setNotFound(false);
    try {
      const res = await fetch(`/api/membership/lookup-sheet?phone=${encodeURIComponent(val)}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Lỗi hệ thống'); return; }
      if (data.found && data.locked) {
        setMatchCount(data.count || 0);
        setCccd('');
        setStep('password');
        setTimeout(() => cccdRef.current?.focus(), 50);
      } else {
        setNotFound(true);
      }
    } catch {
      setError('Không thể kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  // Bước 2 — nhập CCCD (mật khẩu) để mở khoá.
  async function handleCccd(e?: React.FormEvent) {
    e?.preventDefault();
    const val = cccd.trim();
    if (!val) { setError('Vui lòng nhập CCCD của hội viên'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/membership/lookup-sheet?phone=${encodeURIComponent(phone.trim())}&cccd=${encodeURIComponent(val)}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Lỗi hệ thống'); return; }
      if (data.found && !data.locked && data.results) {
        setResults(data.results);
      } else if (data.wrongPassword) {
        setError('CCCD không đúng. Vui lòng nhập đúng CCCD của hội viên.');
      } else {
        setNotFound(true);
        setStep('phone');
      }
    } catch {
      setError('Không thể kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  function resetAll() {
    setStep('phone'); setPhone(''); setCccd(''); setMatchCount(0);
    setResults(null); setNotFound(false); setError('');
    setTimeout(() => phoneRef.current?.focus(), 50);
  }

  function backToPhone() {
    setStep('phone'); setCccd(''); setError(''); setResults(null);
    setTimeout(() => phoneRef.current?.focus(), 50);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fbf9f3] via-[#f7f5ef] to-[#fbfaf6] font-sans pb-24 relative">
      {/* Header bar: navy + đường vàng mảnh */}
      <div className="w-full bg-[#14213d] h-3" />
      <div className="w-full h-px bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent" />

      {/* Logo */}
      <div className="relative sm:absolute sm:top-8 sm:left-8 z-10 flex flex-col items-center sm:items-start pt-6 sm:pt-0">
        <div className="bg-[#14213d] p-2 sm:px-4 sm:py-3 rounded-xl shadow-[0_10px_30px_-12px_rgba(20,33,61,0.6)] ring-1 ring-[#d4af37]/25">
          <Image
            src="/blackstones-logo.webp"
            alt="BlackStones Logo"
            width={160}
            height={50}
            className="h-7 sm:h-10 w-auto object-contain"
          />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-8 sm:pt-20">
        {/* Title Section */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="text-[11px] tracking-[0.3em] text-[#b8941f] font-semibold uppercase">Blackstones Lifecare</div>
          <h1 className={`${serif.className} text-2xl sm:text-4xl font-semibold text-[#14213d] mt-1.5`}>
            Tra Cứu Trăm Tuổi
          </h1>
          <GoldDivider />
        </div>

        {/* ── Tab switcher: Hội Viên / Khách Hàng ── */}
        <div className="flex justify-center mb-7 sm:mb-10">
          <div className="inline-flex bg-white rounded-full p-1 ring-1 ring-[#ece1c2] shadow-sm">
            {([
              { key: 'hoi-vien', label: 'Hội Viên Trăm Tuổi' },
              { key: 'khach-hang', label: 'Khách Hàng Trăm Tuổi' },
            ] as const).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setSearchTab(t.key)}
                className={`px-5 sm:px-8 py-2.5 rounded-full text-sm sm:text-[15px] font-semibold transition-all ${
                  searchTab === t.key
                    ? 'bg-[#14213d] text-[#e8d49a] shadow-[0_8px_20px_-8px_rgba(20,33,61,0.6)]'
                    : 'text-[#7a8194] hover:text-[#14213d]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ══════ TAB: Hội Viên Trăm Tuổi ══════ */}
        {searchTab === 'hoi-vien' && (
        <>
        <div className="text-center mb-6 sm:mb-8">
          <h2 className={`${serif.className} text-xl sm:text-2xl font-semibold text-[#14213d]`}>
            Tra Cứu Hội Viên Trăm Tuổi
          </h2>
          <p className="text-[#7a8194] text-xs sm:text-sm font-medium mt-2">
            {step === 'phone'
              ? 'Nhập Số điện thoại của khách hàng để tra cứu'
              : 'Nhập CCCD của hội viên để xác thực và xem thông tin'}
          </p>
        </div>

        {/* Search Box — 2 bước: SĐT → mật khẩu CCCD */}
        <div className="max-w-xl mx-auto">
          {step === 'phone' && !results && (
            <form onSubmit={handlePhone} className="flex flex-col gap-3.5 justify-center">
              <div className="relative w-full">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#b8941f]" />
                <input
                  ref={phoneRef}
                  type="text"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setNotFound(false); setError(''); }}
                  placeholder="Nhập số điện thoại..."
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-[#e3d9bf] bg-white text-[#14213d] text-base font-medium placeholder-[#9aa1b1] shadow-sm focus:outline-none focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/15 transition-all"
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button
                  type="submit"
                  disabled={loading || !phone.trim()}
                  className="w-full sm:w-auto px-9 sm:px-12 py-3.5 rounded-xl bg-gradient-to-b from-[#243a66] to-[#14213d] text-[#e8d49a] text-sm font-semibold uppercase tracking-[0.12em] ring-1 ring-[#d4af37]/30 shadow-[0_12px_26px_-10px_rgba(20,33,61,0.65)] hover:from-[#2c4578] hover:to-[#1a2a50] disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2 min-h-[50px]"
                >
                  {loading ? (<><RefreshCw size={18} className="animate-spin" /> Đang tìm...</>) : (<>Tìm kiếm</>)}
                </button>
                {phone && (
                  <button
                    type="button"
                    onClick={resetAll}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-[#e3d9bf] bg-white text-[#6b7280] text-sm font-semibold hover:bg-[#faf6ec] hover:text-[#14213d] transition-all shadow-sm flex items-center justify-center min-h-[50px]"
                  >
                    Làm mới
                  </button>
                )}
              </div>
            </form>
          )}

          {step === 'password' && !results && (
            <form onSubmit={handleCccd} className="flex flex-col gap-3.5 justify-center">
              <div className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 py-2 px-3 text-emerald-700 text-xs sm:text-sm font-medium">
                <ShieldCheck size={16} /> {matchCount > 1 ? `Tìm thấy ${matchCount} hợp đồng` : 'Đã tìm thấy hội viên'}. Nhập CCCD để xác thực.
              </div>
              <div className="relative w-full">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#b8941f]" />
                <input
                  ref={cccdRef}
                  type="text"
                  inputMode="numeric"
                  value={cccd}
                  onChange={(e) => { setCccd(e.target.value); setError(''); }}
                  placeholder="Nhập CCCD của hội viên..."
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-[#e3d9bf] bg-white text-[#14213d] text-base font-medium placeholder-[#9aa1b1] shadow-sm focus:outline-none focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/15 transition-all"
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button
                  type="submit"
                  disabled={loading || !cccd.trim()}
                  className="w-full sm:w-auto px-9 sm:px-12 py-3.5 rounded-xl bg-gradient-to-b from-[#243a66] to-[#14213d] text-[#e8d49a] text-sm font-semibold uppercase tracking-[0.12em] ring-1 ring-[#d4af37]/30 shadow-[0_12px_26px_-10px_rgba(20,33,61,0.65)] hover:from-[#2c4578] hover:to-[#1a2a50] disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2 min-h-[50px]"
                >
                  {loading ? (<><RefreshCw size={18} className="animate-spin" /> Đang xác thực...</>) : (<>Xác nhận</>)}
                </button>
                <button
                  type="button"
                  onClick={backToPhone}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-[#e3d9bf] bg-white text-[#6b7280] text-sm font-semibold hover:bg-[#faf6ec] hover:text-[#14213d] transition-all shadow-sm flex items-center justify-center gap-1.5 min-h-[50px]"
                >
                  <ArrowLeft size={16} /> Đổi số điện thoại
                </button>
              </div>
            </form>
          )}

          {/* Validation Error Message */}
          {error && (
            <div className="text-rose-600 text-center mt-3.5 font-medium flex justify-center items-center gap-1.5 text-sm">
              <AlertCircle size={15} /> {error}
            </div>
          )}
        </div>

        {/* Loading Spinner Skeleton */}
        {loading && (
          <div className="mt-7 sm:mt-9 max-w-3xl mx-auto rounded-2xl border border-[#ece1c2] bg-[#fffdf8] p-6 sm:p-10 animate-pulse shadow-[0_30px_70px_-30px_rgba(20,33,61,0.3)]">
            <div className="h-7 bg-[#efe6cf] rounded-full w-2/3 sm:w-1/3 mx-auto mb-8"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-3.5 bg-[#efe6cf] rounded w-1/4"></div>
                  <div className="h-px bg-[#e7dcc0] flex-1"></div>
                  <div className="h-3.5 bg-[#efe6cf] rounded w-1/3"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results Area */}
        {!loading && results && results.length > 0 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">
             {results.map((m) => (
                <MembershipCard key={m.id} member={m} />
             ))}
             <div className="text-center">
               <button
                 type="button"
                 onClick={resetAll}
                 className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#e3d9bf] bg-white px-7 py-2.5 text-sm font-semibold text-[#6b7280] shadow-sm hover:bg-[#faf6ec] hover:text-[#14213d] transition-all"
               >
                 <RefreshCw size={15} /> Tra cứu hội viên khác
               </button>
             </div>
          </div>
        )}

        {/* Not Found */}
        {!loading && notFound && (
          <div className="mt-8 sm:mt-10 text-center py-10 px-4 rounded-2xl border border-[#ece1c2] bg-[#fffdf8] max-w-xl mx-auto shadow-[0_20px_50px_-30px_rgba(20,33,61,0.35)]">
            <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-[#faf6ec] ring-1 ring-[#d4af37]/30 flex items-center justify-center">
              <AlertCircle size={26} className="text-[#b8941f]" />
            </div>
            <h3 className={`${serif.className} text-lg sm:text-xl font-semibold text-[#14213d] mb-1`}>Không tìm thấy hội viên</h3>
            <p className="text-[#7a8194] max-w-md mx-auto text-sm">
              Không có hội viên Trăm Tuổi nào khớp Số điện thoại này. Vui lòng kiểm tra lại.
            </p>
            <button
               onClick={resetAll}
               className="mt-6 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#e3d9bf] bg-white px-7 py-2.5 text-sm font-semibold text-[#6b7280] shadow-sm hover:bg-[#faf6ec] hover:text-[#14213d] transition-all"
            >
              Thử lại
            </button>
          </div>
        )}
        </>
        )}

        {/* ══════ TAB: Khách Hàng Trăm Tuổi ══════ */}
        {searchTab === 'khach-hang' && <KhttLookupSection />}

      </div>
    </div>
  );
}
