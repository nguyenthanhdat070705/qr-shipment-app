'use client';

/* ════════════════════════════════════════════════════════════════
   Widget NHÚNG — Tra Cứu Khách Hàng Trăm Tuổi (chỉ search theo SĐT)
   Dùng để nhúng <iframe> vào website ngoài. Không có menu/đăng nhập.
   URL: /embed/khtt
   ════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react';
import { Search, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';

interface KhttResult {
  getfly_order_id: string;
  order_code: string | null;
  order_status: string | null;
  customer_code: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  package_name: string | null;
  total_value: number;
  paid_amount: number;
  remaining_amount: number;
  order_date: string | null;
  expiry_date: string | null;
}

function fmtVnd(n: number) {
  return `${Number(n || 0).toLocaleString('vi-VN')} VNĐ`;
}
function fmtDate(s: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString('vi-VN');
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-row items-baseline sm:items-end mb-2 sm:mb-5 w-full group gap-1.5 sm:gap-0">
      <span className="text-[#1a2a50] font-medium text-sm sm:text-base whitespace-nowrap shrink-0">{label}:</span>
      <div className="sm:ml-2 flex-1 flex flex-wrap items-end relative overflow-hidden">
        <span className="text-[#1a2a50] font-bold text-sm sm:text-base z-10 sm:px-3 bg-white break-words">{value}</span>
        <div className="hidden sm:block absolute bottom-1.5 left-0 w-full border-b-[2.5px] border-dotted border-gray-300 -z-0"></div>
      </div>
    </div>
  );
}

function ResultCard({ row }: { row: KhttResult }) {
  return (
    <div className="mt-4 sm:mt-6 relative w-full border border-[#e5e7eb] bg-white p-3.5 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-xl">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#d4af37] rounded-t-xl" />
      <div className="absolute top-4 right-4 sm:top-6 sm:right-8 flex items-center gap-1.5 text-amber-600 border-b-2 border-dotted border-current font-bold text-xs sm:text-sm px-1 pb-0.5">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
        {row.order_status || 'Chờ duyệt'}
      </div>
      <div className="text-center mb-3 sm:mb-6 pt-7 sm:pt-2">
        <h3 className="text-[#1a2a50] text-base sm:text-xl font-bold uppercase tracking-wider flex items-center justify-center gap-2 flex-wrap">
          <ShieldCheck className="text-[#d4af37]" size={20} />
          <span>Hợp Đồng Khách Hàng Trăm Tuổi</span>
        </h3>
        {row.order_code && <p className="text-gray-400 text-xs font-mono mt-1">Mã đơn: {row.order_code}</p>}
        <div className="w-14 h-0.5 bg-[#d4af37] mx-auto mt-3 opacity-50"></div>
      </div>
      <div className="flex flex-col">
        <Row label="Mã khách hàng" value={row.customer_code || '—'} />
        <Row label="Họ tên" value={row.customer_name || '—'} />
        <Row label="Số điện thoại" value={row.customer_phone || '—'} />
        <Row label="Gói dịch vụ" value={row.package_name || '—'} />
        <Row label="Tổng giá trị gói" value={fmtVnd(row.total_value)} />
        <Row label="Số tiền đặt cọc" value={fmtVnd(row.paid_amount)} />
        <Row label="Số tiền còn lại" value={fmtVnd(row.remaining_amount)} />
        <Row label="Ngày đặt hàng" value={fmtDate(row.order_date)} />
        <Row label="Ngày hết hạn" value={fmtDate(row.expiry_date)} />
      </div>
    </div>
  );
}

export default function KhttEmbedPage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<KhttResult[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Tự gửi chiều cao cho trang cha để iframe co giãn theo nội dung.
  useEffect(() => {
    const send = () => {
      try {
        const h = Math.max(
          document.documentElement.scrollHeight,
          document.body ? document.body.scrollHeight : 0,
          document.body ? document.body.offsetHeight : 0,
        );
        window.parent?.postMessage({ type: 'khtt-embed-height', height: h }, '*');
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
  }, [results, notFound, loading, error]);

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
    <div className="font-sans p-2.5 sm:p-5 bg-transparent">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-3 sm:mb-6">
          <h2 className="text-lg sm:text-2xl font-bold text-[#1a2a50] tracking-wide">
            Tra Cứu Khách Hàng Trăm Tuổi
          </h2>
          <p className="text-gray-500 text-xs sm:text-sm font-medium mt-1">
            (Nhập Số điện thoại để tra cứu hợp đồng nền Trăm Tuổi)
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col gap-3">
          <div className="relative w-full shadow-sm">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Nhập số điện thoại..."
              className="w-full pl-11 pr-4 py-3 sm:py-3.5 border-[2px] border-gray-200 rounded-xl text-base text-[#1a2a50] font-medium placeholder-gray-400 focus:outline-none focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/10 transition-all bg-white"
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="w-full sm:w-auto px-8 sm:px-12 py-3 bg-gradient-to-r from-[#1a2a50] to-[#25396b] hover:from-[#0d162a] hover:to-[#1a2a50] text-[#d4af37] border border-[#1a2a50] rounded-xl text-base font-bold transition-all shadow-[0_4px_14px_0_rgba(26,42,80,0.39)] disabled:opacity-60 disabled:shadow-none flex items-center justify-center gap-2 uppercase tracking-wide min-h-[48px]"
            >
              {loading ? (<><RefreshCw size={18} className="animate-spin" /> Đang tìm...</>) : (<>Tìm kiếm</>)}
            </button>
            {phone && (
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

        {!loading && results && results.length > 0 && results.map((r) => (
          <ResultCard key={r.getfly_order_id} row={r} />
        ))}

        {!loading && notFound && (
          <div className="mt-6 text-center py-8 px-4 border border-gray-100 bg-white rounded-xl shadow-sm">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle size={28} className="text-gray-400" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#1a2a50] mb-1">Không tìm thấy dữ liệu</h3>
            <p className="text-gray-500 max-w-md mx-auto text-sm">
              Không có khách hàng Trăm Tuổi nào khớp Số điện thoại này. Vui lòng kiểm tra lại.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
