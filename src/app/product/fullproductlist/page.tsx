import { Metadata } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import ProductListClient from './ProductListClient';

export const metadata: Metadata = {
  title: 'Danh sách mã QR sản phẩm',
  description: 'Xem và in mã QR cho toàn bộ sản phẩm trong danh mục hòm.',
};

export const dynamic = 'force-dynamic';

interface DimHom {
  id: string;
  ma_hom: string;
  ten_hom: string;
  gia_ban: number | null;
  hinh_anh: string | null;
  loai_hom: string | null;
  kich_thuoc: string | null;
  is_active: boolean;
}

interface FactInventoryRow {
  'Mã': string;
  'Tên hàng hóa': string;
  'Kho': string;
  'Số lượng': number;
}

interface DimKho {
  id: string;
  ma_kho: string;
  ten_kho: string;
}

export default async function ProductListPage() {
  const supabase = getSupabaseAdmin();

  // Fetch ALL products from dim_hom + inventory for stock info
  const [homRes, inventoryRes, khoRes] = await Promise.all([
    supabase
      .from('dim_hom')
      .select('id, ma_hom, ten_hom, gia_ban, hinh_anh, loai_hom, kich_thuoc, is_active')
      .order('ma_hom', { ascending: true }),
    supabase.from('fact_inventory').select('*'),
    supabase.from('dim_kho').select('id, ma_kho, ten_kho'),
  ]);

  if (homRes.error) {
    return (
      <div className="min-h-screen p-10 flex items-center justify-center bg-gray-50">
        <p className="text-red-500 font-semibold px-4 py-3 bg-red-50 rounded-xl border border-red-200">
          Lỗi không thể lấy dữ liệu sản phẩm: {homRes.error.message}
        </p>
      </div>
    );
  }

  const allProducts = (homRes.data || []) as DimHom[];
  const inventory = (inventoryRes.data || []) as FactInventoryRow[];

  // Build warehouse lookup
  const khoMap = new Map<string, DimKho>();
  for (const k of (khoRes.data || []) as DimKho[]) {
    khoMap.set(k.id, k);
  }

  // Build inventory summary: productCode → { totalQty, warehouses }
  const inventorySummary = new Map<string, { quantity: number; warehouses: Set<string> }>();
  for (const row of inventory) {
    const code = row['Mã'] || '';
    if (!code) continue;

    const kho = khoMap.get(row['Kho']);
    const warehouseName = kho?.ten_kho || '';
    const qty = row['Số lượng'] || 0;

    if (!inventorySummary.has(code)) {
      inventorySummary.set(code, { quantity: 0, warehouses: new Set() });
    }
    const summary = inventorySummary.get(code)!;
    summary.quantity += qty;
    if (warehouseName) summary.warehouses.add(warehouseName);
  }

  // Build product list from dim_hom, enriched with inventory data
  const products = allProducts
    .filter(h => h.is_active !== false) // Skip inactive products
    .map(h => {
      const inv = inventorySummary.get(h.ma_hom);
      return {
        productCode: h.ma_hom,
        productName: h.ten_hom,
        warehouse: inv ? Array.from(inv.warehouses).sort().join(', ') || '—' : '—',
        quantity: inv?.quantity || 0,
        category: h.loai_hom || '',
      };
    });

  return <ProductListClient products={products} />;
}
