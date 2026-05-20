import Link from 'next/link';
import { PackageX, ArrowLeft, Phone } from 'lucide-react';

interface ProductNotFoundProps {
  lookupValue: string;
}

/**
 * Trang thông báo không tìm thấy sản phẩm — hiển thị khi mã QR
 * không khớp với bất kỳ sản phẩm nào trong hệ thống.
 */
export default function ProductNotFound({ lookupValue }: ProductNotFoundProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-[#faf7f2] flex items-center justify-center px-3 sm:px-4 py-8 sm:py-12">
      <div className="w-full max-w-md text-center">
        {/* Biểu tượng */}
        <div className="mx-auto mb-4 sm:mb-6 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-red-100">
          <PackageX size={32} className="text-red-500 sm:w-10 sm:h-10" />
        </div>

        {/* Tiêu đề */}
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Không tìm thấy sản phẩm</h1>

        {/* Thông báo */}
        <p className="text-sm sm:text-base text-gray-500 mb-3">
          Không tìm thấy sản phẩm nào khớp với mã đã quét:
        </p>
        <p className="inline-block rounded-lg bg-gray-100 px-3 sm:px-4 py-2 font-mono text-xs sm:text-sm text-gray-700 mb-6 sm:mb-8 max-w-full break-all">
          {lookupValue}
        </p>

        {/* Gợi ý kiểm tra */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 sm:px-5 py-3 sm:py-4 text-left mb-6 sm:mb-8">
          <p className="text-sm font-semibold text-amber-800 mb-2">Hãy kiểm tra lại:</p>
          <ul className="text-xs sm:text-sm text-amber-700 space-y-1.5 list-disc list-inside">
            <li>Bạn đã quét đúng mã QR / mã vạch chưa?</li>
            <li>Sản phẩm này có thể chưa được đăng ký vào hệ thống.</li>
            <li>Mã QR có thể bị hỏng hoặc không đọc được đầy đủ.</li>
            <li>Liên hệ quản lý kho nếu sự cố tiếp tục xảy ra.</li>
          </ul>
        </div>

        {/* Nút hành động */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1B2A4A] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#162240] active:scale-95 transition-all min-h-[48px]"
          >
            <ArrowLeft size={16} />
            Quay về trang chủ
          </Link>
          <a
            href="tel:"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 active:scale-95 transition-all min-h-[48px]"
          >
            <Phone size={16} />
            Liên hệ hỗ trợ
          </a>
        </div>
      </div>
    </div>
  );
}
