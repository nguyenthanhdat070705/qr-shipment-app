import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { DynamicProductRow } from '@/types';
import { PRODUCT_CONFIG } from '@/config/product.config';
import { extractProductCode } from '@/lib/utils';
import ProductDetailCard from '@/components/ProductDetailCard';
import ProductNotFound from '@/components/ProductNotFound';
import ShipmentConfirmationFormWrapper from '@/components/ShipmentConfirmationFormWrapper';
import { ArrowLeft, QrCode, Printer } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import PrintButton from '@/components/PrintButton';

export const dynamic = 'force-dynamic';

interface ProductPageProps {
  params: Promise<{ qrCode: string }>;
}

interface DimHom {
  id: string;
  ma_hom: string;
  ten_hom: string;
  gia_ban: number | null;
  gia_von: number | null;
  hinh_anh: string | null;
  NCC: string | null;
}

interface DimKho {
  id: string;
  ma_kho: string;
  ten_kho: string;
}

interface DimNcc {
  id: string;
  ma_ncc: string;
  ten_ncc: string;
  nguoi_lien_he: string | null;
  sdt: string | null;
  dia_chi: string | null;
}

interface FactInventoryRow {
  'Mã': string;
  'Tên hàng hóa': string;
  'Kho': string;
  'Số lượng': number;
  'Loại hàng': string | null;
  'Ghi chú': number;
}

/**
 * Find product by ma_hom (product code) using fact_inventory + dim_hom + dim_kho + dim_ncc.
 * Falls back to legacy products table lookup.
 */
async function getProductByCode(productCode: string): Promise<DynamicProductRow | null> {
  const code = extractProductCode(productCode);
  const supabase = getSupabaseAdmin();

  // 1) Look up dim_hom by ma_hom
  const { data: homData, error: homError } = await supabase
    .from('dim_hom')
    .select('*')
    .eq('ma_hom', code)
    .single();

  if (homError && homError.code !== 'PGRST116') {
    console.error('[product page] dim_hom lookup error:', homError);
  }

  if (!homData) {
    // Fallback: try legacy products table
    try {
      const { data: legacyData, error: legacyError } = await supabase
        .from(PRODUCT_CONFIG.TABLE_NAME as string)
        .select('*')
        .eq(PRODUCT_CONFIG.LOOKUP_COLUMN as string, code)
        .single();

      if (legacyError && legacyError.code !== 'PGRST116') {
        console.error('[product page] legacy lookup error:', legacyError);
      }

      return legacyData as DynamicProductRow | null;
    } catch {
      return null;
    }
  }

  const hom = homData as DimHom;

  // 2) Find inventory row for this product
  const { data: invData } = await supabase
    .from('fact_inventory')
    .select('*')
    .eq('Tên hàng hóa', hom.id);

  const inventoryRows = (invData || []) as FactInventoryRow[];
  const firstInv = inventoryRows[0] || null;

  // 3) Get warehouse info
  let warehouse: DimKho | null = null;
  if (firstInv && firstInv['Kho']) {
    const { data: khoData } = await supabase
      .from('dim_kho')
      .select('*')
      .eq('id', firstInv['Kho'])
      .single();
    warehouse = (khoData as DimKho) || null;
  }

  // 4) Get supplier info
  let supplier: DimNcc | null = null;
  if (hom.NCC) {
    const { data: nccData } = await supabase
      .from('dim_ncc')
      .select('*')
      .eq('id', hom.NCC)
      .single();
    supplier = (nccData as DimNcc) || null;
  }

  // Quantities
  const totalQty = inventoryRows.reduce((sum, r) => sum + (r['Số lượng'] || 0), 0);
  const totalAvail = inventoryRows.reduce((sum, r) => sum + (r['Ghi chú'] || 0), 0);

  // Build a unified DynamicProductRow with all info
  const row: DynamicProductRow = {
    id: hom.id,
    'mã sản phẩm': hom.ma_hom,
    code: hom.ma_hom,
    'sản phẩm': hom.ten_hom,
    name: hom.ten_hom,
    product_name: hom.ten_hom,
    'hòm sản phẩm': hom.ten_hom,
    'Tên hàng hóa': hom.ten_hom,
    gia_ban: hom.gia_ban,
    'gói sản phẩm': hom.gia_ban,
    gia_von: hom.gia_von,
    hinh_anh: hom.hinh_anh,
    // Use available qty (Ghi chú) for display — not total
    'số lượng': totalAvail,
    'Số lượng': totalAvail,
    ton_kho: totalAvail,
    'kho nào': warehouse?.ten_kho || '—',
    'mã kho': warehouse?.ma_kho || '',
    'loại hàng': firstInv?.['Loại hàng'] || '',
    // Còn hàng = available > 0
    'tình trạng': totalAvail > 0 ? 'in_stock' : 'unavailable',
    is_active: totalAvail > 0 ? 'in_stock' : 'unavailable',
    // Supplier info
    'nhà cung cấp': supplier?.ten_ncc || '',
    'mã ncc': supplier?.ma_ncc || '',
    'liên hệ ncc': supplier?.nguoi_lien_he || '',
    'sdt ncc': supplier?.sdt || '',
    'địa chỉ ncc': supplier?.dia_chi || '',
    // Warehouse listing
    'danh sách kho': inventoryRows.map((r) => {
      return `KHẢ DỤNG: ${r['Ghi chú']} (Tổng: ${r['Số lượng']})`;
    }).join(', '),
  };

  return row;
}

/** SEO metadata */
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { qrCode } = await params;

  try {
    const row = await getProductByCode(qrCode);
    if (!row) return { title: 'Không tìm thấy sản phẩm' };

    const name = String(
      row['sản phẩm'] ?? row['name'] ?? row['product_name'] ?? 'Thông tin sản phẩm'
    );

    return {
      title: name,
      description: `Xem chi tiết sản phẩm: ${name}.`,
    };
  } catch {
    return { title: 'Thông tin sản phẩm' };
  }
}

/**
 * Product detail page — /product/[qrCode]
 */
export default async function ProductPage({ params }: ProductPageProps) {
  const { qrCode } = await params;
  const productCode = extractProductCode(decodeURIComponent(qrCode));
  
  let row: DynamicProductRow | null = null;
  let fetchFailed = false;

  try {
    row = await getProductByCode(qrCode);
  } catch {
    fetchFailed = true;
  }

  if (fetchFailed) {
    notFound();
  }

  if (!row) {
    return <ProductNotFound lookupValue={productCode} />;
  }

  const productName = String(
    row['hòm sản phẩm'] ?? row['sản phẩm'] ?? row['name'] ?? row['product_name'] ?? 'Sản phẩm'
  );

  const statusValue = String(row['tình trạng'] ?? row[PRODUCT_CONFIG.STATUS_COLUMN] ?? '');

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#faf7f2] via-white to-slate-50">
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
              <QrCode size={14} className="text-[#2d4a7a]" />
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

        {/* Print button */}
        <PrintButton />
      </div>
    </main>
  );
}
