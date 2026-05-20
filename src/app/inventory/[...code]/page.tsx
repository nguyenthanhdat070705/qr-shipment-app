import { Metadata } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import Link from 'next/link';
import {
  ArrowLeft, Warehouse, Box, DollarSign, TrendingUp,
  User, Phone, MapPin, ClipboardList, Package,
  ArrowDownCircle, ArrowUpCircle, History, Info,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ code: string[] }>;
}

/* ── helpers ───────────────────────────────────── */

function getCoffinImage(productCode: string): string {
  if (productCode === '2AQ0106' || productCode === '2AQ0129') return '/coffin-3.png';
  let hash = 0;
  for (let i = 0; i < productCode.length; i++) {
    hash = ((hash << 5) - hash + productCode.charCodeAt(i)) | 0;
  }
  return `/coffin-${(Math.abs(hash) % 5) + 1}.png`;
}

function formatPrice(v: number): string {
  if (!v) return '—';
  return v.toLocaleString('vi-VN');
}

/* ── interfaces ────────────────────────────────── */

interface DimHom {
  id: string;
  ma_hom: string;
  ten_hom: string;
  ten_hom_the_hien: string | null;
  ten_mkt: string | null;
  ten_ky_thuat: string | null;
  ten_chuan_hoa: string | null;
  nhom_san_pham: string | null;
  nhom_hang_hoa: string | null;
  loai_hom: string | null;
  loai_san_pham: string | null;
  loai_go: string | null;
  Mau_sac: string | null;
  kich_thuoc: string | null;
  Thanh: string | null;
  nap: string | null;
  be_mat: string | null;
  dac_diem: string | null;
  Muc_dich: string | null;
  Ton_giao: string | null;
  Nguon_goc: string | null;
  Liet: string | null;
  Goi_dich_vu: string | null;
  thong_so_khac: string | null;
  don_vi_tinh: string | null;
  gia_ban: number | null;
  gia_ban_1: number | null;
  hinh_anh: string | null;
  is_active: boolean;
}
interface DimKho { id: string; ma_kho: string; ten_kho: string; }
interface DimNcc {
  id: string; ma_ncc: string; ten_ncc: string;
  nguoi_lien_he: string | null; sdt: string | null; dia_chi: string | null;
}
interface FactInventoryRow {
  'Mã': string;
  'Tên hàng hóa': string;
  'Kho': string;
  'Số lượng': number;
  'Loại hàng': string | null;
  'Ghi chú': number;
}

/* ── metadata ──────────────────────────────────── */

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const productCode = decodeURIComponent(code.join('/')).trim();
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('dim_hom')
    .select('ten_hom, ten_hom_the_hien')
    .eq('ma_hom', productCode)
    .limit(1)
    .maybeSingle();

  const displayName = data?.ten_hom_the_hien || data?.ten_hom;
  return {
    title: displayName ? `${displayName} — Kho hàng` : 'Chi tiết sản phẩm',
    description: 'Xem chi tiết thông tin sản phẩm trong kho hàng.',
  };
}

/* ── page ──────────────────────────────────────── */

