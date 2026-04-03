import { Metadata } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import Image from 'next/image';
import Link from 'next/link';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import { ArrowLeft, Printer, Truck } from 'lucide-react';
import { notFound } from 'next/navigation';
import ProductSheetDynamic from './ProductSheetDynamic';

export const metadata: Metadata = {
  title: 'Phiếu thông tin sản phẩm',
  description: 'Phiếu thông tin chi tiết của sản phẩm để in mã QR.',
};

export const dynamic = 'force-dynamic';

function parseProductName(fullName: string) {
  // Example name: "Quan Tài Gỗ Sao Nghệ (Gỗ Vàng) - Trơn - KT (210x80x115)cm; Thành 5cm"
  let material = '—';
  let color = '—';
  let feature = '—';
  let size = '—';
  let thickness = '—';

  // 1. Extract material (between "Tài " and " -")
  const matMatch = fullName.match(/(?:Quan Tài\s+)?([^-]+)/i);
  if (matMatch) {
    material = matMatch[1].trim();
    // Try to extract color from parens in material if any (e.g., "(Gỗ Vàng)")
    const colorMatch = material.match(/\(([^)]+)\)/);
    if (colorMatch) {
      color = colorMatch[1].replace(/Gỗ /i, '').trim();
    }
  }

  // 2. Extract feature (e.g., "Trơn", "Chạm rồng", "Cối Nắp Tròn") usually between first "-" and second "-"
  const featureMatch = fullName.match(/-\s*([^-]+?)\s*-/);
  if (featureMatch) {
    feature = featureMatch[1].trim();
  } else {
    // maybe it's just one dash, "Gỗ Sao - Trơn"
    const parts = fullName.split('-');
    if (parts.length > 1 && !parts[1].includes('KT')) {
      feature = parts[1].split(';')[0].trim();
    }
  }

  // 3. Extract dimensions (KT...)
  const sizeMatch = fullName.match(/KT\s*(\([^)]+\)[a-zA-Z]*|[0-9a-zA-Z. x]+)/i);
  if (sizeMatch) {
    size = sizeMatch[1].trim();
  }

  // 4. Extract thickness (Thành 5cm or 6cm)
  const thickMatch = fullName.match(/Thành\s*([0-9a-zA-Z.]+)/i);
  if (thickMatch) {
    thickness = thickMatch[1].trim();
  }

  return {
    material,
    color,
    feature,
    size,
    thickness,
  };
}

