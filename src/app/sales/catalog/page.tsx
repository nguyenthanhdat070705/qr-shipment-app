import { Metadata } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import CatalogClient, { CatalogItem } from './CatalogClient';

export const metadata: Metadata = {
  title: 'Catalog Hòm Sản phẩm | Blackstones',
  description: 'Catalog hòm dành cho đội ngũ bán hàng — phân loại theo gỗ, màu sắc, tôn giáo.',
};

export const dynamic = 'force-dynamic';

interface DimHomRow {
  id: string;
  ma_hom: string;
  ten_hom: string | null;
  ten_hom_the_hien: string | null;
  Ten_mkt: string | null;
  ten_mkt: string | null;
  Ten_ky_thuat: string | null;
  ten_ky_thuat: string | null;
  Ten_chuan_hoa: string | null;
  ten_chuan_hoa: string | null;
  nhom_san_pham: string | null;
  loai_san_pham: string | null;
  loai_go: string | null;
  Loai_go: string | null;
  Mau_sac: string | null;
  Mau_Sac: string | null;
  mau_sac: string | null;
  Ton_giao: string | null;
  ton_giao: string | null;
  Goi_dich_vu: string | null;
  goi_dich_vu: string | null;
  dac_diem: string | null;
  Nap: string | null;
  nap: string | null;
  Nguon_goc: string | null;
  nguon_goc: string | null;
  Thanh: string | null;
  thanh: string | null;
  Liet: string | null;
  liet: string | null;
  Be_mat: string | null;
  be_mat: string | null;
  kich_thuoc: string | null;
  Kich_thuoc: string | null;
  gia_ban: number | null;
  gia_ban_1: number | null;
  gia_von: number | null;
  hinh_anh: string | null;
  is_active: boolean | null;
}

function pickField(row: DimHomRow, ...keys: (keyof DimHomRow)[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '' && String(v).trim() !== '—' && String(v).trim() !== '#N/A' && String(v).trim() !== '0') {
      return String(v).trim();
    }
  }
  return '';
}

export default async function CatalogPage() {
  const supabase = getSupabaseAdmin();

  const [homRes, invRes] = await Promise.all([
    supabase.from('dim_hom').select('*').order('ma_hom', { ascending: true }),
    supabase.from('fact_inventory').select('"Tên hàng hóa", "Số lượng"'),
  ]);

  if (homRes.error) {
    return (
      <div className="min-h-screen p-10 flex items-center justify-center bg-stone-50">
        <p className="text-red-500 font-semibold px-4 py-3 bg-red-50 rounded-xl border border-red-200">
          Lỗi không thể tải catalog hòm: {homRes.error.message}
        </p>
      </div>
    );
  }

  // Aggregate quantities by hom id
  const qtyMap = new Map<string, number>();
  for (const row of invRes.data || []) {
    const homId = (row as Record<string, unknown>)['Tên hàng hóa'] as string;
    const qty = Number((row as Record<string, unknown>)['Số lượng']) || 0;
    qtyMap.set(homId, (qtyMap.get(homId) || 0) + qty);
  }

  const rows = (homRes.data || []) as DimHomRow[];

  const items: CatalogItem[] = rows
    .filter(r => r.is_active !== false)
    .map(r => ({
      id: r.id,
      maHom: r.ma_hom,
      tenMkt: pickField(r, 'Ten_mkt', 'ten_mkt'),
      tenTheHien: pickField(r, 'ten_hom_the_hien'),
      tenKyThuat: pickField(r, 'Ten_ky_thuat', 'ten_ky_thuat'),
      tenChuanHoa: pickField(r, 'Ten_chuan_hoa', 'ten_chuan_hoa'),
      tenHom: r.ten_hom || '',
      nhomSanPham: r.nhom_san_pham || '',
      loaiSanPham: r.loai_san_pham || '',
      loaiGo: pickField(r, 'Loai_go', 'loai_go'),
      mauSac: pickField(r, 'Mau_sac', 'Mau_Sac', 'mau_sac'),
      tonGiao: pickField(r, 'Ton_giao', 'ton_giao'),
      goiDichVu: pickField(r, 'Goi_dich_vu', 'goi_dich_vu'),
      dacDiem: r.dac_diem || '',
      nap: pickField(r, 'Nap', 'nap'),
      nguonGoc: pickField(r, 'Nguon_goc', 'nguon_goc'),
      thanh: pickField(r, 'Thanh', 'thanh'),
      liet: pickField(r, 'Liet', 'liet'),
      beMat: pickField(r, 'Be_mat', 'be_mat'),
      kichThuoc: pickField(r, 'kich_thuoc', 'Kich_thuoc'),
      giaBan: Number(r.gia_ban) || 0,
      giaBan1: Number(r.gia_ban_1) || 0,
      giaVon: Number(r.gia_von) || 0,
      hinhAnh: r.hinh_anh || '',
      tonKho: qtyMap.get(r.id) || 0,
    }));

  return <CatalogClient items={items} />;
}