export default async function InventoryDetailPage({ params }: PageProps) {
  const { code } = await params;
  const productCode = decodeURIComponent(code.join('/')).trim();
  const supabase = getSupabaseAdmin();

  // 1. Find the product in dim_hom
  const { data: hom, error: homErr } = await supabase
    .from('dim_hom')
    .select(`
      id, ma_hom, ten_hom, ten_hom_the_hien, ten_mkt, ten_ky_thuat, ten_chuan_hoa,
      nhom_san_pham, nhom_hang_hoa, loai_hom, loai_san_pham, loai_go,
      "Mau_sac", kich_thuoc, "Thanh", nap, be_mat, dac_diem,
      "Muc_dich", "Ton_giao", "Nguon_goc", "Liet", "Goi_dich_vu",
      thong_so_khac, don_vi_tinh, gia_ban, gia_ban_1, hinh_anh, is_active
    `)
    .eq('ma_hom', productCode)
    .limit(1)
    .maybeSingle();

  if (homErr || !hom) {
    if (homErr) console.error('[inventory/[code]] dim_hom error:', homErr);
    notFound();
  }
  const dimHom = hom as DimHom;

  // 2. Find all inventory rows for this product
  const { data: inventoryRows } = await supabase
    .from('fact_inventory')
    .select('*')
    .eq('Tên hàng hóa', dimHom.id);

  const rawInventory = (inventoryRows || []) as FactInventoryRow[];

  // 3. Get warehouse info
  const khoIds = [...new Set(rawInventory.map(r => r['Kho']).filter(Boolean))];
  const { data: khoData } = await supabase
    .from('dim_kho')
    .select('id, ma_kho, ten_kho')
    .in('id', khoIds.length > 0 ? khoIds : ['__none__']);
  const khoMap = new Map<string, DimKho>();
  for (const k of (khoData || []) as DimKho[]) khoMap.set(k.id, k);

  // 3b. Group inventory by warehouse (eliminate duplicates)
  const warehouseGroupMap = new Map<string, { qty: number; avail: number; loaiSet: Set<string> }>();
  for (const row of rawInventory) {
    const wId = row['Kho'] || '__unknown__';
    const existing = warehouseGroupMap.get(wId);
    const loai = row['Loại hàng'] || '';
    if (existing) {
      existing.qty += row['Số lượng'] || 0;
      existing.avail += row['Ghi chú'] || 0;
      if (loai) existing.loaiSet.add(loai);
    } else {
      const loaiSet = new Set<string>();
      if (loai) loaiSet.add(loai);
      warehouseGroupMap.set(wId, {
        qty: row['Số lượng'] || 0,
        avail: row['Ghi chú'] || 0,
        loaiSet,
      });
    }
  }
  const inventory = Array.from(warehouseGroupMap.entries()).map(([khoId, group]) => ({
    'Kho': khoId,
    'Số lượng': group.qty,
    'Ghi chú': group.avail,
    'Loại hàng': Array.from(group.loaiSet).join(', ') || null,
  }));

  // 4. Fetch GRPO (nhập) history for this product
  const { data: grpoItems } = await supabase
    .from('fact_nhap_hang_items')
    .select('so_luong_thuc_nhan, created_at, nhap_hang_id')
    .eq('ma_hom', productCode)
    .order('created_at', { ascending: false })
    .limit(30);

  // Enrich GRPO items with GR code, warehouse, and supplier (via don_hang_id → dim_ncc)
  const grpoHistory: { code: string; qty: number; date: string; warehouse: string; supplierName: string }[] = [];
  let ncc: DimNcc | null = null;
  if (grpoItems && grpoItems.length > 0) {
    const grIds = [...new Set(grpoItems.map((i: any) => i.nhap_hang_id).filter(Boolean))];
    const { data: grData } = await supabase
      .from('fact_nhap_hang')
      .select('id, ma_phieu_nhap, kho_id, ngay_nhan, don_hang_id')
      .in('id', grIds);
    const grMap = new Map<string, any>();
    for (const gr of (grData || [])) grMap.set(gr.id, gr);

    // Look up suppliers via fact_don_hang.ncc_id
    const donIds = [...new Set((grData || []).map((g: any) => g.don_hang_id).filter(Boolean))];
    const donMap = new Map<string, string>(); // don_hang_id -> ncc_id
    if (donIds.length > 0) {
      const { data: donData } = await supabase
        .from('fact_don_hang')
        .select('id, ncc_id')
        .in('id', donIds);
      for (const d of (donData || []) as any[]) donMap.set(d.id, d.ncc_id);
    }
    const nccIds = [...new Set(Array.from(donMap.values()).filter(Boolean))];
    const nccMap = new Map<string, DimNcc>();
    if (nccIds.length > 0) {
      const { data: nccData } = await supabase
        .from('dim_ncc')
        .select('id, ma_ncc, ten_ncc, nguoi_lien_he, sdt, dia_chi')
        .in('id', nccIds);
      for (const n of (nccData || []) as DimNcc[]) nccMap.set(n.id, n);
      // Pick the most recent supplier as the "primary" supplier for the product
      const primaryGr = (grData || []).find((g: any) => g.don_hang_id && donMap.get(g.don_hang_id));
      if (primaryGr) {
        const nccId = donMap.get((primaryGr as any).don_hang_id);
        if (nccId) ncc = nccMap.get(nccId) || null;
      }
    }

    for (const item of grpoItems as any[]) {
      const gr = grMap.get(item.nhap_hang_id);
      const kho = gr?.kho_id ? khoMap.get(gr.kho_id) : null;
      const nccId = gr?.don_hang_id ? donMap.get(gr.don_hang_id) : null;
      const grNcc = nccId ? nccMap.get(nccId) : null;
      grpoHistory.push({
        code: gr?.ma_phieu_nhap || '—',
        qty: item.so_luong_thuc_nhan || 0,
        date: gr?.ngay_nhan || item.created_at || '',
        warehouse: kho?.ten_kho || '—',
        supplierName: grNcc?.ten_ncc || '',
      });
    }
  }

  // 5. Fetch IT/GRIT (xuất) history for this product
  const { data: itItems } = await supabase
    .from('fact_xuat_hang_items')
    .select('so_luong, created_at, xuat_hang_id, ghi_chu')
    .eq('ma_hom', productCode)
    .order('created_at', { ascending: false })
    .limit(30);

  const itHistory: { code: string; qty: number; date: string; warehouse: string; note: string }[] = [];
  if (itItems && itItems.length > 0) {
    const itIds = [...new Set(itItems.map((i: any) => i.xuat_hang_id).filter(Boolean))];
    const { data: itData } = await supabase
      .from('fact_xuat_hang')
      .select('id, ma_phieu_xuat, kho_id, created_at, ghi_chu, ngay_giao')
      .in('id', itIds);
    const itMap = new Map<string, any>();
    for (const it of (itData || [])) itMap.set(it.id, it);

    for (const item of itItems as any[]) {
      const it = itMap.get(item.xuat_hang_id);
      const kho = it?.kho_id ? khoMap.get(it.kho_id) : null;
      itHistory.push({
        code: it?.ma_phieu_xuat || '—',
        qty: item.so_luong || 0,
        date: it?.ngay_giao || it?.created_at || item.created_at || '',
        warehouse: kho?.ten_kho || '—',
        note: it?.ghi_chu || item.ghi_chu || '',
      });
    }
  }

  // 6. Totals
  const totalIn = grpoHistory.reduce((s, e) => s + (e.qty || 0), 0);
  const totalOut = itHistory.reduce((s, e) => s + (e.qty || 0), 0);

  // 7. Image
  const rawImg = dimHom.hinh_anh || '';
  const hasRealImage = rawImg && rawImg.startsWith('http');
  const imageUrl = hasRealImage ? rawImg : getCoffinImage(dimHom.ma_hom);

  // 8. Stock totals
  const totalQty = inventory.reduce((s, r) => s + (r['Số lượng'] || 0), 0);
  const totalAvail = inventory.reduce((s, r) => s + (r['Ghi chú'] || 0), 0);
  const isOutOfStock = totalAvail <= 0;

  // 9. Profit
  const giaBan = Number(dimHom.gia_ban_1 || 0);
  const giaVon = Number(dimHom.gia_ban || 0);
  const profit = giaBan > 0 && giaVon > 0 ? giaBan - giaVon : 0;

  // 10. Display name
  const displayName = dimHom.ten_hom_the_hien || dimHom.ten_hom;

  // 11. Product specs (filter out empty ones)
  const specs: { label: string; value: string }[] = [
    { label: 'Loại hòm', value: dimHom.loai_hom || '' },
    { label: 'Loại gỗ', value: dimHom.loai_go || '' },
    { label: 'Kích thước', value: dimHom.kich_thuoc || '' },
    { label: 'Độ dày thành', value: dimHom.Thanh || '' },
    { label: 'Màu sắc', value: dimHom.Mau_sac || '' },
    { label: 'Nắp', value: dimHom.nap || '' },
    { label: 'Bề mặt', value: dimHom.be_mat || '' },
    { label: 'Đặc điểm', value: dimHom.dac_diem || '' },
    { label: 'Liệt', value: dimHom.Liet || '' },
    { label: 'Tôn giáo', value: dimHom.Ton_giao || '' },
    { label: 'Nguồn gốc', value: dimHom.Nguon_goc || '' },
    { label: 'Nhóm hàng hóa', value: dimHom.nhom_hang_hoa || '' },
    { label: 'Loại sản phẩm', value: dimHom.loai_san_pham || '' },
    { label: 'Mục đích', value: dimHom.Muc_dich || '' },
    { label: 'Gói dịch vụ', value: dimHom.Goi_dich_vu || '' },
    { label: 'Đơn vị tính', value: dimHom.don_vi_tinh || '' },
    { label: 'Thông số khác', value: dimHom.thong_so_khac || '' },
  ].filter(s => s.value && s.value.trim() !== '');

  return (
    <PageLayout title="Chi tiết sản phẩm" icon={<Package size={15} className="text-sky-500" />}>
      {/* Back button */}
      <div className="mb-4 sm:mb-5">
        <Link
          href="/inout-management?tab=inventory"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors min-h-[40px]"
        >
          <ArrowLeft size={16} />
          Quay lại kho hàng
        </Link>
      </div>

      {/* ── Hero Card ──────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#162240] shadow-sm overflow-hidden mb-4 sm:mb-6">
        {/* Header gradient */}
        <div className="bg-gradient-to-r from-[#1B2A4A] to-[#2d5a8a] px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mb-1">
                Sản phẩm
              </p>
              <h1 className="text-white text-lg sm:text-xl font-bold leading-tight break-words">
                {displayName}
              </h1>
              {dimHom.ten_hom_the_hien && dimHom.ten_hom && dimHom.ten_hom !== dimHom.ten_hom_the_hien && (
                <p className="text-blue-100 text-xs mt-1">{dimHom.ten_hom}</p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-white/90 bg-white/20 px-2.5 py-1 rounded-lg break-all">
                  {dimHom.ma_hom}
                </span>
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full
                  ${isOutOfStock
                    ? 'bg-red-400/20 text-red-200'
                    : 'bg-emerald-400/20 text-emerald-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isOutOfStock ? 'bg-red-400' : 'bg-emerald-400'}`} />
                  {isOutOfStock ? 'Hết hàng' : 'Còn hàng'}
                </span>
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full
                  ${dimHom.is_active
                    ? 'bg-blue-400/20 text-blue-100'
                    : 'bg-gray-400/20 text-gray-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${dimHom.is_active ? 'bg-blue-300' : 'bg-gray-300'}`} />
                  {dimHom.is_active ? 'Đang bán' : 'Ngừng bán'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Image */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 dark:border-white/10">
          <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex items-center justify-center max-w-md mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={displayName}
              className="w-full max-h-48 sm:max-h-64 object-contain p-4"
            />
          </div>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100 dark:divide-white/10">
          <QuickStat
            icon={<Box size={16} />}
            label="Tổng tồn kho"
            value={String(totalQty)}
            color="text-blue-600 dark:text-blue-400"
            bg="bg-blue-50 dark:bg-blue-500/10"
          />
          <QuickStat
            icon={<ClipboardList size={16} />}
            label="Khả dụng"
            value={String(totalAvail)}
            color="text-emerald-600 dark:text-emerald-400"
            bg="bg-emerald-50 dark:bg-emerald-500/10"
          />
          <QuickStat
            icon={<DollarSign size={16} />}
            label="Giá bán"
            value={giaBan > 0 ? `${formatPrice(giaBan)}₫` : '—'}
            color="text-amber-600 dark:text-amber-400"
            bg="bg-amber-50 dark:bg-amber-500/10"
          />
          <QuickStat
            icon={<TrendingUp size={16} />}
            label="Giá vốn"
            value={giaVon > 0 ? `${formatPrice(giaVon)}₫` : '—'}
            color="text-purple-600 dark:text-purple-400"
            bg="bg-purple-50 dark:bg-purple-500/10"
          />
        </div>
      </div>

      {/* ── Detail Sections Grid ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

        {/* ── Thông số sản phẩm (from dim_hom) ───── */}
        <SectionCard
          icon={<Info size={16} />}
          title="Thông số sản phẩm"
          color="text-indigo-600 dark:text-indigo-400"
          bg="bg-indigo-50 dark:bg-indigo-500/10"
        >
          {specs.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic py-4 text-center">Chưa có thông số chi tiết</p>
          ) : (
            <div className="space-y-0">
              {specs.map((s) => (
                <InfoRow key={s.label} label={s.label} value={s.value} />
              ))}
            </div>
          )}
        </SectionCard>

        {/* ── Thông tin kho ─────────────────────────── */}
        <SectionCard
          icon={<Warehouse size={16} />}
          title="Tồn kho theo từng kho"
          color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-50 dark:bg-blue-500/10"
        >
          {inventory.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic py-4 text-center">Chưa có dữ liệu tồn kho</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-white/10">
              {inventory.map((row, idx) => {
                const kho = khoMap.get(row['Kho']);
                const qty = row['Số lượng'] || 0;
                const avail = row['Ghi chú'] || 0;
                const loai = row['Loại hàng'] || '';
                return (
                  <div key={idx} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10">
                          <Warehouse size={13} className="text-blue-500 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-white">{kho?.ten_kho || '—'}</p>
                          {kho?.ma_kho && (
                            <p className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{kho.ma_kho}</p>
                          )}
                        </div>
                      </div>
                      {loai && (
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full
                          ${loai === 'Ký gửi' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${loai === 'Ký gửi' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                          {loai}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 pl-9">
                      <div className="bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">Số lượng</p>
                        <p className="text-lg font-extrabold text-gray-900 dark:text-white">{qty}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">Khả dụng</p>
                        <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{avail}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* ── Thông tin giá ────────────── */}
        <SectionCard
          icon={<DollarSign size={16} />}
          title="Thông tin giá"
          color="text-emerald-600 dark:text-emerald-400"
          bg="bg-emerald-50 dark:bg-emerald-500/10"
        >
          <div className="space-y-0">
            <InfoRow label="Giá bán" value={giaBan > 0 ? `${formatPrice(giaBan)} ₫` : '—'} bold />
            <InfoRow label="Giá vốn" value={giaVon > 0 ? `${formatPrice(giaVon)} ₫` : '—'} />
            {profit > 0 && (
              <InfoRow
                label="Lợi nhuận / SP"
                value={`${formatPrice(profit)} ₫`}
                bold
                highlight="emerald"
              />
            )}
            {giaBan > 0 && giaVon > 0 && (
              <InfoRow
                label="Biên lợi nhuận"
                value={`${((profit / giaBan) * 100).toFixed(1)}%`}
                highlight="blue"
              />
            )}
          </div>
        </SectionCard>

        {/* ── Nhà cung cấp ─────────────────────────── */}
        <SectionCard
          icon={<User size={16} />}
          title="Nhà cung cấp"
          color="text-purple-600 dark:text-purple-400"
          bg="bg-purple-50 dark:bg-purple-500/10"
        >
          {ncc ? (
            <div className="space-y-0">
              <InfoRow label="Tên NCC" value={ncc.ten_ncc} bold />
              <InfoRow label="Mã NCC" value={ncc.ma_ncc} mono />
              {ncc.nguoi_lien_he && <InfoRow label="Người liên hệ" value={ncc.nguoi_lien_he} />}
              {ncc.sdt && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-white/10 last:border-b-0">
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-gray-400 dark:text-gray-500" />
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">SĐT</span>
                  </div>
                  <a href={`tel:${ncc.sdt}`} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                    {ncc.sdt}
                  </a>
                </div>
              )}
              {ncc.dia_chi && (
                <div className="flex items-start justify-between py-3 border-b border-gray-100 dark:border-white/10 last:border-b-0 gap-4">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <MapPin size={13} className="text-gray-400 dark:text-gray-500" />
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Địa chỉ</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-right">{ncc.dia_chi}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic py-4 text-center">Chưa có thông tin NCC</p>
          )}
        </SectionCard>
      </div>

      {/* ── Transaction History grouped by Warehouse ── */}
      <div className="mt-4 sm:mt-6">
        <SectionCard
          icon={<History size={16} />}
          title={`Lịch sử nhập / xuất  ·  Nhập ${totalIn} / Xuất ${totalOut}`}
          color="text-indigo-600 dark:text-indigo-400"
          bg="bg-indigo-50 dark:bg-indigo-500/10"
        >
          {grpoHistory.length === 0 && itHistory.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic py-4 text-center">Chưa có lịch sử nhập xuất</p>
          ) : (() => {
            // Combine and group by warehouse
            type TxEntry = { type: 'grpo' | 'it'; code: string; qty: number; date: string; warehouse: string; note?: string; supplierName?: string };
            const allTx: TxEntry[] = [
              ...grpoHistory.map(e => ({ ...e, type: 'grpo' as const })),
              ...itHistory.map(e => ({ ...e, type: 'it' as const })),
            ];
            const byWarehouse = new Map<string, TxEntry[]>();
            for (const tx of allTx) {
              const key = tx.warehouse || '—';
              if (!byWarehouse.has(key)) byWarehouse.set(key, []);
              byWarehouse.get(key)!.push(tx);
            }
            // Sort transactions within each warehouse by date desc
            for (const txs of byWarehouse.values()) {
              txs.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
            }

            return (
              <div className="space-y-5">
                {Array.from(byWarehouse.entries()).map(([whName, txs]) => {
                  const inCount = txs.filter(t => t.type === 'grpo').reduce((s, t) => s + t.qty, 0);
                  const outCount = txs.filter(t => t.type === 'it').reduce((s, t) => s + t.qty, 0);
                  return (
                    <div key={whName}>
                      {/* Warehouse header */}
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-indigo-100 dark:border-indigo-500/20 flex-wrap">
                        <Warehouse size={14} className="text-indigo-500 dark:text-indigo-400" />
                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">{whName}</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">+{inCount} nhập</span>
                        <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold">−{outCount} xuất</span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">{txs.length} giao dịch</span>
                      </div>

                      <div className="divide-y divide-gray-50 dark:divide-white/5 pl-1">
                        {txs.map((tx, i) => (
                          <div key={i} className="flex items-center gap-3 py-2.5">
                            <div className={`flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0 ${
                              tx.type === 'grpo' ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-orange-50 dark:bg-orange-500/10'
                            }`}>
                              {tx.type === 'grpo'
                                ? <ArrowDownCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
                                : <ArrowUpCircle size={14} className="text-orange-600 dark:text-orange-400" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-mono font-bold ${tx.type === 'grpo' ? 'text-emerald-700 dark:text-emerald-400' : 'text-orange-700 dark:text-orange-400'}`}>
                                  {tx.code}
                                </span>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                  tx.type === 'grpo' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300' : 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-300'
                                }`}>
                                  {tx.type === 'grpo' ? 'Nhập' : 'Xuất'}
                                </span>
                              </div>
                              {tx.type === 'grpo' && tx.supplierName && (
                                <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-0.5 truncate">NCC: {tx.supplierName}</p>
                              )}
                              {tx.type === 'it' && tx.note && (
                                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">{tx.note}</p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={`text-sm font-extrabold ${tx.type === 'grpo' ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                {tx.type === 'grpo' ? '+' : '−'}{tx.qty}
                              </p>
                              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                                {tx.date ? new Date(tx.date).toLocaleDateString('vi-VN') : '—'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </SectionCard>
      </div>
    </PageLayout>
  );
}

/* ═══════════════════════════════════════════════════
   Sub-components
═══════════════════════════════════════════════════ */

function QuickStat({
  icon, label, value, color, bg,
}: {
  icon: React.ReactNode; label: string; value: string; color: string; bg: string;
}) {
  return (
    <div className="px-3 sm:px-5 py-3 sm:py-4 text-center">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg} mx-auto mb-2`}>
        <span className={color}>{icon}</span>
      </div>
      <p className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white break-words">{value}</p>
      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  );
}

function SectionCard({
  icon, title, color, bg, children,
}: {
  icon: React.ReactNode; title: string; color: string; bg: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#162240] shadow-sm overflow-hidden">
      <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 dark:border-white/10 flex items-center gap-2.5">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg} flex-shrink-0`}>
          <span className={color}>{icon}</span>
        </div>
        <h2 className="text-sm font-bold text-gray-800 dark:text-white">{title}</h2>
      </div>
      <div className="px-4 sm:px-5 py-4">
        {children}
      </div>
    </div>
  );
}

function InfoRow({
  label, value, bold, mono, highlight,
}: {
  label: string; value: string; bold?: boolean; mono?: boolean; highlight?: 'emerald' | 'blue';
}) {
  const highlightColor = highlight === 'emerald'
    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-lg'
    : highlight === 'blue'
    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-lg'
    : '';

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-white/10 last:border-b-0 gap-4">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex-shrink-0">{label}</span>
      <span className={`text-sm ${bold ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'} ${mono ? 'font-mono' : ''} ${highlightColor} text-right break-words`}>
        {value}
      </span>
    </div>
  );
}
