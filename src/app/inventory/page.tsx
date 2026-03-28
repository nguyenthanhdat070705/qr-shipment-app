import { Metadata } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { Warehouse, CheckCircle, PackageOpen, AlertTriangle } from 'lucide-react';
import InventorySearch from '@/components/InventorySearch';
import PageLayout from '@/components/PageLayout';

export const metadata: Metadata = {
  title: 'Kho hàng — Blackstones',
  description: 'Xem tồn kho, giá, số lượng sản phẩm.',
};

export const dynamic = 'force-dynamic';

/**
 * Hash-based coffin image selector
 */
function getCoffinImage(productCode: string): string {
  let hash = 0;
  for (let i = 0; i < productCode.length; i++) {
    hash = ((hash << 5) - hash + productCode.charCodeAt(i)) | 0;
  }
  const index = (Math.abs(hash) % 5) + 1;
  return `/coffin-${index}.png`;
}

function StatCard({
  label, value, icon, color, bg, border,
}: {
  label: string; value: number;
  icon: React.ReactNode; color: string; bg: string; border: string;
}) {
  return (
    <div className={`rounded-2xl bg-white border ${border} p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow`}>
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bg} flex-shrink-0`}>
        <span className={color}>{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-extrabold text-gray-900 leading-none">{value}</p>
        <p className="text-xs font-semibold text-gray-400 mt-1 uppercase tracking-wide">{label}</p>
      </div>
    </div>
  );
}

interface FactInventoryRow {
  'Mã': string;
  'Tên hàng hóa': string;  // FK → dim_hom.id
  'Kho': string;            // FK → dim_kho.id
  'Số lượng': number;
  'Loại hàng': string | null;
  'Ghi chú': number;        // so_luong_kha_dung
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

export default async function InventoryPage() {
  const supabase = getSupabaseAdmin();

  // Fetch all 4 tables in parallel
  const [inventoryRes, homRes, khoRes, nccRes] = await Promise.all([
    supabase.from('fact_inventory').select('*'),
    supabase.from('dim_hom').select('id, ma_hom, ten_hom, gia_ban, gia_von, hinh_anh, NCC'),
    supabase.from('dim_kho').select('id, ma_kho, ten_kho'),
    supabase.from('dim_ncc').select('id, ma_ncc, ten_ncc, nguoi_lien_he, sdt, dia_chi'),
  ]);

  if (inventoryRes.error) {
    return (
      <div className="min-h-screen p-10 flex items-center justify-center bg-gray-50">
        <p className="text-red-500 font-semibold px-4 py-3 bg-red-50 rounded-xl border border-red-200">
          Lỗi tải tồn kho: {inventoryRes.error.message}
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

  const nccMap = new Map<string, DimNcc>();
  for (const n of (nccRes.data || []) as DimNcc[]) {
    nccMap.set(n.id, n);
  }

  const inventory = (inventoryRes.data || []) as FactInventoryRow[];

  // Group by product code and warehouse to avoid merging different warehouses
  const productGroupMap = new Map<string, {
    homId: string;
    khoId: string;
    totalQty: number;
    totalAvail: number;
    warehouses: Set<string>;
    warehouseCodes: Set<string>;
    loaiSet: Set<string>;
  }>();

  for (const row of inventory) {
    const homId = row['Tên hàng hóa'];
    const khoId = row['Kho'] || 'unknown_kho';
    const kho = khoMap.get(khoId);
    const groupKey = `${homId}_${khoId}`;
    const loai = row['Loại hàng'] || '';
    
    const existing = productGroupMap.get(groupKey);

    if (existing) {
      existing.totalQty += row['Số lượng'] || 0;
      existing.totalAvail += row['Ghi chú'] || 0;
      if (loai) existing.loaiSet.add(loai);
    } else {
      const warehouses = new Set<string>();
      const warehouseCodes = new Set<string>();
      const loaiSet = new Set<string>();
      if (kho?.ten_kho) warehouses.add(kho.ten_kho);
      if (kho?.ma_kho) warehouseCodes.add(kho.ma_kho);
      if (loai) loaiSet.add(loai);
      
      productGroupMap.set(groupKey, {
        homId,
        khoId,
        totalQty: row['Số lượng'] || 0,
        totalAvail: row['Ghi chú'] || 0,
        warehouses,
        warehouseCodes,
        loaiSet,
      });
    }
  }

  // Transform grouped data to InventoryItem format expected by InventorySearch
  const items = Array.from(productGroupMap.values()).map((group) => {
    const hom = homMap.get(group.homId);
    const ncc = hom?.NCC ? nccMap.get(hom.NCC) : null;

    const code = hom?.ma_hom || '—';
    const name = hom?.ten_hom || 'Chưa có tên';
    const price = Number(hom?.gia_ban || 0);
    const warehouse = Array.from(group.warehouses).join(', ') || '—';
    const warehouseCode = Array.from(group.warehouseCodes).join(', ');
    const soLuong = group.totalQty;
    const loaiHang = Array.from(group.loaiSet).join(', ');
    const khaDung = group.totalAvail;

    const rawImg = hom?.hinh_anh || '';
    const hasRealImage = rawImg && rawImg.startsWith('http');
    const imageUrl = hasRealImage ? rawImg : getCoffinImage(code);

    // Còn hàng = khả dụng > 0 (NOT tổng số lượng)
    const isOutOfStock = khaDung <= 0;
    const isExported = soLuong > 0 && khaDung <= 0; // Đã xuất hết khả dụng
    const available = khaDung > 0;

    return {
      code,
      name,
      price,
      giaVon: Number(hom?.gia_von || 0),
      status: loaiHang,
      tonKho: String(soLuong),
      khaDung: String(khaDung),
      warehouse,
      warehouseCode,
      serial: '',
      imageUrl,
      isExported,
      isOutOfStock,
      available,
      lots: [] as string[],
      supplierName: ncc?.ten_ncc || '',
      supplierContact: ncc?.nguoi_lien_he || '',
      supplierPhone: ncc?.sdt || '',
      supplierAddress: ncc?.dia_chi || '',
    };
  });

  const totalProducts = items.length;
  const availableCount = items.filter((i) => i.available).length;
  const outOfStockCount = items.filter((i) => i.isOutOfStock).length;
  const exportedCount = items.filter((i) => i.isExported).length;

  return (
    <PageLayout title="Kho hàng" icon={<Warehouse size={15} className="text-sky-500" />}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Kho hàng</h1>
          <p className="text-sm text-gray-500 mt-0.5">Xem tồn kho, loại hàng, tình trạng sản phẩm.</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Tổng SP" value={totalProducts} icon={<Warehouse size={22} />} color="text-[#1B2A4A]" bg="bg-[#eef1f7]" border="border-[#d5dbe9]" />
        <StatCard label="Còn hàng" value={availableCount} icon={<CheckCircle size={22} />} color="text-emerald-600" bg="bg-emerald-50" border="border-emerald-200" />
        <StatCard label="Hết hàng" value={outOfStockCount} icon={<AlertTriangle size={22} />} color="text-red-600" bg="bg-red-50" border="border-red-200" />
      </div>

      {/* Search + Table — Client Component */}
      <InventorySearch items={JSON.parse(JSON.stringify(items))} />
    </PageLayout>
  );
}
