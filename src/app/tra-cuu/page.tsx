'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, RefreshCw, AlertCircle, ShieldCheck, Lock, ArrowLeft } from 'lucide-react';
import Image from 'next/image';

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

const STATUS_CONFIG: Record<string, { color: string; dot: string }> = {
  active: { color: 'text-emerald-600', dot: 'bg-emerald-500' },
  pending: { color: 'text-amber-600', dot: 'bg-amber-500' },
  expired: { color: 'text-red-600', dot: 'bg-red-500' },
  terminated: { color: 'text-gray-500', dot: 'bg-gray-400' },
  completed: { color: 'text-blue-600', dot: 'bg-blue-500' },
};

/* ─────────────────── Field Row ─────────────────── */
function DottedRow({ label, value }: { label: string; value: string }) {
  // Bolding value specifically to make it stand out against the labels
  return (
    <div className="flex flex-col sm:flex-row sm:items-end mb-3 sm:mb-6 w-full group gap-0.5 sm:gap-0">
      <span className="text-[#1a2a50] font-medium text-sm sm:text-lg whitespace-nowrap">{label}:</span>

      {/* Container display flexible cho phần giá trị và đường chấm */}
      <div className="sm:ml-2 flex-1 flex flex-wrap items-end relative overflow-hidden">
        {/* Phần giá trị thực tế */}
        <span className="text-[#1a2a50] font-bold text-sm sm:text-lg z-10 sm:px-3 bg-[#fafafa] sm:bg-white break-words">{value}</span>
        {/* Đường gạch chấm chạy tuốt ra cuối - chỉ hiển thị trên desktop */}
        <div className="hidden sm:block absolute bottom-1.5 sm:bottom-2 left-0 w-full border-b-[2.5px] border-dotted border-gray-300 group-hover:border-[#d4af37]/50 transition-colors -z-0"></div>
      </div>
    </div>
  );
}

