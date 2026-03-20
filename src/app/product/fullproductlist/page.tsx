import { Metadata } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { PRODUCT_CONFIG } from '@/config/product.config';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Danh sách mã QR sản phẩm',
  description: 'Xem và in mã QR cho toàn bộ sản phẩm.',
};

export const dynamic = 'force-dynamic';

export default async function ProductListPage() {
  const supabase = getSupabaseAdmin();
  const { data: products, error } = await supabase
    .from(PRODUCT_CONFIG.TABLE_NAME as string)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="min-h-screen p-10 flex items-center justify-center bg-gray-50">
        <p className="text-red-500 font-semibold px-4 py-3 bg-red-50 rounded-xl border border-red-200">
          Lỗi không thể lấy dữ liệu sản phẩm: {error.message}
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      {/* ── Header ─────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md mb-8 print:static print:border-0 print:mb-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors print:hidden"
            >
              <ArrowLeft size={16} />
              Về trang chủ
            </Link>
            <div className="hidden sm:block w-px h-5 bg-gray-200 print:hidden" />
            <Image
              src="/blackstones-logo.webp"
              alt="Blackstones"
              width={120}
              height={26}
              className="hidden sm:block print:block"
              style={{ height: 'auto', filter: 'invert(1) brightness(0.2)' }}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-800">
              {products?.length || 0} sản phẩm
            </span>
            <button
              onClick={undefined}
              className="print:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
              id="print-btn"
            >
              <Printer size={14} />
              In QR
            </button>
          </div>
        </div>
      </header>

      {/* Print button script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.getElementById('print-btn')?.addEventListener('click', function() { window.print(); });`,
        }}
      />

      {/* ── Title ───────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Danh sách Mã QR Sản Phẩm
          </h1>
          <p className="mt-2 text-gray-500 max-w-2xl mx-auto text-sm">
            Mỗi mã QR liên kết trực tiếp đến trang chi tiết sản phẩm tương ứng.
          </p>
        </div>

        {/* ── Product Grid ──────────────────────────── */}
        {(!products || products.length === 0) ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <p className="text-gray-500">Chưa có sản phẩm nào trong kho dữ liệu.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 print:grid-cols-3 print:gap-3">
            {products.map((product: Record<string, unknown>) => {
              const productCode = String(
                product[PRODUCT_CONFIG.LOOKUP_COLUMN as keyof typeof product] ||
                product.product_code ||
                product.qr_code ||
                product.id
              );

              const productName = String(
                product.name || product.product_name || product.ten_san_pham || 'Sản phẩm chưa có tên'
              );

              const status = String(product[PRODUCT_CONFIG.STATUS_COLUMN] || '');
              const tonKho = product.ton_kho;
              const isOutOfStock = !tonKho || String(tonKho).trim() === '';

              return (
                <div
                  key={String(product.id)}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col items-center text-center hover:shadow-md hover:border-indigo-200 transition-all duration-200 print:shadow-none print:border print:p-3 print:break-inside-avoid"
                >
                  {/* Status indicator */}
                  <div className="self-end mb-2 print:hidden">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        status === PRODUCT_CONFIG.EXPORTED_STATUS_VALUE
                          ? 'bg-green-100 text-green-700'
                          : isOutOfStock
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        status === PRODUCT_CONFIG.EXPORTED_STATUS_VALUE
                          ? 'bg-green-500'
                          : isOutOfStock
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                      }`} />
                      {status === PRODUCT_CONFIG.EXPORTED_STATUS_VALUE
                        ? 'Đã xuất'
                        : isOutOfStock
                        ? 'Hết hàng'
                        : 'Còn hàng'}
                    </span>
                  </div>

                  {/* Product name */}
                  <h3
                    className="font-bold text-gray-900 mb-0.5 line-clamp-2 w-full text-sm leading-tight print:text-xs"
                    title={productName}
                  >
                    {productName}
                  </h3>

                  {/* Product code */}
                  <p className="text-xs text-indigo-500 font-mono mb-4 uppercase tracking-wider font-semibold">
                    {productCode}
                  </p>

                  {/* QR Code */}
                  <QRCodeDisplay code={productCode} size={130} />

                  {/* Action button */}
                  <div className="mt-4 w-full print:hidden">
                    <Link
                      href={`/product/${encodeURIComponent(productCode)}`}
                      className="block w-full text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 py-2.5 rounded-xl transition-colors"
                      target="_blank"
                    >
                      Mở trang sản phẩm →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Print styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body { background: white !important; }
              .print\\:hidden { display: none !important; }
              .print\\:static { position: static !important; }
              .print\\:border-0 { border: 0 !important; }
              .print\\:mb-4 { margin-bottom: 1rem !important; }
              .print\\:block { display: block !important; }
              .print\\:grid-cols-3 { grid-template-columns: repeat(3, 1fr) !important; }
              .print\\:gap-3 { gap: 0.75rem !important; }
              .print\\:shadow-none { box-shadow: none !important; }
              .print\\:p-3 { padding: 0.75rem !important; }
              .print\\:text-xs { font-size: 0.75rem !important; }
              .print\\:break-inside-avoid { break-inside: avoid !important; }
            }
          `,
        }}
      />
    </main>
  );
}
