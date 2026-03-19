import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import type { DynamicProductRow } from '@/types';
import { PRODUCT_CONFIG } from '@/config/product.config';
import ProductDetailCard from '@/components/ProductDetailCard';
import ProductNotFound from '@/components/ProductNotFound';
import ShipmentConfirmationFormWrapper from '@/components/ShipmentConfirmationFormWrapper';
import { ArrowLeft, QrCode } from 'lucide-react';
import Link from 'next/link';

interface ProductPageProps {
  params: Promise<{ qrCode: string }>;
}

/**
 * Tìm sản phẩm bằng giá trị cột LOOKUP_COLUMN trong bảng TABLE_NAME.
 * Trả về null nếu không tìm thấy; ném lỗi nếu lỗi DB thực sự.
 */
async function getProductByLookup(lookupValue: string): Promise<DynamicProductRow | null> {
  const decodedValue = decodeURIComponent(lookupValue);

  const { data, error } = await getSupabase()
    .from(PRODUCT_CONFIG.TABLE_NAME as string)
    .select('*')
    .eq(PRODUCT_CONFIG.LOOKUP_COLUMN as string, decodedValue)
    .single();

  // PGRST116 = không có hàng nào — không phải lỗi DB thực sự
  if (error && error.code !== 'PGRST116') {
    console.error('[product page] Lỗi DB:', error);
    throw new Error('Không thể tải thông tin sản phẩm.');
  }

  return data as DynamicProductRow | null;
}

/** Tạo metadata động cho thẻ <title> của trình duyệt */
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { qrCode } = await params;

  try {
    const row = await getProductByLookup(qrCode);
    if (!row) return { title: 'Không tìm thấy sản phẩm' };

    const name =
      (row['name'] as string | undefined) ??
      (row['product_name'] as string | undefined) ??
      'Thông tin sản phẩm';

    return {
      title: name,
      description: `Xem chi tiết và xác nhận xuất kho sản phẩm: ${name}.`,
    };
  } catch {
    return { title: 'Thông tin sản phẩm' };
  }
}

/**
 * Trang sản phẩm động — /product/[qrCode]
 *
 * - Dữ liệu được tải phía server (RSC) dùng cột tra cứu từ config
 * - Hiển thị toàn bộ trường từ hàng dữ liệu (không hardcode trường nào)
 * - Form xác nhận là client component, xử lý trạng thái cục bộ
 */
export default async function ProductPage({ params }: ProductPageProps) {
  const { qrCode } = await params;
  let row: DynamicProductRow | null = null;
  let fetchFailed = false;

  try {
    row = await getProductByLookup(qrCode);
  } catch {
    fetchFailed = true;
  }

  // Lỗi DB thực sự → next.js notFound()
  if (fetchFailed) {
    notFound();
  }

  // Không tìm thấy sản phẩm → component thân thiện
  if (!row) {
    return <ProductNotFound lookupValue={decodeURIComponent(qrCode)} />;
  }

  // Lấy tên sản phẩm và trạng thái từ hàng dữ liệu
  const productName =
    (row['name'] as string | undefined) ??
    (row['product_name'] as string | undefined) ??
    (row['ten_san_pham'] as string | undefined) ??
    'Sản phẩm';

  const statusValue = String(row[PRODUCT_CONFIG.STATUS_COLUMN] ?? '');

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50">
      {/* ── Thanh tiêu đề cố định ─────────────────── */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} />
            Quay lại
          </Link>
          <div className="flex items-center gap-2">
            <QrCode size={15} className="text-indigo-500" />
            <span className="text-sm font-mono text-gray-600 max-w-[180px] truncate">
              {decodeURIComponent(qrCode)}
            </span>
          </div>
        </div>
      </header>

      {/* ── Nội dung chính ────────────────────────── */}
      <div className="mx-auto max-w-lg px-4 py-6 space-y-5">
        {/* Tiêu đề trang */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">Thông tin sản phẩm</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Kiểm tra thông tin sản phẩm bên dưới và xác nhận xuất kho khi sẵn sàng.
          </p>
        </div>

        {/* Thẻ thông tin sản phẩm (động) */}
        <ProductDetailCard row={row} />

        {/* Form xác nhận xuất kho (client component) */}
        <ShipmentConfirmationFormWrapper
          qrCode={decodeURIComponent(qrCode)}
          productName={productName}
          currentStatus={statusValue}
        />
      </div>
    </main>
  );
}
