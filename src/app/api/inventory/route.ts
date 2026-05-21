import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

function getCoffinImage(productCode: string): string {
  if (productCode === '2AQ0106' || productCode === '2AQ0129') return '/coffin-3.png';
  let hash = 0;
  for (let i = 0; i < productCode.length; i++) {
    hash = ((hash << 5) - hash + productCode.charCodeAt(i)) | 0;
  }
  const index = (Math.abs(hash) % 5) + 1;
  return `/coffin-${index}.png`;
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
  ten_hom_the_hien: string | null;
  gia_ban: number | null;
  gia_ban_1: number | null;
  hinh_anh: string | null;
  is_active: boolean;
}

interface DimKho {
  id: string;
  ma_kho: string;
  ten_kho: string;
}

export async function GET() {
  const supabase = getSupabaseAdmin();

  // Fetch stock, product, and warehouse data. Supplier data is intentionally excluded from this API.
  const [inventoryRes, homRes, khoRes] = await Promise.all([
    supabase.from('fact_inventory').select('*'),
    supabase.from('dim_hom').select('id, ma_hom, ten_hom, ten_hom_the_hien, gia_ban, gia_ban_1, hinh_anh, is_active'),
    supabase.from('dim_kho').select('id, ma_kho, ten_kho'),
  ]);

  if (inventoryRes.error) {
    return NextResponse.json({ error: inventoryRes.error.message }, { status: 500 });
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

  const productGroupMap = new Map<string, {
    homId: string;
    totalQty: number;
    totalAvail: number;
    loaiSet: Set<string>;
    loaiBreakdown: Map<string, number>; // type -> qty
    warehouseBreakdown: { khoId: string; name: string; code: string; qty: number; avail: number }[];
  }>();

  // Initialize with all products so we see products with 0 stock
  for (const h of (homRes.data || []) as DimHom[]) {
    productGroupMap.set(h.id, {
      homId: h.id,
      totalQty: 0,
      totalAvail: 0,
      loaiSet: new Set<string>(),
      loaiBreakdown: new Map<string, number>(),
      warehouseBreakdown: [],
    });
  }

  for (const row of inventory) {
    const homId = row['Tên hàng hóa'];
    const khoId = row['Kho'] || 'unknown_kho';
    const kho = khoMap.get(khoId);
    const loai = row['Loại hàng'] || '';
    const qty = row['Số lượng'] || 0;
    const avail = row['Ghi chú'] || 0;

    const existing = productGroupMap.get(homId);

    if (existing) {
      existing.totalQty += qty;
      existing.totalAvail += avail;
      
      if (loai) {
        existing.loaiSet.add(loai);
        existing.loaiBreakdown.set(loai, (existing.loaiBreakdown.get(loai) || 0) + avail);
      }

      // Add to warehouse breakdown
      const existingWh = existing.warehouseBreakdown.find(w => w.khoId === khoId);
      if (existingWh) {
        existingWh.qty += qty;
        existingWh.avail += avail;
      } else {
        existing.warehouseBreakdown.push({
          khoId, name: kho?.ten_kho || '—', code: kho?.ma_kho || '', qty, avail,
        });
      }
    }
  }

  // Transform grouped data to InventoryItem format expected by InventorySearch
  const items = Array.from(productGroupMap.values()).map((group) => {
    const hom = homMap.get(group.homId);

    const code = hom?.ma_hom || '—';
    const name = hom?.ten_hom_the_hien || hom?.ten_hom || 'Chưa có tên';
    const price = Number(hom?.gia_ban_1 || 0);
    const warehouse = group.warehouseBreakdown.map(w => w.name).join(', ') || '—';
    const warehouseCode = group.warehouseBreakdown.map(w => w.code).join(', ');
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
      giaVon: Number(hom?.gia_ban || 0),
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
      isActive: hom?.is_active ?? true,
      lots: [] as string[],
      warehouseBreakdown: group.warehouseBreakdown,
      typeBreakdown: Object.fromEntries(group.loaiBreakdown),
    };
  });

  return NextResponse.json({ data: items });
}
