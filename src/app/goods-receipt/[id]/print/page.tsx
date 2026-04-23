import { Metadata } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import GRPrintClient from './GRPrintClient';

export const metadata: Metadata = {
  title: 'In phiếu nhập kho',
};

export const dynamic = 'force-dynamic';

/* ─────────────────────────────────────────────────────── */
/* Helpers                                                  */
/* ─────────────────────────────────────────────────────── */

function parseProductName(fullName: string) {
  let material = '—';
  let color = '—';
  let feature = '—';
  let size = '—';
  let thickness = '—';

  const matMatch = fullName.match(/(?:Quan Tài\s+)?([^-]+)/i);
  if (matMatch) {
    material = matMatch[1].trim();
    const colorMatch = material.match(/\(([^)]+)\)/);
    if (colorMatch) {
      color = colorMatch[1].replace(/Gỗ /i, '').trim();
    }
  }

  const featureMatch = fullName.match(/-\s*([^-]+?)\s*-/);
  if (featureMatch) {
    feature = featureMatch[1].trim();
  } else {
    const parts = fullName.split('-');
    if (parts.length > 1 && !parts[1].includes('KT')) {
      feature = parts[1].split(';')[0].trim();
    }
  }

  const sizeMatch = fullName.match(/KT\s*(\([^)]+\)[a-zA-Z]*|[0-9a-zA-Z. x]+)/i);
  if (sizeMatch) size = sizeMatch[1].trim();

  const thickMatch = fullName.match(/Thành\s*([0-9a-zA-Z.]+)/i);
  if (thickMatch) thickness = thickMatch[1].trim();

  return { material, color, feature, size, thickness };
}

/* ─────────────────────────────────────────────────────── */
/* Page                                                     */
/* ─────────────────────────────────────────────────────── */