export default async function ProductSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const supabase = getSupabaseAdmin();

  // Fetch product from dim_hom using ma_hom (id in URL)
  const { data: hom, error } = await supabase
    .from('dim_hom')
    .select('*')
    .eq('ma_hom', decodedId)
    .single();

  if (error || !hom) {
    notFound();
  }

  // Fetch warehouses to list as checkboxes
  const { data: warehouses } = await supabase
    .from('dim_kho')
    .select('id, ma_kho, ten_kho')
    .order('ten_kho');

  // ── Fetch Ngày nhập kho (latest goods receipt date for this product) ──
  let ngayNhapKho: string | null = null;
  try {
    // 1. Find receipt items for this product code
    const { data: receiptItems } = await supabase
      .from('fact_nhap_hang_items')
      .select('nhap_hang_id, created_at')
      .eq('ma_hom', decodedId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (receiptItems && receiptItems.length > 0) {
      // 2. Get the receipt date from fact_nhap_hang
      const { data: receipt } = await supabase
        .from('fact_nhap_hang')
        .select('ngay_nhan, created_at')
        .eq('id', receiptItems[0].nhap_hang_id)
        .single();

      if (receipt) {
        ngayNhapKho = receipt.ngay_nhan || receipt.created_at || null;
      }
    }
  } catch (e) {
    console.warn('[product-sheet] Could not fetch ngay_nhap_kho:', e);
  }

  // ── Fetch Ngày xuất kho (latest goods issue date for this product) ──
  let ngayXuatKho: string | null = null;
  try {
    const { data: exportItems } = await supabase
      .from('fact_xuat_hang_items')
      .select('xuat_hang_id, created_at')
      .eq('ma_hom', decodedId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (exportItems && exportItems.length > 0) {
      const { data: exportRecord } = await supabase
        .from('fact_xuat_hang')
        .select('created_at')
        .eq('id', exportItems[0].xuat_hang_id)
        .single();

      if (exportRecord) {
        ngayXuatKho = exportRecord.created_at || null;
      }
    }
  } catch (e) {
    console.warn('[product-sheet] Could not fetch ngay_xuat_kho:', e);
  }

  // ── Fetch active warehouse IDs (where this product currently has inventory) ──
  let activeWarehouseIds: string[] = [];
  try {
    const { data: invRows } = await supabase
      .from('fact_inventory')
      .select('Kho, "Số lượng"')
      .eq('Tên hàng hóa', hom.id);

    if (invRows) {
      activeWarehouseIds = invRows
        .filter((r: any) => Number(r['Số lượng'] || 0) > 0)
        .map((r: any) => r['Kho'])
        .filter(Boolean);
    }
  } catch (e) {
    console.warn('[product-sheet] Could not fetch active warehouses:', e);
  }

  const { material, color, feature, size, thickness } = parseProductName(hom.ten_hom || '');

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center py-6 print:bg-white print:py-0">
      
      {/* ── Toolbar for print/back ───────────────────── */}
      <div className="w-[297mm] max-w-full flex items-center justify-between mb-4 px-4 print:hidden">
        <Link
          href="/product/fullproductlist"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200"
        >
          <ArrowLeft size={16} />
          Trở lại danh sách
        </Link>
        <div className="flex gap-3">
          <Link
            href={`/product/${decodedId}`}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-emerald-600 px-5 py-2 rounded-xl shadow-md hover:bg-emerald-700 transition-colors"
          >
            <Truck size={16} />
            Xuất hàng
          </Link>
          <button
            onClick={undefined}
            id="print-btn"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-[#1B2A4A] px-5 py-2 rounded-xl shadow-md hover:bg-[#162240] transition-colors"
          >
            <Printer size={16} />
            In phiếu
          </button>
        </div>
      </div>

      {/* Print script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.getElementById('print-btn')?.addEventListener('click', function() { window.print(); });`,
        }}
      />

      {/* ── Landscape Sheet Container ───────────────────────── */}
      <div className="w-[297mm] min-h-[210mm] bg-white shadow-xl flex flex-col relative print:shadow-none print:w-full print:min-h-screen print:m-0 overflow-hidden box-border">
        
        <div className="flex-1 p-[8mm] border-[6px] border-gray-100/50 print:border-6 print:border-gray-50 flex flex-col">
          
          {/* Header row: logo + title inline */}
          <div className="flex items-center gap-6 mb-4">
            <div className="w-44 relative h-9 shrink-0">
              <Image 
                src="/blackstones-logo.webp"
                alt="Blackstones"
                fill
                className="object-contain object-left"
                style={{ filter: 'invert(1) brightness(0.1)' }}
              />
            </div>
            <h1 className="flex-1 text-center font-extrabold text-[#111] text-xl tracking-wide">
              PHIẾU THÔNG TIN SẢN PHẨM
            </h1>
            <div className="w-44 shrink-0" />{/* spacer to center the title */}
          </div>

          {/* ── Two‑column body ──────────────────────── */}
          <div className="grid grid-cols-[1fr_280px] gap-6 flex-1">
            
            {/* ═══ LEFT COLUMN ═══ */}
            <div className="flex flex-col gap-3">
              
              {/* Product identity */}
              <div className="grid grid-cols-[150px_1fr] gap-y-2 gap-x-4 text-[14px] font-medium leading-[1.15]">
                <div className="font-bold text-gray-900 uppercase tracking-widest text-[13px]">Phân loại:</div>
                <div className="text-gray-900 font-bold uppercase text-[15px] leading-[1.15]">{hom.nhom_san_pham || 'AN TÁNG'}</div>

                <div className="font-bold text-gray-900 uppercase tracking-widest text-[14px] self-start">Mã sản phẩm:</div>
                <div className="text-gray-900 font-black uppercase text-[22px] leading-[1.15] font-times">{hom.ma_hom}</div>

                <div className="font-bold text-gray-900 uppercase tracking-widest text-[14px] self-start">Tên sản phẩm:</div>
                <div className="text-gray-900 font-black uppercase text-[20px] leading-[1.15] font-times">{hom.ten_hom?.split('-')[0]?.trim() || hom.ten_hom}</div>

                <div className="font-bold text-gray-900 uppercase tracking-widest text-[14px] self-start">Tên kỹ thuật:</div>
                <div className="text-gray-900 font-black uppercase text-[16px] leading-[1.2] font-times">{hom.ten_hom}</div>
              </div>

              {/* Specs table */}
              <div className="pt-3 border-t border-gray-100">
                <div className="grid grid-cols-[150px_1fr_150px_1fr] gap-y-2 gap-x-4 text-[13px] font-medium">
                  <div className="font-bold text-gray-900 uppercase tracking-widest text-[12px]">Kích thước KT</div>
                  <div className="text-gray-800">{size}</div>
                  <div className="font-bold text-gray-900 uppercase tracking-widest text-[12px]">Chất liệu</div>
                  <div className="text-gray-800">{material}</div>

                  <div className="font-bold text-gray-900 uppercase tracking-widest text-[12px]">Màu sắc</div>
                  <div className="text-gray-800">{color}</div>
                  <div className="font-bold text-gray-900 uppercase tracking-widest text-[12px]">Đặc điểm</div>
                  <div className="text-gray-800">{feature}</div>

                  <div className="font-bold text-gray-900 uppercase tracking-widest text-[12px]">Nguồn gốc</div>
                  <div className="text-gray-800 border-b border-dotted border-gray-300 min-w-[120px] inline-block"></div>
                  <div className="font-bold text-gray-900 uppercase tracking-widest text-[12px]">Dày thành</div>
                  <div className="text-gray-800">{thickness || '......'}</div>
                </div>
                <div className="grid grid-cols-[150px_1fr] gap-x-4 mt-2 text-[13px] font-medium">
                  <div className="font-bold text-gray-900 uppercase tracking-widest text-[12px]">Các thông số khác:</div>
                  <div className="text-gray-800 border-b border-dotted border-gray-400 w-full"></div>
                </div>
              </div>

              {/* Dates row — inline instead of stacked */}
              <ProductSheetDynamic
                warehouses={warehouses || []}
                ngayNhapKho={ngayNhapKho}
                ngayXuatKho={ngayXuatKho}
                activeWarehouseIds={activeWarehouseIds}
              />
            </div>

            {/* ═══ RIGHT COLUMN — QR + Warehouse ═══ */}
            <div className="flex flex-col items-center gap-4 pt-2 border-l border-gray-100 pl-6">
              <div className="flex flex-col items-center">
                <p className="text-[11px] text-gray-600 italic mb-2 print:text-[10px]">Quét QR code xuất hàng</p>
                <QRCodeDisplay code={hom.ma_hom} size={150} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto pt-4 pb-2 text-center flex flex-col items-center border-t border-gray-100">
            <h3 className="font-bold text-[#111] uppercase tracking-wide text-[13px]">
              CÔNG TY CỔ PHẦN DỊCH VỤ TANG LỄ BLACKSTONES
            </h3>
            <p className="font-bold text-[12px] text-gray-800 mt-0.5">
              0868 57 67 77 - www.blackstones.vn
            </p>
          </div>

        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');
            @media print {
              body, html {
                background: white !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              @page {
                size: A4 landscape;
                margin: 0;
              }
              body *:not(.font-times) {
                font-family: 'Montserrat', sans-serif !important;
              }
            }
            .font-times {
              font-family: 'Times New Roman', Times, serif !important;
            }
          `,
        }}
      />
    </main>
  );
}
