import { Metadata } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import ProductListClient from './ProductListClient';

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
  ten_hom_the_hien?: string | null;
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
    supabase.from('dim_hom').select('id, ma_hom, ten_hom, gia_ban, hinh_anh, ten_hom_the_hien'),
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

  // Build product list from all known products in dim_hom to ensure complete QR coverage
  const productMap = new Map<string, any>();

  for (const h of (homRes.data || []) as DimHom[]) {
    productMap.set(h.ma_hom, {
      productCode: h.ma_hom,
      productName: h.ten_hom_the_hien || h.ten_hom || 'Chưa có tên',
      warehouse: '—',
      quantity: 0,
      category: '—',
    });
  }

  // Update product list with actual inventory quantities and locations
  for (const row of inventory) {
    const hom = homMap.get(row['Tên hàng hóa']);
    const kho = khoMap.get(row['Kho']);

    const productCode = hom?.ma_hom || row['Mã'] || '—';
    const warehouse = kho?.ten_kho || '—';
    const quantity = row['Số lượng'] || 0;
    const category = row['Loại hàng'] || '';

    if (productMap.has(productCode)) {
      const existing = productMap.get(productCode);
      existing.quantity += quantity;
      
      if (existing.category === '—' && category) {
        existing.category = category;
      }

      // Gộp tên kho nếu chưa có
      if (warehouse !== '—' && !existing.warehouse.includes(warehouse)) {
        if (existing.warehouse === '—') {
          existing.warehouse = warehouse;
        } else {
          existing.warehouse += `, ${warehouse}`;
        }
      }
    } else {
      // Fallback for items in inventory that are somehow entirely missing from dim_hom
      productMap.set(productCode, {
        productCode,
        productName: hom?.ten_hom_the_hien || hom?.ten_hom || 'Chưa có tên',
        warehouse,
        quantity,
        category,
      });
    }
  }

  const products = Array.from(productMap.values());

  return <ProductListClient products={products} />;
}
