import { Metadata } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import CatalogDetailClient from './CatalogDetailClient';

export const metadata: Metadata = {
  title: 'Chi tiết hòm | Catalog Blackstones',
};

export const dynamic = 'force-dynamic';

function pickField(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '' && String(v).trim() !== '—' && String(v).trim() !== '#N/A' && String(v).trim() !== '0') {
      return String(v).trim();
    }
  }
  return '';
}

export default async function CatalogDetailPage({
  params,
}: {
  params: Promise<{ ma_hom: string }>;
}) {
  const { ma_hom } = await params;
  const decoded = decodeURIComponent(ma_hom);
  const supabase = getSupabaseAdmin();

  const { data: hom, error } = await supabase
    .from('dim_hom')
    .select('*')
    .eq('ma_hom', decoded)
    .single();

  if (error || !hom) notFound();

  // Stock
  const { data: invRows } = await supabase
    .from('fact_inventory')
    .select('"Kho", "Số lượng"')
    .eq('Tên hàng hóa', hom.id);

  // Warehouses
  const { data: khoRows } = await supabase
    .from('dim_kho')
    .select('id, ma_kho, ten_kho');

  const khoMap = new Map<string, string>();
  for (const k of khoRows || []) khoMap.set(k.id, k.ten_kho);

  const stockByWarehouse = (invRows || [])
    .map((r: Record<string, unknown>) => ({
      khoName: khoMap.get(r['Kho'] as string) || 'Không xác định',
      quantity: Number(r['Số lượng']) || 0,
    }))
    .filter(r => r.quantity > 0);

  const totalStock = stockByWarehouse.reduce((s, r) => s + r.quantity, 0);

  // Related products (same loai_go OR same nhom_san_pham)
  const loaiGo = pickField(hom, 'Loai_go', 'loai_go');
  const { data: related } = await supabase
    .from('dim_hom')
    .select('id, ma_hom, ten_hom, ten_hom_the_hien, Ten_mkt, gia_ban, gia_ban_1, hinh_anh, Loai_go, loai_go, Mau_sac, Mau_Sac, mau_sac')
    .neq('ma_hom', decoded)
    .or(`Loai_go.eq.${loaiGo},loai_go.eq.${loaiGo},nhom_san_pham.eq.${hom.nhom_san_pham || ''}`)
    .limit(8);

  const detail = {
    id: hom.id,
    maHom: hom.ma_hom,
    tenMkt: pickField(hom, 'Ten_mkt', 'ten_mkt'),
    tenTheHien: pickField(hom, 'ten_hom_the_hien'),
    tenKyThuat: pickField(hom, 'Ten_ky_thuat', 'ten_ky_thuat'),
    tenChuanHoa: pickField(hom, 'Ten_chuan_hoa', 'ten_chuan_hoa'),
    tenHom: hom.ten_hom || '',
    nhomSanPham: hom.nhom_san_pham || '',
    loaiSanPham: hom.loai_san_pham || '',
    loaiGo,
    mauSac: pickField(hom, 'Mau_sac', 'Mau_Sac', 'mau_sac'),
    tonGiao: pickField(hom, 'Ton_giao', 'ton_giao'),
    goiDichVu: pickField(hom, 'Goi_dich_vu', 'goi_dich_vu'),
    dacDiem: hom.dac_diem || '',
    nap: pickField(hom, 'Nap', 'nap'),
    nguonGoc: pickField(hom, 'Nguon_goc', 'nguon_goc'),
    thanh: pickField(hom, 'Thanh', 'thanh'),
    liet: pickField(hom, 'Liet', 'liet'),
    beMat: pickField(hom, 'Be_mat', 'be_mat'),
    mucDich: pickField(hom, 'Muc_dich', 'muc_dich'),
    donVi: hom.don_vi_tinh || hom.Don_vi || 'Cái',
    kichThuoc: pickField(hom, 'kich_thuoc', 'Kich_thuoc'),
    thongSoKhac: hom.thong_so_khac || '',
    giaBan: Number(hom.gia_ban) || 0,
    giaBan1: Number(hom.gia_ban_1) || 0,
    giaVon: Number(hom.gia_von) || 0,
    hinhAnh: hom.hinh_anh || '',
    totalStock,
    stockByWarehouse,
  };

  return (
    <CatalogDetailClient
      item={detail}
      related={(related || []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        maHom: r.ma_hom as string,
        ten: (r['Ten_mkt'] as string) || (r['ten_hom_the_hien'] as string) || (r['ten_hom'] as string) || '',
        loaiGo: ((r['Loai_go'] as string) || (r['loai_go'] as string) || '') as string,
        mauSac: ((r['Mau_sac'] as string) || (r['Mau_Sac'] as string) || (r['mau_sac'] as string) || '') as string,
        giaBan: Number(r['gia_ban']) || Number(r['gia_ban_1']) || 0,
        hinhAnh: (r['hinh_anh'] as string) || '',
      }))}
    />
  );
}
