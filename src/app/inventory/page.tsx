import { Metadata } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { PRODUCT_CONFIG } from '@/config/product.config';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Search } from 'lucide-react';
import InventorySearch from '@/components/InventorySearch';

export const metadata: Metadata = {
  title: 'Kho hàng — Blackstones',
  description: 'Xem tồn kho, giá, số lượng sản phẩm.',
};

export const dynamic = 'force-dynamic';

/**
 * Hash-based coffin image selector (same logic as ProductDetailCard)
 */
function getCoffinImage(productCode: string): string {
  let hash = 0;
  for (let i = 0; i < productCode.length; i++) {
    hash = ((hash << 5) - hash + productCode.charCodeAt(i)) | 0;
  }
  const index = (Math.abs(hash) % 5) + 1;
  return `/coffin-${index}.png`;
}

export default async function InventoryPage() {
  const supabase = getSupabaseAdmin();
  const { data: products, error } = await supabase
    .from(PRODUCT_CONFIG.TABLE_NAME as string)
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    return (
      <div className="min-h-screen p-10 flex items-center justify-center bg-gray-50">
        <p className="text-red-500 font-semibold px-4 py-3 bg-red-50 rounded-xl border border-red-200">
          Lỗi: {error.message}
        </p>
      </div>
    );
  }

  // Transform products for the client component
  const items = (products || []).map((p: Record<string, unknown>) => {
    const code = String(p[PRODUCT_CONFIG.LOOKUP_COLUMN as keyof typeof p] || p.product_code || p.id);
    const name = String(p.name || p.product_name || p.ten_san_pham || 'Chưa có tên');
    const price = Number(p.gia_ban || p['Gia ban'] || 0);
    const status = String(p[PRODUCT_CONFIG.STATUS_COLUMN] || '');
    const tonKho = String(p.ton_kho || p['Ton kho'] || '');
    const warehouse = String(p.kho_hang || p['Kho hang'] || '—');
    const serial = String(p.serial_no || p['Seri'] || '');
    const rawImg = String(p.hinh_anh || p['Hinh anh'] || '');
    const hasRealImage = rawImg && rawImg !== '—' && rawImg.trim() !== '' && rawImg.startsWith('http');
    const imageUrl = hasRealImage ? rawImg : getCoffinImage(code);

    const isExported = status === PRODUCT_CONFIG.EXPORTED_STATUS_VALUE;
    const isOutOfStock = !tonKho || tonKho === '—' || tonKho.trim() === '';
    const available = !isExported && !isOutOfStock;

    return {
      code,
      name,
      price,
      status,
      tonKho,
      warehouse,
      serial,
      imageUrl,
      isExported,
      isOutOfStock,
      available,
    };
  });

  // Statistics
  const totalProducts = items.length;
  const availableCount = items.filter((i: { available: boolean }) => i.available).length;
  const exportedCount = items.filter((i: { isExported: boolean }) => i.isExported).length;

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={16} />
              Trang chủ
            </Link>
            <div className="w-px h-5 bg-gray-200 hidden sm:block" />
            <Image
              src="/blackstones-logo.webp"
              alt="Blackstones"
              width={110}
              height={24}
              className="hidden sm:block"
              style={{ height: 'auto', filter: 'invert(1) brightness(0.2)' }}
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Page title */}
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Kho hàng</h1>
          <p className="text-sm text-gray-500 mt-1">Xem tồn kho, giá, tình trạng sản phẩm.</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white border border-gray-200 p-4 text-center">
            <p className="text-2xl font-extrabold text-gray-900">{totalProducts}</p>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1">Tổng SP</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center">
            <p className="text-2xl font-extrabold text-emerald-600">{availableCount}</p>
            <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide mt-1">Còn hàng</p>
          </div>
          <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4 text-center">
            <p className="text-2xl font-extrabold text-blue-600">{exportedCount}</p>
            <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mt-1">Đã xuất</p>
          </div>
        </div>

        {/* Search + Table — Client Component */}
        <InventorySearch items={JSON.parse(JSON.stringify(items))} />
      </div>
    </main>
  );
}
