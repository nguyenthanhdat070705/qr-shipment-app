import { Metadata } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import Link from 'next/link';
import {
  ArrowLeft, Warehouse, Tag, Box, Layers, DollarSign, TrendingUp,
  User, Phone, MapPin, ClipboardList, Package, CheckCircle, XCircle,
  ArrowDownCircle, ArrowUpCircle, History,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ code: string }>;
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
  gia_ban: number | null;
  gia_ban_1: number | null;
  hinh_anh: string | null;
  NCC: string | null;
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
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('dim_hom')
    .select('ten_hom')
    .eq('ma_hom', decodeURIComponent(code))
    .limit(1)
    .maybeSingle();

  return {
    title: data ? `${data.ten_hom} — Kho hàng` : 'Chi tiết sản phẩm',
    description: 'Xem chi tiết thông tin sản phẩm trong kho hàng.',
  };
}

/* ── page ──────────────────────────────────────── */

export default async function InventoryDetailPage({ params }: PageProps) {
  const { code } = await params;
  const productCode = decodeURIComponent(code);
  const supabase = getSupabaseAdmin();

  // 1. Find the product in dim_hom
  const { data: hom, error: homErr } = await supabase
    .from('dim_hom')
    .select('id, ma_hom, ten_hom, gia_ban, gia_ban_1, hinh_anh, NCC')
    .eq('ma_hom', productCode)
    .limit(1)
    .maybeSingle();

  if (homErr || !hom) notFound();

  // 2. Find all inventory rows for this product
  const { data: inventoryRows } = await supabase
    .from('fact_inventory')
    .select('*')
    .eq('Tên hàng hóa', hom.id);

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

  // 4. Get supplier info
  let ncc: DimNcc | null = null;
  if (hom.NCC) {
    const { data: nccData } = await supabase
      .from('dim_ncc')
      .select('id, ma_ncc, ten_ncc, nguoi_lien_he, sdt, dia_chi')
      .eq('id', hom.NCC)
      .single();
    ncc = nccData as DimNcc | null;
  }

  // 5. Fetch GRPO (nhập) history for this product
  const { data: grpoItems } = await supabase
    .from('fact_nhap_hang_items')
    .select('so_luong_thuc_nhan, created_at, nhap_hang_id')
    .eq('ma_hom', productCode)
    .order('created_at', { ascending: false })
    .limit(20);

  // Enrich GRPO items with GR code and warehouse
  const grpoHistory: { code: string; qty: number; date: string; warehouse: string }[] = [];
  if (grpoItems && grpoItems.length > 0) {
    const grIds = [...new Set(grpoItems.map((i: any) => i.nhap_hang_id).filter(Boolean))];
    const { data: grData } = await supabase
      .from('fact_nhap_hang')
      .select('id, ma_phieu_nhap, kho_id, ngay_nhan')
      .in('id', grIds);
    const grMap = new Map<string, any>();
    for (const gr of (grData || [])) grMap.set(gr.id, gr);

    for (const item of grpoItems as any[]) {
      const gr = grMap.get(item.nhap_hang_id);
      const kho = gr?.kho_id ? khoMap.get(gr.kho_id) : null;
      grpoHistory.push({
        code: gr?.ma_phieu_nhap || '—',
        qty: item.so_luong_thuc_nhan || 0,
        date: gr?.ngay_nhan || item.created_at || '',
        warehouse: kho?.ten_kho || '—',
      });
    }
  }

  // 6. Fetch IT/GRIT (xuất) history for this product
  const { data: itItems } = await supabase
    .from('fact_xuat_hang_items')
    .select('so_luong, created_at, xuat_hang_id, ghi_chu')
    .eq('ma_hom', productCode)
    .order('created_at', { ascending: false })
    .limit(20);

  const itHistory: { code: string; qty: number; date: string; warehouse: string; note: string }[] = [];
  if (itItems && itItems.length > 0) {
    const itIds = [...new Set(itItems.map((i: any) => i.xuat_hang_id).filter(Boolean))];
    const { data: itData } = await supabase
      .from('fact_xuat_hang')
      .select('id, ma_phieu_xuat, kho_id, created_at, ghi_chu')
      .in('id', itIds);
    const itMap = new Map<string, any>();
    for (const it of (itData || [])) itMap.set(it.id, it);

    for (const item of itItems as any[]) {
      const it = itMap.get(item.xuat_hang_id);
      const kho = it?.kho_id ? khoMap.get(it.kho_id) : null;
      itHistory.push({
        code: it?.ma_phieu_xuat || '—',
        qty: item.so_luong || 0,
        date: it?.created_at || item.created_at || '',
        warehouse: kho?.ten_kho || '—',
        note: it?.ghi_chu || item.ghi_chu || '',
      });
    }
  }

  // 7. Image
  const rawImg = hom.hinh_anh || '';
  const hasRealImage = rawImg && rawImg.startsWith('http');
  const imageUrl = hasRealImage ? rawImg : getCoffinImage(hom.ma_hom);

  // 6. Totals
  const totalQty = inventory.reduce((s, r) => s + (r['Số lượng'] || 0), 0);
  const totalAvail = inventory.reduce((s, r) => s + (r['Ghi chú'] || 0), 0);
  // Còn hàng = khả dụng > 0 (NOT tổng số lượng)
  const isOutOfStock = totalAvail <= 0;

  // 7. Profit
  const giaBan = Number(hom.gia_ban || 0);
  const giaVon = Number(hom.gia_ban_1 || 0);
  const profit = giaBan > 0 && giaVon > 0 ? giaBan - giaVon : 0;

  return (
    <PageLayout title="Chi tiết sản phẩm" icon={<Package size={15} className="text-sky-500" />}>
      {/* Back button */}
      <div className="mb-5">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} />
          Quay lại kho hàng
        </Link>
      </div>

      {/* ── Hero Card ──────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-6">
        {/* Header gradient */}
        <div className="bg-gradient-to-r from-[#1B2A4A] to-[#2d5a8a] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mb-1">
                Sản phẩm
              </p>
              <h1 className="text-white text-xl font-bold leading-tight">
                {hom.ten_hom}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="font-mono text-xs font-bold text-white/90 bg-white/20 px-2.5 py-1 rounded-lg">
                  {hom.ma_hom}
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
              </div>
            </div>
          </div>
        </div>

        {/* Product Image */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center max-w-md mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={hom.ten_hom}
              className="w-full max-h-64 object-contain p-4"
            />
          </div>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100">
          <QuickStat
            icon={<Box size={16} />}
            label="Tổng tồn kho"
            value={String(totalQty)}
            color="text-blue-600"
            bg="bg-blue-50"
          />
          <QuickStat
            icon={<ClipboardList size={16} />}
            label="Khả dụng"
            value={String(totalAvail)}
            color="text-emerald-600"
            bg="bg-emerald-50"
          />
          <QuickStat
            icon={<DollarSign size={16} />}
            label="Giá bán"
            value={giaBan > 0 ? `${formatPrice(giaBan)}₫` : '—'}
            color="text-amber-600"
            bg="bg-amber-50"
          />
          <QuickStat
            icon={<TrendingUp size={16} />}
            label="Giá vốn"
            value={giaVon > 0 ? `${formatPrice(giaVon)}₫` : '—'}
            color="text-purple-600"
            bg="bg-purple-50"
          />
        </div>
      </div>

      {/* ── Detail Sections Grid ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Thông tin kho ─────────────────────────── */}
        <SectionCard
          icon={<Warehouse size={16} />}
          title="Tồn kho theo từng kho"
          color="text-blue-600"
          bg="bg-blue-50"
        >
          {inventory.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-4 text-center">Chưa có dữ liệu tồn kho</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {inventory.map((row, idx) => {
                const kho = khoMap.get(row['Kho']);
                const qty = row['Số lượng'] || 0;
                const avail = row['Ghi chú'] || 0;
                const loai = row['Loại hàng'] || '';
                return (
                  <div key={idx} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
                          <Warehouse size={13} className="text-blue-500" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{kho?.ten_kho || '—'}</p>
                          {kho?.ma_kho && (
                            <p className="text-[10px] font-mono text-gray-400">{kho.ma_kho}</p>
                          )}
                        </div>
                      </div>
                      {loai && (
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full
                          ${loai === 'Ký gửi' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${loai === 'Ký gửi' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                          {loai}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 pl-9">
                      <div className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Số lượng</p>
                        <p className="text-lg font-extrabold text-gray-900">{qty}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Khả dụng</p>
                        <p className="text-lg font-extrabold text-emerald-600">{avail}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* ── Thông tin giá & Lợi nhuận ────────────── */}
        <div className="space-y-6">
          <SectionCard
            icon={<DollarSign size={16} />}
            title="Thông tin giá"
            color="text-emerald-600"
            bg="bg-emerald-50"
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
            color="text-purple-600"
            bg="bg-purple-50"
          >
            {ncc ? (
              <div className="space-y-0">
                <InfoRow label="Tên NCC" value={ncc.ten_ncc} bold />
                <InfoRow label="Mã NCC" value={ncc.ma_ncc} mono />
                {ncc.nguoi_lien_he && <InfoRow label="Người liên hệ" value={ncc.nguoi_lien_he} />}
                {ncc.sdt && (
                  <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-gray-400" />
                      <span className="text-xs font-semibold text-gray-500">SĐT</span>
                    </div>
                    <a href={`tel:${ncc.sdt}`} className="text-sm font-medium text-blue-600 hover:underline">
                      {ncc.sdt}
                    </a>
                  </div>
                )}
                {ncc.dia_chi && (
                  <div className="flex items-start justify-between py-3 border-b border-gray-100 last:border-b-0 gap-4">
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <MapPin size={13} className="text-gray-400" />
                      <span className="text-xs font-semibold text-gray-500">Địa chỉ</span>
                    </div>
                    <p className="text-sm font-medium text-gray-700 text-right">{ncc.dia_chi}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic py-4 text-center">Chưa liên kết nhà cung cấp</p>
            )}
          </SectionCard>
        </div>
      </div>

      {/* ── Transaction History grouped by Warehouse ── */}
      <div className="mt-6">
        <SectionCard
          icon={<History size={16} />}
          title="Lịch sử nhập / xuất"
          color="text-indigo-600"
          bg="bg-indigo-50"
        >
          {grpoHistory.length === 0 && itHistory.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-4 text-center">Chưa có lịch sử nhập xuất</p>
          ) : (() => {
            // Combine and group by warehouse
            type TxEntry = { type: 'grpo' | 'it'; code: string; qty: number; date: string; warehouse: string; note?: string };
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
                {Array.from(byWarehouse.entries()).map(([whName, txs]) => (
                  <div key={whName}>
                    {/* Warehouse header */}
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-indigo-100">
                      <Warehouse size={14} className="text-indigo-500" />
                      <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">{whName}</span>
                      <span className="text-[10px] text-gray-400 ml-auto">{txs.length} giao dịch</span>
                    </div>

                    <div className="divide-y divide-gray-50 pl-1">
                      {txs.map((tx, i) => (
                        <div key={i} className="flex items-center gap-3 py-2.5">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0 ${
                            tx.type === 'grpo' ? 'bg-emerald-50' : 'bg-orange-50'
                          }`}>
                            {tx.type === 'grpo'
                              ? <ArrowDownCircle size={14} className="text-emerald-600" />
                              : <ArrowUpCircle size={14} className="text-orange-600" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs font-mono font-bold ${tx.type === 'grpo' ? 'text-emerald-700' : 'text-orange-700'}`}>
                                {tx.code}
                              </span>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                tx.type === 'grpo' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'
                              }`}>
                                {tx.type === 'grpo' ? 'Nhập' : 'Xuất'}
                              </span>
                            </div>
                            {tx.type === 'it' && tx.note && (
                              <p className="text-[11px] text-gray-400 mt-0.5 truncate">{tx.note}</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-sm font-extrabold ${tx.type === 'grpo' ? 'text-emerald-600' : 'text-orange-600'}`}>
                              {tx.type === 'grpo' ? '+' : '−'}{tx.qty}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {tx.date ? new Date(tx.date).toLocaleDateString('vi-VN') : '—'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
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
    <div className="px-5 py-4 text-center">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg} mx-auto mb-2`}>
        <span className={color}>{icon}</span>
      </div>
      <p className="text-lg font-extrabold text-gray-900">{value}</p>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  );
}

function SectionCard({
  icon, title, color, bg, children,
}: {
  icon: React.ReactNode; title: string; color: string; bg: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
          <span className={color}>{icon}</span>
        </div>
        <h2 className="text-sm font-bold text-gray-800">{title}</h2>
      </div>
      <div className="px-5 py-4">
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
    ? 'text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg'
    : highlight === 'blue'
    ? 'text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg'
    : '';

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
      <span className="text-xs font-semibold text-gray-500">{label}</span>
      <span className={`text-sm ${bold ? 'font-bold text-gray-900' : 'font-medium text-gray-700'} ${mono ? 'font-mono' : ''} ${highlightColor}`}>
        {value}
      </span>
    </div>
  );
}
