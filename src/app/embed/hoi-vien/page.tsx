'use client';

/* ════════════════════════════════════════════════════════════════
   Widget NHÚNG — Tra Cứu Hội Viên Trăm Tuổi
   Nguồn: đọc TRỰC TIẾP Google Sheet "Hợp Đồng Bán" qua /api/membership/lookup-sheet.
   Bảo mật 2 bước: nhập SĐT → nhập mật khẩu = CCCD của hội viên → xem thẻ.
   URL nhúng: /embed/hoi-vien
   ════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react';
import { Playfair_Display } from 'next/font/google';
import { Search, RefreshCw, AlertCircle, ShieldCheck, Lock, ArrowLeft } from 'lucide-react';

const serif = Playfair_Display({ subsets: ['latin', 'vietnamese'], weight: ['500', '600', '700'], display: 'swap' });

interface MemberResult {
  id: string;
  member_code: string;
  full_name: string;
  status: string;
  status_label: string;
  registered_date: string;
  expiry_date: string;
  address?: string;
  beneficiary_1?: string;
  beneficiary_2?: string;
  contract_value?: number;
  consultant_name?: string;
}

const STATUS: Record<string, { dot: string; pill: string }> = {
  active:     { dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending:    { dot: 'bg-amber-500',   pill: 'bg-amber-50 text-amber-700 border-amber-200' },
  expired:    { dot: 'bg-rose-500',    pill: 'bg-rose-50 text-rose-700 border-rose-200' },
  terminated: { dot: 'bg-gray-400',    pill: 'bg-gray-100 text-gray-600 border-gray-200' },
  completed:  { dot: 'bg-blue-500',    pill: 'bg-blue-50 text-blue-700 border-blue-200' },
};

function fmtVnd(n?: number) {
  return n ? `${Number(n).toLocaleString('vi-VN')} ₫` : '—';
}
function fmtDate(s: string | null | undefined) {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString('vi-VN');
}

function GoldDivider() {
  return (
    <div className="mx-auto mt-3 flex items-center justify-center gap-2">
      <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#d4af37]/70" />
      <span className="h-1.5 w-1.5 rotate-45 bg-[#d4af37]" />
      <span className="h-px w-8 bg-gradient-to-l from-transparent to-[#d4af37]/70" />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-2 sm:py-2.5 border-b border-dotted border-[#d4af37]/25 last:border-0">
      <span className="text-[#7a8194] text-xs sm:text-sm font-medium shrink-0">{label}:</span>
      <span className="text-[#14213d] text-sm sm:text-[15px] font-semibold [text-wrap:pretty]">{value}</span>
    </div>
  );
}

function MemberCard({ m }: { m: MemberResult }) {
  const st = STATUS[m.status] || STATUS.terminated;
  return (
    <div className="mt-5 sm:mt-7 relative w-full">
      <div className="relative bg-[#fffdf8] rounded-2xl border border-[#ece1c2] shadow-[0_24px_60px_-24px_rgba(20,33,61,0.35)] overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#bf953f]" />
        <div className="pointer-events-none absolute inset-2.5 sm:inset-4 top-4 sm:top-6 rounded-xl border border-[#d4af37]/20" />
        <div className="relative px-4 py-5 sm:px-9 sm:py-8">
          <div className={`absolute right-4 top-4 sm:right-7 sm:top-7 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] sm:text-xs font-semibold ${st.pill}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${st.dot} animate-pulse`} />
            {m.status_label}
          </div>

          <div className="text-center mb-5 sm:mb-7 pt-6 sm:pt-1">
            <div className="mx-auto mb-3 h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-[#14213d] ring-1 ring-[#d4af37]/50 flex items-center justify-center">
              <ShieldCheck className="text-[#d4af37]" size={22} />
            </div>
            <div className="text-[10px] sm:text-[11px] tracking-[0.28em] text-[#b8941f] font-semibold uppercase">Blackstones Lifecare</div>
            <h3 className={`${serif.className} text-[#14213d] text-xl sm:text-2xl font-semibold mt-1`}>Hội Viên Trăm Tuổi</h3>
            <GoldDivider />
          </div>

          <div className="flex flex-col">
            <Row label="Mã hội viên" value={m.member_code || '—'} />
            <Row label="Tên hội viên" value={m.full_name || '—'} />
            <Row label="Ngày ký kết" value={fmtDate(m.registered_date)} />
            <Row label="Ngày hết hạn" value={fmtDate(m.expiry_date)} />
            <Row label="Địa chỉ" value={m.address || '—'} />
            <Row label="Người thụ hưởng 1" value={m.beneficiary_1 || '—'} />
            <Row label="Người thụ hưởng 2" value={m.beneficiary_2 || '—'} />
            <Row label="Số tiền đã đóng" value={fmtVnd(m.contract_value)} />
            <Row label="Sale phụ trách" value={m.consultant_name || '—'} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HoiVienEmbedPage() {
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

  // Báo chiều cao cho trang cha để tự co giãn iframe.
  useEffect(() => {
    const send = () => {
      try {
        const h = Math.max(
          document.documentElement.scrollHeight,
          document.body ? document.body.scrollHeight : 0,
          document.body ? document.body.offsetHeight : 0,
        );
        window.parent?.postMessage({ type: 'hoivien-embed-height', height: h }, '*');
      } catch { /* ignore */ }
    };
    send();
    const ro = new ResizeObserver(send);
    ro.observe(document.documentElement);
    if (document.body) ro.observe(document.body);
    window.addEventListener('load', send);
    window.addEventListener('resize', send);
    const timers = [100, 300, 600, 1200, 2500].map((ms) => window.setTimeout(send, ms));
    return () => {
      ro.disconnect();
      window.removeEventListener('load', send);
      window.removeEventListener('resize', send);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [step, results, notFound, loading, error]);

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

  const inputCls = 'w-full pl-12 pr-4 py-3.5 rounded-xl border border-[#e3d9bf] bg-white text-[#14213d] text-base font-medium placeholder-[#9aa1b1] shadow-sm focus:outline-none focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/15 transition-all';
  const btnPrimary = 'w-full sm:w-auto px-9 sm:px-12 py-3.5 rounded-xl bg-gradient-to-b from-[#243a66] to-[#14213d] text-[#e8d49a] text-sm font-semibold uppercase tracking-[0.12em] ring-1 ring-[#d4af37]/30 shadow-[0_12px_26px_-10px_rgba(20,33,61,0.65)] hover:from-[#2c4578] hover:to-[#1a2a50] disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2 min-h-[50px]';
  const btnGhost = 'w-full sm:w-auto px-6 py-3.5 rounded-xl border border-[#e3d9bf] bg-white text-[#6b7280] text-sm font-semibold hover:bg-[#faf6ec] hover:text-[#14213d] transition-all shadow-sm flex items-center justify-center gap-1.5 min-h-[50px]';

  return (
    <div className="font-sans p-3 sm:p-6 bg-transparent">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-5 sm:mb-7">
          <div className="text-[10px] sm:text-[11px] tracking-[0.28em] text-[#b8941f] font-semibold uppercase">Blackstones Lifecare</div>
          <h2 className={`${serif.className} text-[#14213d] text-2xl sm:text-3xl font-semibold mt-1.5`}>
            Tra Cứu Hội Viên Trăm Tuổi
          </h2>
          <GoldDivider />
          <p className="text-[#7a8194] text-xs sm:text-sm font-medium mt-3">
            {step === 'phone'
              ? 'Nhập Số điện thoại của khách hàng để tra cứu'
              : 'Nhập CCCD của hội viên để xác thực và xem thông tin'}
          </p>
        </div>

        {step === 'phone' && !results && (
          <form onSubmit={handlePhone} className="flex flex-col gap-3.5">
            <div className="relative w-full">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#b8941f]" />
              <input
                ref={phoneRef}
                type="text"
                inputMode="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setNotFound(false); setError(''); }}
                placeholder="Nhập số điện thoại..."
                className={inputCls}
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button type="submit" disabled={loading || !phone.trim()} className={btnPrimary}>
                {loading ? (<><RefreshCw size={18} className="animate-spin" /> Đang tìm...</>) : (<>Tìm kiếm</>)}
              </button>
              {phone && (
                <button type="button" onClick={resetAll} className={btnGhost}>Làm mới</button>
              )}
            </div>
          </form>
        )}

        {step === 'password' && !results && (
          <form onSubmit={handleCccd} className="flex flex-col gap-3.5">
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
                className={inputCls}
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button type="submit" disabled={loading || !cccd.trim()} className={btnPrimary}>
                {loading ? (<><RefreshCw size={18} className="animate-spin" /> Đang xác thực...</>) : (<>Xác nhận</>)}
              </button>
              <button type="button" onClick={backToPhone} className={btnGhost}>
                <ArrowLeft size={16} /> Đổi số điện thoại
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="text-rose-600 text-center mt-3.5 font-medium flex justify-center items-center gap-1.5 text-sm">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {!loading && results && results.length > 0 && (
          <>
            {results.map((m) => (<MemberCard key={m.id} m={m} />))}
            <div className="text-center mt-5">
              <button type="button" onClick={resetAll} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#e3d9bf] bg-white px-6 py-2.5 text-sm font-semibold text-[#6b7280] shadow-sm hover:bg-[#faf6ec] hover:text-[#14213d] transition-all">
                <RefreshCw size={15} /> Tra cứu hội viên khác
              </button>
            </div>
          </>
        )}

        {!loading && notFound && (
          <div className="mt-6 text-center py-9 px-4 rounded-2xl border border-[#ece1c2] bg-[#fffdf8] shadow-[0_16px_40px_-24px_rgba(20,33,61,0.3)]">
            <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-[#faf6ec] ring-1 ring-[#d4af37]/30 flex items-center justify-center">
              <AlertCircle size={26} className="text-[#b8941f]" />
            </div>
            <h3 className={`${serif.className} text-lg sm:text-xl font-semibold text-[#14213d] mb-1`}>Không tìm thấy hội viên</h3>
            <p className="text-[#7a8194] max-w-md mx-auto text-sm">
              Không có hội viên Trăm Tuổi nào khớp số điện thoại này. Vui lòng kiểm tra lại.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
