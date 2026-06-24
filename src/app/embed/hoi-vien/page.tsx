'use client';

/* ════════════════════════════════════════════════════════════════
   Widget NHÚNG — Tra Cứu Hội Viên Trăm Tuổi
   Nguồn: đọc TRỰC TIẾP Google Sheet "Hợp Đồng Bán" qua /api/membership/lookup-sheet.
   Bảo mật 2 bước: nhập SĐT → nhập mật khẩu = CCCD của hội viên → xem thẻ.
   URL nhúng: /embed/hoi-vien
   ════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react';
import { Search, RefreshCw, AlertCircle, ShieldCheck, Lock, ArrowLeft } from 'lucide-react';

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

const STATUS: Record<string, { dot: string; text: string }> = {
  active: { dot: 'bg-emerald-500', text: 'text-emerald-600' },
  pending: { dot: 'bg-amber-500', text: 'text-amber-600' },
  expired: { dot: 'bg-red-500', text: 'text-red-600' },
  terminated: { dot: 'bg-gray-400', text: 'text-gray-500' },
  completed: { dot: 'bg-blue-500', text: 'text-blue-600' },
};

function fmtVnd(n?: number) {
  return n ? `${Number(n).toLocaleString('vi-VN')} VNĐ` : '—';
}
function fmtDate(s: string | null | undefined) {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString('vi-VN');
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-row items-baseline sm:items-end mb-2 sm:mb-5 w-full group gap-1.5 sm:gap-0">
      <span className="text-[#1a2a50] font-medium text-sm sm:text-base whitespace-nowrap shrink-0">{label}:</span>
      <div className="sm:ml-2 flex-1 flex flex-wrap items-end relative overflow-hidden">
        <span className="text-[#1a2a50] font-bold text-sm sm:text-base z-10 sm:px-3 bg-white break-words [text-wrap:pretty]">{value}</span>
        <div className="hidden sm:block absolute bottom-1.5 left-0 w-full border-b-[2.5px] border-dotted border-gray-300 -z-0"></div>
      </div>
    </div>
  );
}

function MemberCard({ m }: { m: MemberResult }) {
  const st = STATUS[m.status] || STATUS.terminated;
  return (
    <div className="mt-4 sm:mt-6 relative w-full border border-[#e5e7eb] bg-white p-3.5 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-xl">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#d4af37] rounded-t-xl" />
      <div className={`absolute top-4 right-4 sm:top-6 sm:right-8 flex items-center gap-1.5 ${st.text} border-b-2 border-dotted border-current font-bold text-xs sm:text-sm px-1 pb-0.5`}>
        <span className={`w-2 h-2 rounded-full ${st.dot} animate-pulse`}></span>
        {m.status_label}
      </div>
      <div className="text-center mb-3 sm:mb-6 pt-7 sm:pt-2">
        <h3 className="text-[#1a2a50] text-base sm:text-xl font-bold uppercase tracking-wider flex items-center justify-center gap-2 flex-wrap">
          <ShieldCheck className="text-[#d4af37]" size={20} />
          <span>Thông Tin Hội Viên Trăm Tuổi</span>
        </h3>
        <div className="w-14 h-0.5 bg-[#d4af37] mx-auto mt-3 opacity-50"></div>
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

  const inputCls = 'w-full pl-11 pr-4 py-3 sm:py-3.5 border-[2px] border-gray-200 rounded-xl text-base text-[#1a2a50] font-medium placeholder-gray-400 focus:outline-none focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/10 transition-all bg-white';
  const btnPrimary = 'w-full sm:w-auto px-8 sm:px-12 py-3 bg-gradient-to-r from-[#1a2a50] to-[#25396b] hover:from-[#0d162a] hover:to-[#1a2a50] text-[#d4af37] border border-[#1a2a50] rounded-xl text-base font-bold transition-all shadow-[0_4px_14px_0_rgba(26,42,80,0.39)] disabled:opacity-60 disabled:shadow-none flex items-center justify-center gap-2 uppercase tracking-wide min-h-[48px]';

  return (
    <div className="font-sans p-2.5 sm:p-5 bg-transparent">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-3 sm:mb-6">
          <h2 className="text-lg sm:text-2xl font-bold text-[#1a2a50] tracking-wide">
            Tra Cứu Hội Viên Trăm Tuổi
          </h2>
          <p className="text-gray-500 text-xs sm:text-sm font-medium mt-1">
            {step === 'phone'
              ? '(Nhập Số điện thoại của khách hàng để tra cứu)'
              : '(Nhập CCCD của hội viên để xác thực và xem thông tin)'}
          </p>
        </div>

        {step === 'phone' && !results && (
          <form onSubmit={handlePhone} className="flex flex-col gap-3">
            <div className="relative w-full shadow-sm">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
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
                <button type="button" onClick={resetAll} className="w-full sm:w-auto px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-base font-bold transition-all shadow-sm flex items-center justify-center min-h-[48px]">
                  Làm mới
                </button>
              )}
            </div>
          </form>
        )}

        {step === 'password' && !results && (
          <form onSubmit={handleCccd} className="flex flex-col gap-3">
            <div className="text-center text-emerald-600 text-sm font-medium flex items-center justify-center gap-1.5">
              <ShieldCheck size={16} /> {matchCount > 1 ? `Tìm thấy ${matchCount} hợp đồng` : 'Đã tìm thấy hội viên'}. Nhập CCCD để xác thực.
            </div>
            <div className="relative w-full shadow-sm">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
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
              <button type="button" onClick={backToPhone} className="w-full sm:w-auto px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-base font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 min-h-[48px]">
                <ArrowLeft size={16} /> Đổi số điện thoại
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="text-red-500 text-center mt-3 font-medium flex justify-center items-center gap-1 text-sm">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {!loading && results && results.length > 0 && (
          <>
            {results.map((m) => (<MemberCard key={m.id} m={m} />))}
            <div className="text-center mt-4">
              <button type="button" onClick={resetAll} className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-bold transition-all shadow-sm inline-flex items-center justify-center gap-1.5">
                <RefreshCw size={15} /> Tra cứu hội viên khác
              </button>
            </div>
          </>
        )}

        {!loading && notFound && (
          <div className="mt-6 text-center py-8 px-4 border border-gray-100 bg-white rounded-xl shadow-sm">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle size={28} className="text-gray-400" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#1a2a50] mb-1">Không tìm thấy hội viên</h3>
            <p className="text-gray-500 max-w-md mx-auto text-sm">
              Không có hội viên Trăm Tuổi nào khớp số điện thoại này. Vui lòng kiểm tra lại.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