export default async function GRPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  /* ── Fetch GR ── */
  const { data: gr, error: grError } = await supabase
    .from('fact_nhap_hang')
    .select('*')
    .eq('id', id)
    .single();

  if (grError || !gr) notFound();

  /* ── Fetch GR items ── */
  const { data: rawItems } = await supabase
    .from('fact_nhap_hang_items')
    .select('*')
    .eq('nhap_hang_id', id);

  const items = (rawItems || []).map((item: Record<string, unknown>) => ({
    id: item.id as string,
    product_code: item.ma_hom as string,
    product_name: item.ten_hom as string,
    expected_qty: (item.so_luong_yeu_cau as number) || 0,
    received_qty: (item.so_luong_thuc_nhan as number) || 0,
  }));

  /* ── Fetch warehouse ── */
  let warehouseName = '—';
  if (gr.kho_id) {
    const { data: kho } = await supabase
      .from('dim_kho')
      .select('ten_kho')
      .eq('id', gr.kho_id)
      .single();
    if (kho) warehouseName = kho.ten_kho;
  }

  /* ── Fetch PO code ── */
  let poCode = '—';
  if (gr.don_hang_id) {
    const { data: po } = await supabase
      .from('fact_don_hang')
      .select('ma_don_hang')
      .eq('id', gr.don_hang_id)
      .single();
    if (po) poCode = po.ma_don_hang;
  }

  /* ── Fetch receiver name ── */
  let receivedBy = gr.nguoi_nhan_id as string;
  if (gr.nguoi_nhan_id) {
    const { data: acc } = await supabase
      .from('dim_account')
      .select('ho_ten, email')
      .eq('id', gr.nguoi_nhan_id)
      .maybeSingle();
    if (acc) receivedBy = acc.ho_ten || acc.email?.split('@')[0] || receivedBy;
  }

  /* ── Fetch all warehouses for checkbox list ── */
  const { data: warehouses } = await supabase
    .from('dim_kho')
    .select('id, ten_kho')
    .order('ten_kho');

  /* ── Fetch product info from dim_hom for each item ── */
  const productCodes = [...new Set(items.map((i) => i.product_code))];
  const { data: homList } = productCodes.length
    ? await supabase
        .from('dim_hom')
        .select('ma_hom, ten_hom, nhom_san_pham')
        .in('ma_hom', productCodes)
    : { data: [] };

  const homMap: Record<string, { ten_hom: string; nhom_san_pham: string }> = {};
  (homList || []).forEach((h: { ma_hom: string; ten_hom: string; nhom_san_pham: string }) => {
    homMap[h.ma_hom] = { ten_hom: h.ten_hom, nhom_san_pham: h.nhom_san_pham };
  });

  /* ── Build product sheet slides ── */
  const productSlides: Array<{
    product_code: string;
    ten_hom: string;
    nhom_san_pham: string;
    slideIndex: number;
    totalSlides: number;
  }> = [];

  for (const item of items) {
    const hom = homMap[item.product_code];
    const count = Math.max(item.received_qty, 1);
    for (let i = 1; i <= count; i++) {
      productSlides.push({
        product_code: item.product_code,
        ten_hom: hom?.ten_hom || item.product_name,
        nhom_san_pham: hom?.nhom_san_pham || 'AN TÁNG',
        slideIndex: i,
        totalSlides: count,
      });
    }
  }

  const grCode = gr.ma_phieu_nhap as string;
  const receivedDate = gr.ngay_nhan
    ? new Date(gr.ngay_nhan as string).toLocaleDateString('vi-VN')
    : '—';
  const totalExpected = items.reduce((s, i) => s + i.expected_qty, 0);
  const totalReceived = items.reduce((s, i) => s + i.received_qty, 0);
  const matchRate =
    totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0;

  const PROD_URL = 'https://blackstone-order-scm.vercel.app';

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');
            body {
              font-family: 'Montserrat', sans-serif !important;
              background: #e5e7eb !important;
              padding: 24px !important;
              margin: 0 !important;
            }
            .gr-print-page-break { page-break-after: always; break-after: page; }
            .gr-print-toolbar { display: flex; align-items: center; justify-content: space-between; max-width: 210mm; margin: 0 auto 20px; padding: 0 4px; }
            .gr-sheet {
              width: 210mm; min-height: 297mm; background: white;
              margin: 0 auto 32px; padding: 16mm 14mm;
              box-shadow: 0 4px 24px rgba(0,0,0,0.12);
              display: flex; flex-direction: column; position: relative;
            }
            .product-sheet {
              width: 210mm; min-height: 297mm; background: white;
              margin: 0 auto 32px; padding: 10mm;
              border: 8px solid #f3f4f6;
              box-shadow: 0 4px 24px rgba(0,0,0,0.12);
              display: flex; flex-direction: column; position: relative;
            }
            .slide-badge {
              position: absolute; top: 12px; right: 12px;
              background: #1B2A4A; color: white;
              font-size: 11px; font-weight: 700;
              padding: 3px 10px; border-radius: 999px;
            }
            .font-times {
              font-family: 'Times New Roman', Times, serif !important;
            }
            @media print {
              body { background: white !important; padding: 0 !important; }
              .gr-print-toolbar { display: none !important; }
              .gr-sheet, .product-sheet { box-shadow: none !important; margin: 0 !important; width: 100% !important; }
              @page { size: A4; margin: 0; }
            }
          `,
        }}
      />

      {/* ── Toolbar (hidden on print) ── */}
      <GRPrintClient />

      {/* ══════════════════════════════════════════════ */}
      {/* PAGE 1: GR Sheet                               */}
      {/* ══════════════════════════════════════════════ */}
      <div className="gr-sheet gr-print-page-break">

        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div style={{ width: '180px', height: '44px', position: 'relative' }}>
            <Image
              src="/blackstones-logo.webp"
              alt="Blackstones"
              fill
              style={{ objectFit: 'contain', objectPosition: 'left', filter: 'invert(1) brightness(0.1)' }}
            />
          </div>
          {/* QR for GR */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '10px', color: '#6b7280', marginBottom: '6px', fontStyle: 'italic' }}>Phiếu nhập kho</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
                `https://blackstone-order-scm.vercel.app/scan/grpo/${id}`
              )}&size=100x100&color=ea580c`}
              width={100}
              height={100}
              alt="QR GR"
              style={{ borderRadius: '8px', border: '2px solid #fed7aa' }}
            />
            <p style={{ fontSize: '9px', color: '#ea580c', marginTop: '4px', fontWeight: 700, fontFamily: 'monospace' }}>
              {grCode}
            </p>
          </div>
        </div>

        <h1 style={{ fontSize: '20px', fontWeight: 900, textAlign: 'center', letterSpacing: '2px', marginBottom: '8px', color: '#111' }}>
          PHIẾU NHẬP KHO (GR)
        </h1>
        <p style={{ textAlign: 'center', fontSize: '22px', fontWeight: 800, color: '#ea580c', fontFamily: 'monospace', letterSpacing: '1px', marginBottom: '20px' }}>
          {grCode}
        </p>

        {/* Meta grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '16px', background: '#fafafa', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e5e7eb' }}>
          {[
            ['Kho nhận', warehouseName, '#111'],
            ['PO liên kết', poCode, '#7c3aed'],
            ['Ngày nhận', receivedDate, '#111'],
            ['Người nhận', receivedBy, '#111'],
          ].map(([label, val, color]) => (
            <div key={label}>
              <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '1px' }}>{label}</p>
              <p style={{ fontSize: '14px', fontWeight: 700, color, fontFamily: label === 'PO liên kết' ? 'monospace' : 'inherit', marginTop: '2px' }}>{val}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: '20px', padding: '12px 16px', background: matchRate >= 100 ? '#f0fdf4' : '#fffbeb', borderRadius: '10px', border: `1px solid ${matchRate >= 100 ? '#bbf7d0' : '#fde68a'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280' }}>Tiến độ nhận hàng</span>
            <span style={{ fontSize: '12px', fontWeight: 800, color: matchRate >= 100 ? '#059669' : '#d97706' }}>
              {totalReceived}/{totalExpected} ({matchRate}%)
            </span>
          </div>
          <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(matchRate, 100)}%`, background: matchRate >= 100 ? '#10b981' : '#f59e0b', borderRadius: '999px' }} />
          </div>
        </div>

        {/* Items table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
              {['Mã SP', 'Tên sản phẩm', 'SL yêu cầu', 'SL thực nhận', 'KQ'].map((h, i) => (
                <th key={h} style={{ padding: '10px 12px', textAlign: i < 2 ? 'left' : i === 4 ? 'center' : 'right', fontWeight: 800, fontSize: '10px', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '1px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const match = item.received_qty >= item.expected_qty;
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#ea580c', fontSize: '12px' }}>{item.product_code}</td>
                  <td style={{ padding: '10px 12px', color: '#111', fontSize: '12px' }}>{item.product_name}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{item.expected_qty}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800 }}>{item.received_qty}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 800, background: match ? '#d1fae5' : '#fef3c7', color: match ? '#065f46' : '#92400e' }}>
                      {match ? '✓ Đủ' : '⚠ Thiếu'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Signature row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginTop: 'auto', paddingTop: '40px' }}>
          {['Người giao hàng', 'Thủ kho', 'Kế toán'].map((label) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#374151' }}>{label}</p>
              <div style={{ height: '60px', borderBottom: '1px solid #9ca3af', marginTop: '48px' }} />
              <p style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>(Ký, họ tên)</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#111' }}>
            CÔNG TY CỔ PHẦN DỊCH VỤ TANG LỄ BLACKSTONES
          </p>
          <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>0868 57 67 77 — www.blackstones.vn</p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════ */}
      {/* PAGE 2…N: Product Sheets (1 per qty unit)      */}
      {/* ══════════════════════════════════════════════ */}
      {productSlides.map((slide, idx) => {
        const parsed = parseProductName(slide.ten_hom);
        const isLast = idx === productSlides.length - 1;
        return (
          <div
            key={`${slide.product_code}-${slide.slideIndex}`}
            className={isLast ? 'product-sheet' : 'product-sheet gr-print-page-break'}
          >
            {/* Slide counter badge */}
            <div className="slide-badge">
              {slide.slideIndex}/{slide.totalSlides} — {slide.product_code}
            </div>

            {/* Logo */}
            <div className="flex items-center gap-10 mb-10 mt-4">
              <div className="w-56 relative h-12 shrink-0">
                <Image
                  src="/blackstones-logo.webp"
                  alt="Blackstones"
                  fill
                  className="object-contain object-left"
                  style={{ filter: 'invert(1) brightness(0.1)' }}
                />
              </div>
              <h1 className="flex-1 text-center font-extrabold text-[#111] text-3xl tracking-wide">
                PHIẾU THÔNG TIN SẢN PHẨM
              </h1>
            </div>

            {/* Main content + QR */}
            <div className="flex-1 flex flex-col gap-5 relative">
              <div className="absolute right-0 top-0 bg-white p-2 z-20">
                <div className="flex flex-col items-center">
                  <p className="text-sm text-gray-600 italic mb-2">Quét QR code xuất hàng</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
                      `${PROD_URL}/product/${encodeURIComponent(slide.product_code)}`
                    )}&size=150x150`}
                    width={150}
                    height={150}
                    alt="QR sản phẩm"
                  />
                </div>
              </div>

              {/* Product identity */}
              <div className="grid grid-cols-[180px_1fr] gap-y-4 gap-x-4 text-xl font-medium leading-relaxed pr-[200px] mt-4">
                <div className="font-bold text-gray-900 uppercase tracking-widest text-lg pt-1">Phân loại:</div>
                <div className="text-gray-900 font-bold uppercase text-2xl leading-snug">{slide.nhom_san_pham || 'AN TÁNG'}</div>

                <div className="font-bold text-gray-900 uppercase tracking-widest text-lg self-start pt-2">Mã sản phẩm:</div>
                <div className="text-gray-900 font-black uppercase text-4xl leading-tight font-times">{slide.product_code}</div>

                <div className="font-bold text-gray-900 uppercase tracking-widest text-lg self-start pt-1.5">Tên sản phẩm:</div>
                <div className="text-gray-900 font-black uppercase text-[30px] leading-[1.2] font-times max-w-full break-words pr-2">
                  {slide.ten_hom?.split('-')[0]?.trim() || slide.ten_hom}
                </div>

                <div className="font-bold text-gray-900 uppercase tracking-widest text-lg self-start pt-1.5">Tên kỹ thuật:</div>
                <div className="text-gray-900 font-black uppercase text-[30px] leading-[1.2] font-times max-w-full break-words pr-2">{slide.ten_hom}</div>
              </div>

              {/* Specs table */}
              <div className="pt-6 mt-10 border-t-[3px] border-gray-100 flex-1 flex flex-col">
                <div className="grid grid-cols-[160px_max-content_130px_1fr] gap-y-6 gap-x-6 items-center">
                  <div className="font-bold text-gray-900 uppercase tracking-widest text-[14px]">Kích thước KT</div>
                  <div className="text-gray-900 text-[16px] font-semibold whitespace-nowrap">{parsed.size}</div>
                  
                  <div className="font-bold text-gray-900 uppercase tracking-widest text-[14px]">Chất liệu</div>
                  <div className="text-gray-900 text-[16px] font-semibold">{parsed.material}</div>

                  <div className="font-bold text-gray-900 uppercase tracking-widest text-[14px]">Màu sắc</div>
                  <div className="text-gray-900 text-[16px] font-semibold">{parsed.color}</div>
                  
                  <div className="font-bold text-gray-900 uppercase tracking-widest text-[14px]">Đặc điểm</div>
                  <div className="text-gray-900 text-[16px] font-semibold">{parsed.feature}</div>

                  <div className="font-bold text-gray-900 uppercase tracking-widest text-[14px]">Nguồn gốc</div>
                  <div className="text-gray-900 text-[16px] font-semibold"> </div> 

                  <div className="font-bold text-gray-900 uppercase tracking-widest text-[14px]">Dày thành</div>
                  <div className="text-gray-900 text-[16px] font-semibold">{parsed.thickness}</div>
                </div>
                <div className="flex gap-x-6 mt-7 items-end">
                  <div className="font-bold text-gray-900 uppercase tracking-widest text-[14px] whitespace-nowrap">Các thông số khác:</div>
                  <div className="border-b-[3px] border-dotted border-gray-300 w-full mb-1 h-2"></div>
                </div>
              </div>

              {/* Bottom specs — dates & warehouse */}
              <div className="grid grid-cols-[160px_1fr_180px_1fr] gap-y-12 gap-x-6 mt-8 w-full max-w-4xl self-center items-end">
                <div className="font-bold text-[#111] uppercase tracking-widest text-[14px]">Ngày nhập kho</div>
                <div className="text-[#111] font-bold text-lg text-center border-b-[3px] border-[#111] pb-1 w-48">
                  {receivedDate}
                </div>

                <div className="font-bold text-gray-900 self-end uppercase tracking-widest text-[14px]">Ngày xuất kho</div>
                <div className="border-b-[3px] border-dotted border-gray-400 w-48 pb-1 mb-[5px]"></div>

                <div className="font-bold text-[#111] uppercase tracking-widest text-[14px] self-start mt-1">Lưu kho tại</div>
                <div className="col-span-3 flex flex-col gap-4">
                  <div className="flex items-center gap-8">
                    {(warehouses || []).map((k: { id: string; ten_kho: string }) => {
                      const grWarehouseLower = (warehouseName || '').toLowerCase();
                      const khoLower = k.ten_kho.toLowerCase();
                      const isChecked = 
                        khoLower === grWarehouseLower ||
                        khoLower.includes(grWarehouseLower) ||
                        grWarehouseLower.includes(khoLower) ||
                        k.id === gr.kho_id;
                      
                      return (
                        <div key={k.id} className="flex items-center gap-3">
                          <div className={`w-5 h-5 border-[2px] border-gray-800 rounded-sm flex items-center justify-center shrink-0 ${isChecked ? 'bg-black' : ''}`}>
                            {isChecked && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <span className={`text-[15px] ${isChecked ? 'font-black text-gray-900' : 'font-bold text-gray-700'}`}>
                            {k.ten_kho}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 pb-2 text-center flex flex-col items-center border-t-[3px] border-gray-100">
              <h3 className="font-bold text-[#111] uppercase tracking-widest text-lg mb-1">
                CÔNG TY CỔ PHẦN DỊCH VỤ TANG LỄ BLACKSTONES
              </h3>
              <p className="font-bold text-base text-gray-800">
                0868 57 67 77 - www.blackstones.vn
              </p>
            </div>
          </div>
        );
      })}
    </>
  );
}