/* ─────────────────── Membership Card ─────────────────── */
function MembershipCard({ member }: { member: MemberResult }) {
  const config = STATUS_CONFIG[member.status] || STATUS_CONFIG.terminated;

  const regDate = member.registered_date ? new Date(member.registered_date).toLocaleDateString('vi-VN') : '—';
  const expDate = member.expiry_date ? new Date(member.expiry_date).toLocaleDateString('vi-VN') : '—';

  return (
    <div className="mt-6 sm:mt-8 relative w-full border border-[#e5e7eb] bg-[#fafafa] sm:bg-white p-4 sm:p-10 sm:px-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] max-w-4xl mx-auto rounded-xl">

      {/* Decorative top border in gold gradient */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#d4af37] rounded-t-xl" />

      {/* Status Badge (Top Right) */}
      <div className={`absolute top-4 sm:top-8 right-4 sm:right-10 flex items-center gap-1.5 ${config.color} border-b-2 border-dotted border-current font-bold text-xs sm:text-base px-1 pb-0.5 tracking-wide`}>
        <span className={`w-2 h-2 rounded-full ${config.dot} animate-pulse`}></span>
        {member.status_label}
      </div>

      <div className="text-center mb-6 sm:mb-10 pt-8 sm:pt-0">
        <h2 className="text-[#1a2a50] text-base sm:text-2xl font-bold uppercase tracking-wider flex items-center justify-center gap-2 flex-wrap">
          <ShieldCheck className="text-[#d4af37]" size={22} />
          <span>Thông tin Hội Viên Trăm Tuổi</span>
        </h2>
        <div className="w-16 h-0.5 bg-[#d4af37] mx-auto mt-3 opacity-50"></div>
      </div>

      <div className="flex flex-col space-y-2">
        <DottedRow label="Mã hội viên" value={member.member_code} />
        <DottedRow label="Tên hội viên" value={member.full_name} />
        <DottedRow label="Ngày ký kết" value={regDate} />
        <DottedRow label="Ngày hết hạn" value={expDate} />
        <DottedRow label="Địa chỉ" value={member.address || '—'} />
        <DottedRow label="Người thụ hưởng 1" value={member.beneficiary_1 || '—'} />
        <DottedRow label="Người thụ hưởng 2" value={member.beneficiary_2 || '—'} />
        <DottedRow label="Số tiền đã đóng" value={member.contract_value ? `${Number(member.contract_value).toLocaleString('vi-VN')} VNĐ` : '—'} />
        <DottedRow label="Sale phụ trách" value={member.consultant_name || '—'} />
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
    <div className="mt-6 sm:mt-8 relative w-full border border-[#e5e7eb] bg-[#fafafa] sm:bg-white p-4 sm:p-10 sm:px-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] max-w-4xl mx-auto rounded-xl">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#d4af37] rounded-t-xl" />

      <div className="absolute top-4 sm:top-8 right-4 sm:right-10 flex items-center gap-1.5 text-amber-600 border-b-2 border-dotted border-current font-bold text-xs sm:text-base px-1 pb-0.5 tracking-wide">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
        {row.order_status || 'Chờ duyệt'}
      </div>

      <div className="text-center mb-6 sm:mb-10 pt-8 sm:pt-0">
        <h2 className="text-[#1a2a50] text-base sm:text-2xl font-bold uppercase tracking-wider flex items-center justify-center gap-2 flex-wrap">
          <ShieldCheck className="text-[#d4af37]" size={22} />
          <span>Hợp Đồng Khách Hàng Trăm Tuổi</span>
        </h2>
        {row.order_code && (
          <p className="text-gray-400 text-xs sm:text-sm font-mono mt-1">Mã đơn: {row.order_code}</p>
        )}
        <div className="w-16 h-0.5 bg-[#d4af37] mx-auto mt-3 opacity-50"></div>
      </div>

      <div className="flex flex-col space-y-2">
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
        <h2 className="text-lg sm:text-2xl font-bold text-[#1a2a50] mb-1 sm:mb-2 tracking-wide">
          Tra Cứu Khách Hàng Trăm Tuổi
        </h2>
        <p className="text-gray-500 text-xs sm:text-base font-medium">
          (Nhập Số điện thoại để tra cứu hợp đồng nền Trăm Tuổi)
        </p>
      </div>

      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSearch} className="flex flex-col gap-4 justify-center">
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <div className="relative w-full shadow-sm">
              <input
                ref={inputRef}
                type="text"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Nhập số điện thoại..."
                className="w-full px-4 sm:px-6 py-3 sm:py-4 border-[2px] border-gray-200 rounded-xl text-base sm:text-lg text-[#1a2a50] font-medium placeholder-gray-400 focus:outline-none focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/10 transition-all bg-white"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center mt-2 gap-3 sm:gap-0">
            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="w-full sm:w-auto px-8 sm:px-12 py-3 sm:py-4 bg-gradient-to-r from-[#1a2a50] to-[#25396b] hover:from-[#0d162a] hover:to-[#1a2a50] text-[#d4af37] border border-[#1a2a50] rounded-xl text-base sm:text-lg font-bold transition-all shadow-[0_4px_14px_0_rgba(26,42,80,0.39)] disabled:opacity-60 disabled:shadow-none flex items-center justify-center gap-2 uppercase tracking-wide min-h-[48px]"
            >
              {loading ? (<><RefreshCw size={20} className="animate-spin" /> Đang tìm...</>) : (<>Tìm kiếm</>)}
            </button>
            {phone && (
              <button
                type="button"
                onClick={handleClear}
                className="w-full sm:w-auto sm:ml-4 px-6 py-3 sm:py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-base sm:text-lg font-bold transition-all shadow-sm flex items-center justify-center min-h-[48px]"
                title="Xoá nội dung"
              >
                Làm mới
              </button>
            )}
          </div>
        </form>

        {error && (
          <div className="text-red-500 text-center mt-3 font-medium flex justify-center items-center gap-1">
            <AlertCircle size={16} /> {error}
          </div>
        )}
      </div>

      {!loading && results && results.length > 0 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">
          {results.map((r) => (<KhttCard key={r.getfly_order_id} row={r} />))}
        </div>
      )}

      {!loading && notFound && (
        <div className="mt-8 sm:mt-12 text-center py-8 sm:py-12 px-4 border border-gray-100 bg-white max-w-4xl mx-auto rounded-xl shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-[#1a2a50] mb-2">Không tìm thấy dữ liệu</h3>
          <p className="text-gray-500 max-w-md mx-auto text-sm sm:text-base">
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
    <div className="min-h-screen bg-[#f8f9fa] font-sans pb-20 relative">
      {/* Header Bar */}
      <div className="w-full bg-[#1a2a50] h-4"></div>

      {/* Top Left Logo Area */}
      <div className="relative sm:absolute sm:top-8 sm:left-8 z-10 flex flex-col items-center sm:items-start group cursor-pointer transition-all pt-6 sm:pt-0">
        {/* Đổi nền box thành màu Xanh Navy để logo trắng nổi bật hoàn toàn */}
        <div className="bg-[#1a2a50] p-2 sm:px-4 sm:py-3 rounded-xl shadow-md border border-[#1a2a50]/20 group-hover:shadow-lg">
          <Image
            src="/blackstones-logo.webp"
            alt="BlackStones Logo"
            width={160}
            height={50}
            className="h-7 sm:h-10 w-auto object-contain"
          />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-6 sm:pt-20">
        {/* Title Section */}
        <div className="text-center mb-5 sm:mb-7">
          <h1 className="text-xl sm:text-3xl font-bold text-[#1a2a50] mb-2 sm:mb-3 tracking-wide">
            Tra Cứu Trăm Tuổi – <span className="text-[#d4af37]">Blackstones Lifecare</span>
          </h1>
        </div>

        {/* ── Tab switcher: Hội Viên / Khách Hàng ── */}
        <div className="flex justify-center mb-6 sm:mb-10">
          <div className="inline-flex bg-gray-100 rounded-2xl p-1.5 shadow-inner">
            {([
              { key: 'hoi-vien', label: 'Hội Viên Trăm Tuổi' },
              { key: 'khach-hang', label: 'Khách Hàng Trăm Tuổi' },
            ] as const).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setSearchTab(t.key)}
                className={`px-4 sm:px-7 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-bold transition-all ${
                  searchTab === t.key
                    ? 'bg-[#1a2a50] text-[#d4af37] shadow'
                    : 'text-gray-500 hover:text-[#1a2a50]'
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
          <h2 className="text-lg sm:text-2xl font-bold text-[#1a2a50] mb-1 sm:mb-2 tracking-wide">
            Tra Cứu Hội Viên Trăm Tuổi
          </h2>
          <p className="text-gray-500 text-xs sm:text-base font-medium">
            {step === 'phone'
              ? '(Nhập Số điện thoại của khách hàng để tra cứu)'
              : '(Nhập CCCD của hội viên để xác thực và xem thông tin)'}
          </p>
        </div>

        {/* Search Box — 2 bước: SĐT → mật khẩu CCCD */}
        <div className="max-w-3xl mx-auto">
          {step === 'phone' && !results && (
            <form onSubmit={handlePhone} className="flex flex-col gap-4 justify-center">
              <div className="relative w-full shadow-sm">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={phoneRef}
                  type="text"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setNotFound(false); setError(''); }}
                  placeholder="Nhập số điện thoại..."
                  className="w-full pl-12 pr-4 sm:pr-6 py-3 sm:py-4 border-[2px] border-gray-200 rounded-xl text-base sm:text-lg text-[#1a2a50] font-medium placeholder-gray-400 focus:outline-none focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/10 transition-all bg-white"
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-center mt-2 gap-3 sm:gap-0">
                <button
                  type="submit"
                  disabled={loading || !phone.trim()}
                  className="w-full sm:w-auto px-8 sm:px-12 py-3 sm:py-4 bg-gradient-to-r from-[#1a2a50] to-[#25396b] hover:from-[#0d162a] hover:to-[#1a2a50] text-[#d4af37] border border-[#1a2a50] rounded-xl text-base sm:text-lg font-bold transition-all shadow-[0_4px_14px_0_rgba(26,42,80,0.39)] disabled:opacity-60 disabled:shadow-none flex items-center justify-center gap-2 uppercase tracking-wide min-h-[48px]"
                >
                  {loading ? (<><RefreshCw size={20} className="animate-spin" /> Đang tìm...</>) : (<>Tìm kiếm</>)}
                </button>
                {phone && (
                  <button
                    type="button"
                    onClick={resetAll}
                    className="w-full sm:w-auto sm:ml-4 px-6 py-3 sm:py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-base sm:text-lg font-bold transition-all shadow-sm flex items-center justify-center min-h-[48px]"
                  >
                    Làm mới
                  </button>
                )}
              </div>
            </form>
          )}

          {step === 'password' && !results && (
            <form onSubmit={handleCccd} className="flex flex-col gap-4 justify-center">
              <div className="text-center text-emerald-600 text-sm sm:text-base font-medium flex items-center justify-center gap-1.5">
                <ShieldCheck size={18} /> {matchCount > 1 ? `Tìm thấy ${matchCount} hợp đồng` : 'Đã tìm thấy hội viên'}. Nhập CCCD để xác thực.
              </div>
              <div className="relative w-full shadow-sm">
                <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={cccdRef}
                  type="text"
                  inputMode="numeric"
                  value={cccd}
                  onChange={(e) => { setCccd(e.target.value); setError(''); }}
                  placeholder="Nhập CCCD của hội viên..."
                  className="w-full pl-12 pr-4 sm:pr-6 py-3 sm:py-4 border-[2px] border-gray-200 rounded-xl text-base sm:text-lg text-[#1a2a50] font-medium placeholder-gray-400 focus:outline-none focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/10 transition-all bg-white"
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-center mt-2 gap-3 sm:gap-0">
                <button
                  type="submit"
                  disabled={loading || !cccd.trim()}
                  className="w-full sm:w-auto px-8 sm:px-12 py-3 sm:py-4 bg-gradient-to-r from-[#1a2a50] to-[#25396b] hover:from-[#0d162a] hover:to-[#1a2a50] text-[#d4af37] border border-[#1a2a50] rounded-xl text-base sm:text-lg font-bold transition-all shadow-[0_4px_14px_0_rgba(26,42,80,0.39)] disabled:opacity-60 disabled:shadow-none flex items-center justify-center gap-2 uppercase tracking-wide min-h-[48px]"
                >
                  {loading ? (<><RefreshCw size={20} className="animate-spin" /> Đang xác thực...</>) : (<>Xác nhận</>)}
                </button>
                <button
                  type="button"
                  onClick={backToPhone}
                  className="w-full sm:w-auto sm:ml-4 px-6 py-3 sm:py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-base sm:text-lg font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 min-h-[48px]"
                >
                  <ArrowLeft size={18} /> Đổi số điện thoại
                </button>
              </div>
            </form>
          )}

          {/* Validation Error Message */}
          {error && (
            <div className="text-red-500 text-center mt-3 font-medium flex justify-center items-center gap-1">
              <AlertCircle size={16} /> {error}
            </div>
          )}
        </div>

        {/* Loading Spinner Skeleton */}
        {loading && (
          <div className="mt-8 sm:mt-16 max-w-4xl mx-auto border border-gray-100 bg-white p-4 sm:p-10 animate-pulse rounded-xl shadow-sm">
            <div className="h-6 sm:h-8 bg-gray-100 rounded-full w-2/3 sm:w-1/3 mx-auto mb-6 sm:mb-10"></div>
            <div className="space-y-3 sm:space-y-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="flex items-end">
                  <div className="h-4 bg-gray-100 rounded w-1/3 sm:w-1/4 mr-4 mb-2"></div>
                  <div className="h-0.5 bg-gray-100 rounded flex-1 mb-2"></div>
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
                 className="px-8 py-3 border-2 border-[#1a2a50] text-[#1a2a50] font-semibold rounded-lg hover:bg-[#1a2a50] hover:text-[#d4af37] transition-all min-h-[44px] inline-flex items-center justify-center gap-2"
               >
                 <RefreshCw size={18} /> Tra cứu hội viên khác
               </button>
             </div>
          </div>
        )}

        {/* Not Found */}
        {!loading && notFound && (
          <div className="mt-8 sm:mt-16 text-center py-8 sm:py-12 px-4 border border-gray-100 bg-white max-w-4xl mx-auto rounded-xl shadow-sm">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5">
              <AlertCircle size={32} className="text-gray-400 sm:hidden" />
              <AlertCircle size={40} className="text-gray-400 hidden sm:block" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[#1a2a50] mb-2">Không tìm thấy dữ liệu</h3>
            <p className="text-gray-500 max-w-md mx-auto text-sm sm:text-base">
              Hệ thống không tìm thấy hội viên nào khớp Số điện thoại này.<br /> Vui lòng kiểm tra lại số điện thoại của khách hàng.
            </p>
            <button
               onClick={resetAll}
               className="mt-6 px-8 py-3 border-2 border-[#1a2a50] text-[#1a2a50] font-semibold rounded-lg hover:bg-[#1a2a50] hover:text-[#d4af37] transition-all min-h-[44px]"
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
