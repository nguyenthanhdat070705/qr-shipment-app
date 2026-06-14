'use client';

/* ════════════════════════════════════════════════════════════════
   Widget NHÚNG — Tra Cứu Hội Viên Trăm Tuổi (search theo SĐT hoặc CCCD)
   Dùng để nhúng <iframe> vào website ngoài. Không có menu/đăng nhập.
   URL: /embed/hoi-vien   — CHỈ giao diện Hội viên (tách riêng khỏi KHTT).
   ════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react';
import { Search, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';

interface MemberResult {
  id: string;
  member_code: string;
  full_name: string;
  status: string;
  status_label: string;
  registered_date: string;
  expiry_date: string;
  address?: string;
  notes?: string; // người thụ hưởng 1
  beneficiary_name_2?: string;
  contract_value?: number;
  consultant_name?: string;
}

const STATUS: Record<string, { label: string; dot: string; text: string }> = {
  active: { label: 'Đang hoạt động', dot: 'bg-emerald-500', text: 'text-emerald-600' },
  pending: { label: 'Chờ xác nhận', dot: 'bg-amber-500', text: 'text-amber-600' },
  expired: { label: 'Hết hạn', dot: 'bg-red-500', text: 'text-red-600' },
  terminated: { label: 'Đã kết thúc', dot: 'bg-gray-400', text: 'text-gray-500' },
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
    <div className="flex flex-col sm:flex-row sm:items-end mb-2 sm:mb-5 w-full group gap-0.5 sm:gap-0">
      <span className="text-[#1a2a50] font-medium text-sm sm:text-base whitespace-nowrap">{label}:</span>
      <div className="sm:ml-2 flex-1 flex flex-wrap items-end relative overflow-hidden">
        <span className="text-[#1a2a50] font-bold text-sm sm:text-base z-10 sm:px-3 bg-white break-words">{value}</span>
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
        {m.status_label || st.label}
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
        <Row label="Người thụ hưởng 1" value={m.notes || '—'} />
        <Row label="Người thụ hưởng 2" value={m.beneficiary_name_2 || '—'} />
        <Row label="Số tiền đã đóng" value={fmtVnd(m.contract_value)} />
        <Row label="Sale phụ trách" value={m.consultant_name || '—'} />
      </div>
    </div>
  );
}

export default function HoiVienEmbedPage() {
  const [searchBy, setSearchBy] = useState<'phone' | 'cccd'>('phone');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MemberResult[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Gửi chiều cao cho trang cha (nếu trang cha có lắng nghe để auto-resize).
  useEffect(() => {
    const send = () => {
      try {
        window.parent?.postMessage(
          { type: 'hoivien-embed-height', height: document.documentElement.scrollHeight },
          '*',
        );
      } catch { /* ignore */ }
    };
    send();
    const ro = new ResizeObserver(send);
    ro.observe(document.body);
    window.addEventListener('load', send);
    return () => { ro.disconnect(); window.removeEventListener('load', send); };
  }, [results, notFound, loading, error]);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const val = value.trim();
    if (!val) { setError(searchBy === 'cccd' ? 'Vui lòng nhập số CCCD' : 'Vui lòng nhập Số điện thoại'); return; }
    setLoading(true);
    setError('');
    setResults(null);
    setNotFound(false);
    try {
      const param = searchBy === 'cccd' ? `cccd=${encodeURIComponent(val)}` : `phone=${encodeURIComponent(val)}`;
      const res = await fetch(`/api/membership/lookup?${param}`);
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
    setValue('');
    setResults(null);
    setNotFound(false);
    setError('');
    inputRef.current?.focus();
  }

  return (
    <div className="font-sans p-2.5 sm:p-5 bg-transparent">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-3 sm:mb-6">
          <h2 className="text-lg sm:text-2xl font-bold text-[#1a2a50] tracking-wide">
            Tra Cứu Hội Viên Trăm Tuổi
          </h2>
          <p className="text-gray-500 text-xs sm:text-sm font-medium mt-1">
            (Nhập Số điện thoại hoặc CCCD của khách hàng để tra cứu)
          </p>
        </div>

        {/* Chọn kiểu tra cứu */}
        <div className="flex justify-center gap-4 mb-3">
          {(['phone', 'cccd'] as const).map((opt) => (
            <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-sm font-semibold text-[#1a2a50]">
              <input
                type="radio"
                name="searchBy"
                checked={searchBy === opt}
                onChange={() => { setSearchBy(opt); setValue(''); setError(''); inputRef.current?.focus(); }}
                className="accent-[#d4af37] w-4 h-4"
              />
              {opt === 'phone' ? 'Số điện thoại' : 'CCCD'}
            </label>
          ))}
        </div>

        <form onSubmit={handleSearch} className="flex flex-col gap-3">
          <div className="relative w-full shadow-sm">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              inputMode={searchBy === 'phone' ? 'tel' : 'numeric'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={searchBy === 'cccd' ? 'Nhập số CCCD...' : 'Nhập số điện thoại...'}
              className="w-full pl-11 pr-4 py-3 sm:py-3.5 border-[2px] border-gray-200 rounded-xl text-base text-[#1a2a50] font-medium placeholder-gray-400 focus:outline-none focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/10 transition-all bg-white"
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              type="submit"
              disabled={loading || !value.trim()}
              className="w-full sm:w-auto px-8 sm:px-12 py-3 bg-gradient-to-r from-[#1a2a50] to-[#25396b] hover:from-[#0d162a] hover:to-[#1a2a50] text-[#d4af37] border border-[#1a2a50] rounded-xl text-base font-bold transition-all shadow-[0_4px_14px_0_rgba(26,42,80,0.39)] disabled:opacity-60 disabled:shadow-none flex items-center justify-center gap-2 uppercase tracking-wide min-h-[48px]"
            >
              {loading ? (<><RefreshCw size={18} className="animate-spin" /> Đang tìm...</>) : (<>Tìm kiếm</>)}
            </button>
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="w-full sm:w-auto px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-base font-bold transition-all shadow-sm flex items-center justify-center min-h-[48px]"
              >
                Làm mới
              </button>
            )}
          </div>
        </form>

        {error && (
          <div className="text-red-500 text-center mt-3 font-medium flex justify-center items-center gap-1 text-sm">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {!loading && results && results.length > 0 && results.map((m) => (
          <MemberCard key={m.id} m={m} />
        ))}

        {!loading && notFound && (
          <div className="mt-6 text-center py-8 px-4 border border-gray-100 bg-white rounded-xl shadow-sm">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle size={28} className="text-gray-400" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#1a2a50] mb-1">Không tìm thấy hội viên</h3>
            <p className="text-gray-500 max-w-md mx-auto text-sm">
              Không có hội viên Trăm Tuổi nào khớp thông tin này. Vui lòng kiểm tra lại.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
