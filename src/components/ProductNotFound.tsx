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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        {/* Biểu tượng */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <PackageX size={40} className="text-red-500" />
        </div>

        {/* Tiêu đề */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy sản phẩm</h1>

        {/* Thông báo */}
        <p className="text-gray-500 mb-3">
          Không tìm thấy sản phẩm nào khớp với mã đã quét:
        </p>
        <p className="inline-block rounded-lg bg-gray-100 px-4 py-2 font-mono text-sm text-gray-700 mb-8 max-w-full break-all">
          {lookupValue}
        </p>

        {/* Gợi ý kiểm tra */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-left mb-8">
          <p className="text-sm font-semibold text-amber-800 mb-2">Hãy kiểm tra lại:</p>
          <ul className="text-sm text-amber-700 space-y-1.5 list-disc list-inside">
            <li>Bạn đã quét đúng mã QR / mã vạch chưa?</li>
            <li>Sản phẩm này có thể chưa được đăng ký vào hệ thống.</li>
            <li>Mã QR có thể bị hỏng hoặc không đọc được đầy đủ.</li>
            <li>Liên hệ quản lý kho nếu sự cố tiếp tục xảy ra.</li>
          </ul>
        </div>

        {/* Nút hành động */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 active:scale-95 transition-all"
          >
            <ArrowLeft size={16} />
            Quay về trang chủ
          </Link>
          <a
            href="tel:"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
          >
            <Phone size={16} />
            Liên hệ hỗ trợ
          </a>
        </div>
      </div>
    </div>
  );
}
