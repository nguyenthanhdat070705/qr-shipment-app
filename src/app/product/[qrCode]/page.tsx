import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { DynamicProductRow } from '@/types';
import { PRODUCT_CONFIG } from '@/config/product.config';
import { extractProductCode } from '@/lib/utils';
import ProductDetailCard from '@/components/ProductDetailCard';
import ProductNotFound from '@/components/ProductNotFound';
import ShipmentConfirmationFormWrapper from '@/components/ShipmentConfirmationFormWrapper';
import { ArrowLeft, QrCode } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

interface ProductPageProps {
  params: Promise<{ qrCode: string }>;
}

/**
 * Tìm sản phẩm bằng giá trị cột LOOKUP_COLUMN trong bảng TABLE_NAME.
 * Trả về null nếu không tìm thấy; ném lỗi nếu lỗi DB thực sự.
 */
async function getProductByLookup(lookupValue: string): Promise<DynamicProductRow | null> {
  // Extract product code from full URL if needed
  const productCode = extractProductCode(lookupValue);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(PRODUCT_CONFIG.TABLE_NAME as string)
    .select('*')
    .eq(PRODUCT_CONFIG.LOOKUP_COLUMN as string, productCode)
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
 */
export default async function ProductPage({ params }: ProductPageProps) {
  const { qrCode } = await params;
  const productCode = extractProductCode(decodeURIComponent(qrCode));
  
  let row: DynamicProductRow | null = null;
  let fetchFailed = false;

  try {
    row = await getProductByLookup(qrCode);
  } catch {
    fetchFailed = true;
  }

  if (fetchFailed) {
    notFound();
  }

  if (!row) {
    return <ProductNotFound lookupValue={productCode} />;
  }

  const productName =
    (row['name'] as string | undefined) ??
    (row['product_name'] as string | undefined) ??
    (row['ten_san_pham'] as string | undefined) ??
    'Sản phẩm';

  const statusValue = String(row[PRODUCT_CONFIG.STATUS_COLUMN] ?? '');

  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-50">
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
          <div className="flex items-center gap-3">
            <Image
              src="/blackstones-logo.webp"
              alt="Blackstones"
              width={100}
              height={22}
              style={{ height: 'auto', filter: 'invert(1) brightness(0.2)' }}
            />
            <div className="w-px h-5 bg-gray-200" />
            <div className="flex items-center gap-1.5">
              <QrCode size={14} className="text-navy-500" />
              <span className="text-sm font-mono text-gray-600 max-w-[140px] truncate">
                {productCode}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Nội dung chính ────────────────────────── */}
      <div className="mx-auto max-w-lg px-4 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Thông tin sản phẩm</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Kiểm tra thông tin sản phẩm bên dưới và xác nhận xuất kho khi sẵn sàng.
          </p>
        </div>

        <ProductDetailCard row={row} />

        <ShipmentConfirmationFormWrapper
          qrCode={productCode}
          productName={productName}
          currentStatus={statusValue}
        />
      </div>
    </main>
  );
}
