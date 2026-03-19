import { Metadata } from 'next';
import { getSupabase } from '@/lib/supabase/client';
import { PRODUCT_CONFIG } from '@/config/product.config';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Danh sách mã QR sản phẩm',
  description: 'Tính năng xem và in mã QR cho toàn bộ sản phẩm.',
};

export const dynamic = 'force-dynamic';

export default async function ProductListPage() {
  const { data: products, error } = await getSupabase()
    .from(PRODUCT_CONFIG.TABLE_NAME as string)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="min-h-screen p-10 flex items-center justify-center bg-gray-50">
        <p className="text-red-500 font-semibold px-4 py-3 bg-red-50 rounded-xl border border-red-200">
          Lỗi không thể lấy dữ liệu sản phẩm.
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md mb-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} />
            Về trang chủ
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-800">
              Tổng cộng: {products?.length || 0} sản phẩm
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Danh sách Mã QR</h1>
          <p className="mt-2 text-gray-500 max-w-2xl mx-auto text-sm">
            Tất cả các sản phẩm và mã QR truy cập trang xuất kho tương ứng.
          </p>
        </div>

        {(!products || products.length === 0) ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <p className="text-gray-500">Chưa có sản phẩm nào trong kho dữ liệu.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product: any) => {
              const productCode = String(
                product[PRODUCT_CONFIG.LOOKUP_COLUMN as keyof typeof product] || 
                product.product_code || 
                product.qr_code || 
                product.id
              );
              
              return (
                <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col items-center text-center hover:shadow-md transition">
                  <h3 className="font-bold text-gray-900 mb-1 line-clamp-1 w-full" title={product.name || product.product_name || product.ten_san_pham}>
                    {product.name || product.product_name || product.ten_san_pham || 'Sản phẩm chưa có tên'}
                  </h3>
                  <p className="text-xs text-gray-500 font-mono mb-5 uppercase tracking-wider">{productCode}</p>
                  
                  <QRCodeDisplay code={productCode} size={150} />
                  
                  <div className="mt-5 w-full">
                    <Link 
                      href={`/product/${encodeURIComponent(productCode)}`}
                      className="block w-full text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 py-2.5 rounded-xl transition"
                      target="_blank"
                    >
                      Mở trang sản phẩm
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
