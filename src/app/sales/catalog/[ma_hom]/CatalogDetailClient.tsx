'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, Share2, Printer, ShoppingCart, FileText, Phone,
  Layers, Palette, Heart, Ruler, Compass, Tag, Package, Sparkles,
  Check, MapPin, Box
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import QRCodeDisplay from '@/components/QRCodeDisplay';

interface DetailItem {
  id: string;
  maHom: string;
  tenMkt: string;
  tenTheHien: string;
  tenKyThuat: string;
  tenChuanHoa: string;
  tenHom: string;
  nhomSanPham: string;
  loaiSanPham: string;
  loaiGo: string;
  mauSac: string;
  tonGiao: string;
  goiDichVu: string;
  dacDiem: string;
  nap: string;
  nguonGoc: string;
  thanh: string;
  liet: string;
  beMat: string;
  mucDich: string;
  donVi: string;
  kichThuoc: string;
  thongSoKhac: string;
  giaBan: number;
  giaBan1: number;
  giaVon: number;
  hinhAnh: string;
  totalStock: number;
  stockByWarehouse: { khoName: string; quantity: number }[];
}

interface RelatedItem {
  id: string;
  maHom: string;
  ten: string;
  loaiGo: string;
  mauSac: string;
  giaBan: number;
  hinhAnh: string;
}

function getCoffinImage(productCode: string, hinhAnh: string): string {
  if (hinhAnh && (hinhAnh.startsWith('http') || hinhAnh.startsWith('/'))) return hinhAnh;
  if (productCode === '2AQ0106' || productCode === '2AQ0129') return '/coffin-3.png';
  let hash = 0;
  for (let i = 0; i < productCode.length; i++) {
    hash = ((hash << 5) - hash + productCode.charCodeAt(i)) | 0;
  }
  const index = (Math.abs(hash) % 5) + 1;
  return `/coffin-${index}.png`;
}

function formatPrice(n: number): string {
  if (!n) return 'Liên hệ';
  return n.toLocaleString('vi-VN') + 'đ';
}

function SpecRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-stone-100 last:border-0">
      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-stone-100 text-stone-600 flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-stone-400 mb-0.5">{label}</p>
        <p className="text-sm sm:text-base font-bold text-stone-900 break-words">{value}</p>
      </div>
    </div>
  );
}

