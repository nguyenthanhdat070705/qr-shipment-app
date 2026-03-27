import { Metadata } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import DownloadAllQR from '@/components/DownloadAllQR';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Danh sách mã QR sản phẩm',
  description: 'Xem và in mã QR cho toàn bộ sản phẩm tại kho hàng.',
};

export const dynamic = 'force-dynamic';

interface DimHom {
  id: string;
  ma_hom: string;
  ten_hom: string;
  gia_ban: number | null;
  hinh_anh: string | null;
}

interface DimKho {
  id: string;
  ma_kho: string;
  ten_kho: string;
}

interface FactInventoryRow {
  'Mã': string;
  'Tên hàng hóa': string;
  'Kho': string;
  'Số lượng': number;
  'Loại hàng': string | null;
}

export default async function ProductListPage() {
  const supabase = getSupabaseAdmin();

  // Fetch inventory, product dimension, and warehouse dimension
  const [inventoryRes, homRes, khoRes] = await Promise.all([
    supabase.from('fact_inventory').select('*'),
    supabase.from('dim_hom').select('id, ma_hom, ten_hom, gia_ban, hinh_anh'),
    supabase.from('dim_kho').select('id, ma_kho, ten_kho'),
  ]);

  if (inventoryRes.error) {
    return (
      <div className="min-h-screen p-10 flex items-center justify-center bg-gray-50">
        <p className="text-red-500 font-semibold px-4 py-3 bg-red-50 rounded-xl border border-red-200">
          Lỗi không thể lấy dữ liệu sản phẩm: {inventoryRes.error.message}
        </p>
      </div>
    );
  }

  // Build lookup maps
  const homMap = new Map<string, DimHom>();
  for (const h of (homRes.data || []) as DimHom[]) {
    homMap.set(h.id, h);
  }

  const khoMap = new Map<string, DimKho>();
  for (const k of (khoRes.data || []) as DimKho[]) {
    khoMap.set(k.id, k);
  }

  const inventory = (inventoryRes.data || []) as FactInventoryRow[];

  // Build product list from inventory with warehouse info
  const products = inventory.map((row) => {
    const hom = homMap.get(row['Tên hàng hóa']);
    const kho = khoMap.get(row['Kho']);

    return {
      productCode: hom?.ma_hom || row['Mã'] || '—',
      productName: hom?.ten_hom || 'Chưa có tên',
      warehouse: kho?.ten_kho || '—',
      quantity: row['Số lượng'] || 0,
      category: row['Loại hàng'] || '',
    };
  });

  // Serialize for client component
  const downloadProducts = products.map((p) => ({
    productCode: p.productCode,
    productName: p.productName,
  }));

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
              {products.length} sản phẩm
            </span>
            <DownloadAllQR products={downloadProducts} />
            <button
              onClick={undefined}
              className="print:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm"
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
            Nhấn <strong>Tải PDF QR</strong> để tải toàn bộ mã QR dưới dạng file PDF.
          </p>
        </div>

        {/* ── Product Grid ──────────────────────────── */}
        {products.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <p className="text-gray-500">Chưa có sản phẩm nào trong kho hàng.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 print:grid-cols-3 print:gap-3">
            {products.map((product, idx) => {
              const isOutOfStock = product.quantity <= 0;

              return (
                <div
                  key={`${product.productCode}-${idx}`}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col items-center text-center hover:shadow-md hover:border-[#a8b4ce] transition-all duration-200 print:shadow-none print:border print:p-3 print:break-inside-avoid"
                >
                  {/* Status indicator */}
                  <div className="self-end mb-2 print:hidden">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isOutOfStock
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isOutOfStock ? 'bg-red-500' : 'bg-blue-500'
                      }`} />
                      {isOutOfStock ? 'Hết hàng' : `SL: ${product.quantity}`}
                    </span>
                  </div>

                  {/* Product name */}
                  <h3
                    className="font-bold text-gray-900 mb-0.5 line-clamp-2 w-full text-sm leading-tight print:text-xs"
                    title={product.productName}
                  >
                    {product.productName}
                  </h3>

                  {/* Product code */}
                  <p className="text-xs text-[#2d4a7a] font-mono mb-1 uppercase tracking-wider font-semibold">
                    {product.productCode}
                  </p>

                  {/* Warehouse tag */}
                  <p className="text-[10px] text-gray-400 font-semibold mb-3 print:hidden">
                    📍 {product.warehouse}
                  </p>

                  {/* QR Code */}
                  <QRCodeDisplay code={product.productCode} size={130} />

                  {/* Action button */}
                  <div className="mt-4 w-full print:hidden">
                    <Link
                      href={`/product-sheet/${encodeURIComponent(product.productCode)}`}
                      className="block w-full text-sm font-semibold text-[#1B2A4A] bg-[#eef1f7] hover:bg-[#d5dbe9] py-2.5 rounded-xl transition-colors"
                      target="_blank"
                    >
                      Xem phiếu thông tin →
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
