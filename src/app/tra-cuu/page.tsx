'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import Image from 'next/image';

/* ─────────────────── Types ─────────────────── */
interface MemberResult {
  id: string;
  member_code: string;
  full_name: string;
  phone_masked: string;
  email_masked: string;
  id_number_masked: string;
  status: string;
  status_label: string;
  registered_date: string;
  expiry_date: string;
  branch: string;
  service_package_label: string;
  consultant_name: string;
  address?: string;
  notes?: string;
  contract_value?: number;
}

const STATUS_CONFIG: Record<string, { color: string; label: string; dot: string }> = {
  active: { color: 'text-red-600', label: 'Đang hoạt động', dot: 'bg-red-500' },
  pending: { color: 'text-amber-600', label: 'Chờ xác nhận', dot: 'bg-amber-500' },
  expired: { color: 'text-gray-500', label: 'Hết hạn', dot: 'bg-gray-400' },
  terminated: { color: 'text-gray-400', label: 'Đã kết thúc', dot: 'bg-gray-300' },
};

/* ─────────────────── Field Row ─────────────────── */
function DottedRow({ label, value }: { label: string; value: string }) {
  // Bolding value specifically to make it stand out against the labels
  return (
    <div className="flex items-end mb-4 sm:mb-6 w-full group">
      <span className="text-[#1a2a50] font-medium text-base sm:text-lg whitespace-nowrap">{label}:</span>
      
      {/* Container display flexible cho phần giá trị và đường chấm */}
      <div className="ml-2 flex-1 flex flex-wrap items-end relative overflow-hidden">
        {/* Phần giá trị thực tế */}
        <span className="text-[#1a2a50] font-bold text-base sm:text-lg z-10 px-3 bg-[#fafafa] sm:bg-white">{value}</span>
        {/* Đường gạch chấm chạy tuốt ra cuối */}
        <div className="absolute bottom-1.5 sm:bottom-2 left-0 w-full border-b-[2.5px] border-dotted border-gray-300 group-hover:border-[#d4af37]/50 transition-colors -z-0"></div>
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
    <div className="mt-8 relative w-full border border-[#e5e7eb] bg-[#fafafa] sm:bg-white p-6 sm:p-10 sm:px-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] max-w-4xl mx-auto rounded-xl">
      
      {/* Decorative top border in gold gradient */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#d4af37] rounded-t-xl" />

      {/* Status Badge (Top Right) */}
      <div className={`absolute top-6 sm:top-8 right-6 sm:right-10 flex items-center gap-1.5 ${config.color} border-b-2 border-dotted border-current font-bold text-sm sm:text-base px-1 pb-0.5 tracking-wide`}>
        <span className={`w-2 h-2 rounded-full ${config.dot} animate-pulse`}></span>
        {config.label}
      </div>

      <div className="text-center mb-10 pt-8 sm:pt-0">
        <h2 className="text-[#1a2a50] text-xl sm:text-2xl font-bold uppercase tracking-wider flex items-center justify-center gap-2">
          <ShieldCheck className="text-[#d4af37]" size={28} />
          Thông tin Hội Viên Trăm Tuổi
        </h2>
        <div className="w-16 h-0.5 bg-[#d4af37] mx-auto mt-3 opacity-50"></div>
      </div>

      <div className="flex flex-col space-y-2">
        <DottedRow label="Mã hội viên" value={member.member_code} />
        <DottedRow label="Tên hội viên" value={member.full_name} />
        <DottedRow label="Ngày ký kết" value={regDate} />
        <DottedRow label="Ngày hết hạn" value={expDate} />
        <DottedRow label="Địa chỉ" value={member.address || '—'} />
        <DottedRow label="Người thụ hưởng 1" value={member.notes || '—'} />
        <DottedRow label="Người thụ hưởng 2" value="—" />
        <DottedRow label="Số tiền đã đóng" value={member.contract_value ? `${Number(member.contract_value).toLocaleString('vi-VN')} VNĐ` : '—'} />
        <DottedRow label="Sale phụ trách" value={member.consultant_name || '—'} />
      </div>
    </div>
  );
}

/* ─────────────────── Main Page ─────────────────── */
export default function PublicLookupPage() {
  const [searchBy, setSearchBy] = useState<'cccd' | 'phone'>('cccd');
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MemberResult[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const val = searchValue.trim();
    
    if (!val) {
      setError(searchBy === 'cccd' ? 'Vui lòng nhập mã CCCD' : 'Vui lòng nhập Số điện thoại');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);
    setNotFound(false);

    try {
      const queryParam = searchBy === 'cccd' ? `cccd=${encodeURIComponent(val)}` : `phone=${encodeURIComponent(val)}`;
      const res = await fetch(`/api/membership/lookup?${queryParam}`);
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
    setSearchValue('');
    setResults(null);
    setNotFound(false);
    setError('');
    inputRef.current?.focus();
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans pb-20 relative">
      {/* Header Bar */}
      <div className="w-full bg-[#1a2a50] h-4"></div>

      {/* Top Left Logo Area */}
      <div className="absolute top-8 left-4 sm:left-8 z-10 flex flex-col items-center sm:items-start group cursor-pointer transition-all">
        {/* Đổi nền box thành màu Xanh Navy để logo trắng nổi bật hoàn toàn */}
        <div className="bg-[#1a2a50] p-3 sm:px-4 sm:py-3 rounded-xl shadow-md border border-[#1a2a50]/20 group-hover:shadow-lg">
          <Image
            src="/blackstones-logo.webp"
            alt="BlackStones Logo"
            width={160}
            height={50}
            className="h-8 sm:h-10 w-auto object-contain"
          />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-32 sm:pt-20">
        {/* Title Section */}
        <div className="text-center mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1a2a50] mb-3 tracking-wide">
            Tra Cứu Hội Viên Trăm Tuổi – <span className="text-[#d4af37]">Blackstones Lifecare</span>
          </h1>
          <p className="text-gray-500 text-sm sm:text-base font-medium">
            (Vui lòng cung cấp CCCD hoặc Số điện thoại để tra cứu)
          </p>
        </div>

        {/* Search Box */}
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSearch} className="flex flex-col gap-4 justify-center">
            
            {/* Search Type Selector */}
            <div className="flex justify-center items-center gap-6 mb-2">
              <label className="flex items-center gap-2 cursor-pointer text-[#1a2a50] font-medium transition-colors hover:text-[#d4af37]">
                <input 
                  type="radio" 
                  name="searchBy" 
                  checked={searchBy === 'cccd'} 
                  onChange={() => { setSearchBy('cccd'); setSearchValue(''); setError(''); inputRef.current?.focus(); }}
                  className="w-5 h-5 accent-[#d4af37] focus:ring-[#d4af37]"
                />
                Tra cứu bằng CCCD
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-[#1a2a50] font-medium transition-colors hover:text-[#d4af37]">
                <input 
                  type="radio" 
                  name="searchBy" 
                  checked={searchBy === 'phone'} 
                  onChange={() => { setSearchBy('phone'); setSearchValue(''); setError(''); inputRef.current?.focus(); }}
                  className="w-5 h-5 accent-[#d4af37] focus:ring-[#d4af37]"
                />
                Tra cứu bằng Số điện thoại
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <div className="relative w-full shadow-sm">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchValue}
                  onChange={e => setSearchValue(e.target.value)}
                  placeholder={searchBy === 'cccd' ? "Nhập mã CCCD..." : "Nhập số điện thoại..."}
                  className="w-full px-6 py-4 border-[2px] border-gray-200 rounded-xl text-lg text-[#1a2a50] font-medium placeholder-gray-400 focus:outline-none focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/10 transition-all bg-white"
                  autoComplete="off"
                />
              </div>
            </div>
            
            <div className="flex justify-center mt-2">
              <button
                type="submit"
                disabled={loading || !searchValue.trim()}
                className="w-full sm:w-auto px-12 py-4 bg-gradient-to-r from-[#1a2a50] to-[#25396b] hover:from-[#0d162a] hover:to-[#1a2a50] text-[#d4af37] border border-[#1a2a50] rounded-xl text-lg font-bold transition-all shadow-[0_4px_14px_0_rgba(26,42,80,0.39)] disabled:opacity-60 disabled:shadow-none flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                {loading ? (
                  <><RefreshCw size={22} className="animate-spin" /> Đang tìm...</>
                ) : (
                  <>Tìm kiếm</>
                )}
              </button>
              
              {searchValue && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="ml-4 px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-lg font-bold transition-all shadow-sm flex items-center justify-center"
                  title="Xoá nội dung"
                >
                  Làm mới
                </button>
              )}
            </div>
          </form>

          {/* Validation Error Message */}
          {error && (
            <div className="text-red-500 text-center mt-3 font-medium flex justify-center items-center gap-1">
              <AlertCircle size={16} /> {error}
            </div>
          )}
        </div>

        {/* Loading Spinner Skeleton */}
        {loading && (
          <div className="mt-16 max-w-4xl mx-auto border border-gray-100 bg-white p-10 animate-pulse rounded-xl shadow-sm">
            <div className="h-8 bg-gray-100 rounded-full w-1/3 mx-auto mb-10"></div>
            <div className="space-y-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="flex items-end">
                  <div className="h-4 bg-gray-100 rounded w-1/4 mr-4 mb-2"></div>
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
          </div>
        )}

        {/* Not Found */}
        {!loading && notFound && (
          <div className="mt-16 text-center py-12 border border-gray-100 bg-white max-w-4xl mx-auto rounded-xl shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertCircle size={40} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-[#1a2a50] mb-2">Không tìm thấy dữ liệu</h3>
            <p className="text-gray-500 max-w-md mx-auto text-base">
              Hệ thống không tìm thấy hội viên nào khớp với thông tin cung cấp.<br /> Vui lòng kiểm tra lại sự chính xác của CCCD và Số điện thoại.
            </p>
            <button
               onClick={handleClear}
               className="mt-6 px-8 py-3 border-2 border-[#1a2a50] text-[#1a2a50] font-semibold rounded-lg hover:bg-[#1a2a50] hover:text-[#d4af37] transition-all"
            >
              Thử lại
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