export default function CatalogDetailClient({ item, related }: { item: DetailItem; related: RelatedItem[] }) {
  const [copied, setCopied] = useState(false);
  const image = getCoffinImage(item.maHom, item.hinhAnh);
  const displayName = item.tenMkt || item.tenTheHien || item.tenHom;
  const subName = item.tenKyThuat || item.tenChuanHoa || '';

  const handleCopy = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: displayName,
          text: `${displayName} - Mã ${item.maHom} - Catalog Blackstones`,
          url: window.location.href,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <PageLayout title="Chi tiết hòm" icon={<Box size={15} className="text-stone-700" />}>
      {/* Back nav */}
      <div className="mb-4">
        <Link
          href="/sales/catalog"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-500 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft size={16} />
          Quay lại Catalog
        </Link>
      </div>

      {/* ── Hero Section ── */}
      <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-lg">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
          {/* ── Image side (3/5) ── */}
          <div className="lg:col-span-3 relative bg-gradient-to-br from-stone-100 via-stone-50 to-amber-50/30 min-h-[400px] lg:min-h-[600px] flex items-center justify-center p-6 sm:p-10 overflow-hidden">
            {/* Decorative shapes */}
            <div className="absolute top-0 left-0 w-40 h-40 bg-amber-200/20 rounded-full -translate-x-20 -translate-y-20 blur-2xl" />
            <div className="absolute bottom-0 right-0 w-60 h-60 bg-stone-300/30 rounded-full translate-x-20 translate-y-20 blur-3xl" />

            <div className="relative w-full max-w-md aspect-[4/3]">
              <Image src={image} alt={displayName} fill className="object-contain" priority />
            </div>

            {/* Product code overlay */}
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur border border-stone-200 px-3 py-1.5 rounded-full">
              <p className="text-xs font-mono uppercase tracking-widest font-bold text-stone-700">{item.maHom}</p>
            </div>

            {/* QR Code overlay */}
            <div className="absolute bottom-4 right-4 bg-white p-2 rounded-xl border border-stone-200 shadow-sm">
              <QRCodeDisplay code={item.maHom} size={80} />
              <p className="text-[9px] text-center text-stone-400 mt-1 font-semibold">Quét xem</p>
            </div>
          </div>

          {/* ── Info side (2/5) ── */}
          <div className="lg:col-span-2 p-6 sm:p-8 lg:p-10 flex flex-col">
            {/* Category tags */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {item.nhomSanPham && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-stone-900 text-white text-[10px] font-bold uppercase tracking-wider">
                  {item.nhomSanPham}
                </span>
              )}
              {item.goiDichVu && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider border border-amber-200">
                  <Sparkles size={10} /> {item.goiDichVu}
                </span>
              )}
              {item.tonGiao && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-stone-100 text-stone-700 text-[10px] font-bold uppercase tracking-wider border border-stone-200">
                  {item.tonGiao}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-stone-900 leading-tight mb-2">
              {displayName}
            </h1>
            {subName && (
              <p className="text-sm sm:text-base text-stone-500 mb-4 leading-relaxed">{subName}</p>
            )}

            {/* Stock status */}
            <div className="flex items-center gap-2 mb-5">
              {item.totalStock > 0 ? (
                <>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Còn hàng • {item.totalStock} {item.donVi}
                  </span>
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Tạm hết
                </span>
              )}
            </div>

            {/* Price box */}
            <div className="bg-gradient-to-br from-stone-900 to-stone-700 rounded-2xl p-5 sm:p-6 text-white mb-5">
              <p className="text-[10px] sm:text-xs uppercase tracking-widest font-bold text-amber-300 mb-1">Giá bán tham khảo</p>
              <p className="text-3xl sm:text-4xl font-extrabold mb-1 tracking-tight">
                {formatPrice(item.giaBan || item.giaBan1)}
              </p>
              {item.donVi && (
                <p className="text-xs text-stone-300">/ {item.donVi}</p>
              )}
              {item.giaBan1 > 0 && item.giaBan > 0 && item.giaBan1 !== item.giaBan && (
                <p className="text-xs text-stone-300 mt-2 line-through opacity-70">{formatPrice(item.giaBan1)}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 mb-5">
              <Link
                href={`/sales/orders?ma_hom=${encodeURIComponent(item.maHom)}`}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 shadow-md hover:shadow-lg transition-all"
              >
                <ShoppingCart size={16} />
                Thêm vào đơn hàng
              </Link>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleShare}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-50 transition-colors"
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
                  {copied ? 'Đã copy' : 'Chia sẻ'}
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-50 transition-colors"
                >
                  <Printer size={14} />
                  In
                </button>
                <Link
                  href={`/product-sheet/${encodeURIComponent(item.maHom)}`}
                  target="_blank"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-50 transition-colors"
                >
                  <FileText size={14} />
                  Phiếu
                </Link>
              </div>
            </div>

            {/* Tip */}
            <div className="mt-auto bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 leading-relaxed">
              <p className="font-bold mb-1">💡 Gợi ý tư vấn</p>
              <p>Sản phẩm phù hợp với khách hàng {item.tonGiao ? `theo ${item.tonGiao.toLowerCase()}` : 'các tôn giáo'} {item.goiDichVu && `, phân khúc ${item.goiDichVu.toLowerCase()}`}.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Specs Grid + Inventory + Description ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mt-6">
        {/* Specs */}
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg sm:text-xl font-extrabold text-stone-900 mb-1 flex items-center gap-2">
            <Tag size={18} className="text-amber-600" />
            Thông số sản phẩm
          </h2>
          <p className="text-xs text-stone-500 mb-4">Đầy đủ chi tiết kỹ thuật và đặc điểm sản phẩm</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0">
            <SpecRow icon={<Layers size={14} />} label="Loại gỗ" value={item.loaiGo} />
            <SpecRow icon={<Palette size={14} />} label="Màu sắc" value={item.mauSac} />
            <SpecRow icon={<Ruler size={14} />} label="Kích thước" value={item.kichThuoc} />
            <SpecRow icon={<Box size={14} />} label="Độ dày thành" value={item.thanh} />
            <SpecRow icon={<Heart size={14} />} label="Tôn giáo" value={item.tonGiao} />
            <SpecRow icon={<Compass size={14} />} label="Nguồn gốc" value={item.nguonGoc} />
            <SpecRow icon={<Sparkles size={14} />} label="Đặc điểm" value={item.dacDiem} />
            <SpecRow icon={<Tag size={14} />} label="Bề mặt" value={item.beMat} />
            <SpecRow icon={<FileText size={14} />} label="Nắp" value={item.nap} />
            <SpecRow icon={<FileText size={14} />} label="Liệt" value={item.liet} />
            <SpecRow icon={<Tag size={14} />} label="Mục đích" value={item.mucDich} />
            <SpecRow icon={<Tag size={14} />} label="Loại sản phẩm" value={item.loaiSanPham} />
          </div>

          {item.thongSoKhac && (
            <div className="mt-4 pt-4 border-t border-stone-100">
              <p className="text-[11px] uppercase tracking-wider font-bold text-stone-400 mb-1">Thông số khác</p>
              <p className="text-sm text-stone-700 leading-relaxed">{item.thongSoKhac}</p>
            </div>
          )}
        </div>

        {/* Inventory */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg sm:text-xl font-extrabold text-stone-900 mb-1 flex items-center gap-2">
            <Package size={18} className="text-emerald-600" />
            Tồn kho
          </h2>
          <p className="text-xs text-stone-500 mb-4">Phân bố theo kho hàng</p>

          {item.stockByWarehouse.length === 0 ? (
            <div className="text-center py-8 bg-stone-50 rounded-xl">
              <Package size={32} className="mx-auto text-stone-300 mb-2" />
              <p className="text-sm font-semibold text-stone-500">Hiện không có hàng tại kho</p>
              <p className="text-xs text-stone-400 mt-1">Liên hệ bộ phận thu mua để đặt hàng</p>
            </div>
          ) : (
            <div className="space-y-2">
              {item.stockByWarehouse.map((w, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin size={14} className="text-emerald-600 flex-shrink-0" />
                    <span className="text-sm font-semibold text-stone-800 truncate">{w.khoName}</span>
                  </div>
                  <span className="text-lg font-extrabold text-emerald-700 flex-shrink-0">{w.quantity}</span>
                </div>
              ))}
              <div className="flex items-center justify-between p-3 bg-stone-900 text-white rounded-xl mt-3">
                <span className="text-xs font-bold uppercase tracking-wider">Tổng cộng</span>
                <span className="text-xl font-extrabold">{item.totalStock} {item.donVi}</span>
              </div>
            </div>
          )}

          {/* Contact CTA */}
          <div className="mt-5 pt-5 border-t border-stone-100">
            <p className="text-xs font-bold text-stone-700 mb-2">Cần tư vấn thêm?</p>
            <a
              href="tel:0868576777"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-sm font-bold transition-colors"
            >
              <Phone size={14} />
              0868 57 67 77
            </a>
          </div>
        </div>
      </div>

      {/* ── Related Products ── */}
      {related.length > 0 && (
        <div className="mt-6 sm:mt-8">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-stone-900">Sản phẩm tương tự</h2>
              <p className="text-xs text-stone-500 mt-0.5">Các mẫu hòm cùng loại gỗ hoặc cùng phân khúc</p>
            </div>
            <Link href="/sales/catalog" className="text-xs sm:text-sm font-bold text-stone-700 hover:text-stone-900 underline underline-offset-2">
              Xem tất cả →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {related.map(r => {
              const rImg = getCoffinImage(r.maHom, r.hinhAnh);
              return (
                <Link
                  key={r.id}
                  href={`/sales/catalog/${encodeURIComponent(r.maHom)}`}
                  className="group bg-white border border-stone-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-stone-400 transition-all"
                >
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-stone-100 to-stone-50">
                    <Image src={rImg} alt={r.ten} fill className="object-contain p-3 group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-stone-400 font-bold mb-0.5">{r.maHom}</p>
                    <h4 className="text-xs sm:text-sm font-bold text-stone-900 leading-tight line-clamp-2 min-h-[2.5rem] mb-1.5">{r.ten}</h4>
                    <p className="text-sm font-extrabold text-amber-700">{formatPrice(r.giaBan)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="h-8" />
    </PageLayout>
  );
}
