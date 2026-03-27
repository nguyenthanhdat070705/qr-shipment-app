import { Metadata } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import Image from 'next/image';
import Link from 'next/link';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import { ArrowLeft, Printer, Truck } from 'lucide-react';
import { notFound } from 'next/navigation';

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

  const { material, color, feature, size, thickness } = parseProductName(hom.ten_hom || '');

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center py-8 print:bg-white print:py-0">
      
      {/* ── Toolbar for print/back ───────────────────── */}
      <div className="w-[210mm] max-w-full flex items-center justify-between mb-6 px-4 print:hidden">
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

      {/* ── A4 Sheet Container ───────────────────────── */}
      <div className="w-[210mm] min-h-[297mm] bg-white shadow-xl flex flex-col relative print:shadow-none print:w-full print:h-screen print:m-0 overflow-hidden box-border">
        
        {/* Subtle decorative border or pure white depending on preference. Setting to pure white with padding. */}
        <div className="flex-1 p-[10mm] border-[8px] border-gray-100/50 print:border-8 print:border-gray-50 flex flex-col">
          
          {/* Header */}
          <div className="flex justify-start mb-6">
            <div className="w-48 relative h-10">
              <Image 
                src="/blackstones-logo.webp"
                alt="Blackstones"
                fill
                className="object-contain object-left"
                style={{ filter: 'invert(1) brightness(0.1)' }}
              />
            </div>
          </div>

          <h1 className="text-center font-extrabold text-[#111] text-2xl mb-8 tracking-wide mt-2">
            PHIẾU THÔNG TIN SẢN PHẨM
          </h1>

          {/* Grid Layout for Specifications combining Table & QR layout */}
          <div className="flex flex-col gap-6 relative">
            
            {/* QR Code Block (Absolute positioning over the right side) */}
            <div className="absolute right-0 top-[60px] bg-white p-2 z-20">
              <div className="flex flex-col items-center bg-white">
                <p className="text-[11px] text-gray-600 italic mb-2 print:text-[10px]">Quét QR code xuất hàng</p>
                <QRCodeDisplay code={hom.ma_hom} size={130} />
              </div>
            </div>

            {/* Top Section */}
            <div className="grid grid-cols-[170px_1fr] gap-y-2.5 gap-x-4 text-[15px] font-medium leading-[1.1] pr-[180px]">
              <div className="font-bold text-gray-900 uppercase tracking-widest text-[14px]">Phân loại:</div>
              <div className="text-gray-900 font-bold uppercase text-[16px] leading-[1.1]">{hom.nhom_san_pham || 'AN TÁNG'}</div>

              <div className="font-bold text-gray-900 uppercase tracking-widest text-[16px] self-start pt-1">Mã sản phẩm:</div>
              <div className="text-gray-900 font-black uppercase text-[26px] leading-[1.1]">{hom.ma_hom}</div>

              <div className="font-bold text-gray-900 uppercase tracking-widest text-[16px] self-start pt-1">Tên sản phẩm:</div>
              <div className="text-gray-900 font-black uppercase text-[26px] leading-[1.1]">{hom.ten_hom?.split('-')[0]?.trim() || hom.ten_hom}</div>

              <div className="font-bold text-gray-900 uppercase tracking-widest text-[16px] self-start pt-1">Tên kỹ thuật:</div>
              <div className="text-gray-900 font-black uppercase text-[26px] leading-[1.1]">{hom.ten_hom}</div>
            </div>

            {/* Middle Section */}
            <div className="pt-4 border-t border-gray-100 mt-2">
              <div className="grid grid-cols-[170px_1fr] gap-y-3 gap-x-4 text-[15px] font-medium pr-[180px]">
                <div className="font-bold text-gray-900 uppercase tracking-widest text-[13px]">Kích thước kỹ thuật</div>
                <div className="text-gray-800">{size}</div>

                <div className="font-bold text-gray-900 uppercase tracking-widest text-[13px]">Chất liệu</div>
                <div className="text-gray-800">{material}</div>

                <div className="font-bold text-gray-900 uppercase tracking-widest text-[13px]">Màu sắc</div>
                <div className="text-gray-800">{color}</div>

                <div className="font-bold text-gray-900 uppercase tracking-widest text-[13px]">Đặc điểm</div>
                <div className="text-gray-800">{feature}</div>

                <div className="font-bold text-gray-900 uppercase tracking-widest text-[13px]">Nguồn gốc</div>
                <div className="text-gray-800 border-b border-dotted border-gray-300 min-w-[200px] inline-block"></div>

                <div className="font-bold text-gray-900 uppercase tracking-widest text-[13px]">Dày thành</div>
                <div className="text-gray-800">{thickness || '......'}</div>

                <div className="font-bold text-gray-900 uppercase tracking-widest text-[13px] pt-2">Các thông số khác:</div>
                <div className="text-gray-800 border-b border-dotted border-gray-400 w-full pt-2"></div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-[170px_1fr] gap-y-5 gap-x-4 pt-8 text-[15px] font-medium">
              <div className="font-bold text-gray-900 uppercase tracking-widest text-[13px]">Ngày nhập kho</div>
              <div className="border-b border-dotted border-gray-400 w-64 max-w-full"></div>

              <div className="font-bold text-gray-900 uppercase tracking-widest text-[13px]">Ngày xuất kho</div>
              <div className="border-b border-dotted border-gray-400 w-64 max-w-full"></div>

              <div className="font-bold text-gray-900 uppercase tracking-widest text-[13px] pt-1">Lưu kho tại</div>
              <div className="flex flex-col gap-2 pt-1 font-bold">
                {warehouses?.map((k, i) => (
                  <label key={i} className="flex items-center gap-3 cursor-pointer">
                    <div className="w-5 h-5 border-[1.5px] border-gray-400 rounded-sm flex items-center justify-center text-transparent hover:border-gray-900 print:border-gray-600">
                      {/* Checkbox box */}
                    </div>
                    <span className="text-gray-800">{k.ten_kho}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>

          {/* Footer (Pushed to bottom) */}
          <div className="mt-auto pt-20 pb-4 text-center flex flex-col items-center">
            <h3 className="font-bold text-[#111] uppercase tracking-wide text-[15px]">
              CÔNG TY CỔ PHẦN DỊCH VỤ TANG LỄ BLACKSTONES
            </h3>
            <p className="font-bold text-[14px] text-gray-800 mt-1">
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
                size: A4;
                margin: 0;
              }
              body * {
                font-family: 'Montserrat', sans-serif !important;
              }
            }
          `,
        }}
      />
    </main>
  );
}
