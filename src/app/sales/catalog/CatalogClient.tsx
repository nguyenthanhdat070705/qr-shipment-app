'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  BookOpen, Search, SlidersHorizontal, X, Grid3x3, Rows3,
  ArrowUpDown, Sparkles, Package, Tag, Layers, Palette,
  Compass, Heart, Ruler, Eye, ChevronDown, Printer
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';

/* ─────────────────────────────────────
   Types
───────────────────────────────────── */
export interface CatalogItem {
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
  kichThuoc: string;
  giaBan: number;
  giaBan1: number;
  giaVon: number;
  hinhAnh: string;
  tonKho: number;
}

/* ─────────────────────────────────────
   Helpers
───────────────────────────────────── */
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

function tierLabel(goiDichVu: string): { label: string; cls: string } {
  const v = (goiDichVu || '').toLowerCase();
  if (v.includes('cao cấp') || v.includes('premium')) {
    return { label: 'Cao cấp', cls: 'bg-amber-100 text-amber-800 border-amber-200' };
  }
  if (v.includes('trung') || v.includes('standard')) {
    return { label: 'Trung cấp', cls: 'bg-sky-100 text-sky-800 border-sky-200' };
  }
  if (v.includes('phổ thông') || v.includes('cơ bản') || v.includes('basic')) {
    return { label: 'Phổ thông', cls: 'bg-stone-100 text-stone-700 border-stone-200' };
  }
  return { label: goiDichVu || 'Tiêu chuẩn', cls: 'bg-stone-100 text-stone-700 border-stone-200' };
}

/* ─────────────────────────────────────
   Filter Chip
───────────────────────────────────── */
function FilterChip({
  label, active, onClick, count,
}: { label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
        active
          ? 'bg-stone-900 text-white border-stone-900 shadow-md'
          : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400 hover:bg-stone-50'
      }`}
    >
      {label}
      {typeof count === 'number' && (
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
          active ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
        }`}>{count}</span>
      )}
    </button>
  );
}

/* ─────────────────────────────────────
   Catalog Card
───────────────────────────────────── */
function CatalogCard({ item, viewMode }: { item: CatalogItem; viewMode: 'grid' | 'list' }) {
  const tier = tierLabel(item.goiDichVu);
  const image = getCoffinImage(item.maHom, item.hinhAnh);
  const displayName = item.tenMkt || item.tenTheHien || item.tenHom;
  const subName = item.tenKyThuat || item.tenChuanHoa || '';
  const isOut = item.tonKho <= 0;

  if (viewMode === 'list') {
    return (
      <Link
        href={`/sales/catalog/${encodeURIComponent(item.maHom)}`}
        className="group flex gap-4 sm:gap-6 bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 hover:shadow-xl hover:border-stone-400 transition-all duration-300"
      >
        {/* Image */}
        <div className="relative w-28 h-28 sm:w-36 sm:h-36 flex-shrink-0 bg-gradient-to-br from-stone-100 to-stone-200 rounded-xl overflow-hidden">
          <Image src={image} alt={displayName} fill className="object-contain p-2 group-hover:scale-110 transition-transform duration-500" />
          {isOut && (
            <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500 text-white">HẾT</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-stone-400 font-bold mb-0.5">{item.maHom}</p>
              <h3 className="text-base sm:text-lg font-extrabold text-stone-900 leading-tight line-clamp-2">{displayName}</h3>
              {subName && <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5 line-clamp-1">{subName}</p>}
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${tier.cls}`}>{tier.label}</span>
          </div>

          {/* Specs row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] sm:text-xs text-stone-600">
            {item.loaiGo && <span className="inline-flex items-center gap-1"><Layers size={11} /> {item.loaiGo}</span>}
            {item.mauSac && <span className="inline-flex items-center gap-1"><Palette size={11} /> {item.mauSac}</span>}
            {item.tonGiao && <span className="inline-flex items-center gap-1"><Heart size={11} /> {item.tonGiao}</span>}
            {item.kichThuoc && <span className="inline-flex items-center gap-1"><Ruler size={11} /> {item.kichThuoc}</span>}
          </div>

          {/* Footer */}
          <div className="flex items-end justify-between gap-3 mt-auto pt-3 border-t border-stone-100">
            <div>
              <p className="text-[10px] text-stone-400 font-semibold uppercase">Giá tham khảo</p>
              <p className="text-base sm:text-lg font-extrabold text-amber-700">{formatPrice(item.giaBan || item.giaBan1)}</p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-stone-600 group-hover:text-stone-900 transition-colors">
              Xem chi tiết <Eye size={14} />
            </span>
          </div>
        </div>
      </Link>
    );
  }

  // Grid mode
  return (
    <Link
      href={`/sales/catalog/${encodeURIComponent(item.maHom)}`}
      className="group bg-white border border-stone-200 rounded-2xl overflow-hidden hover:shadow-2xl hover:border-stone-400 hover:-translate-y-1 transition-all duration-300 flex flex-col"
    >
      {/* Image */}
      <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-stone-100 via-stone-50 to-amber-50/30 overflow-hidden">
        <Image src={image} alt={displayName} fill className="object-contain p-4 group-hover:scale-110 transition-transform duration-500" />
        {/* Decorative corner */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-amber-200/20 to-transparent rounded-bl-full pointer-events-none" />
        {/* Badge - tier */}
        <span className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${tier.cls}`}>{tier.label}</span>
        {/* Badge - stock */}
        {isOut ? (
          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white border border-red-600">Hết hàng</span>
        ) : item.tonKho > 0 && (
          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Còn {item.tonKho}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <p className="text-[10px] font-mono uppercase tracking-widest text-stone-400 font-bold mb-1">{item.maHom}</p>
        <h3 className="text-sm font-extrabold text-stone-900 leading-tight line-clamp-2 mb-1 min-h-[2.5rem]">
          {displayName}
        </h3>
        {subName && <p className="text-[11px] text-stone-500 line-clamp-1 mb-2">{subName}</p>}

        {/* Specs grid */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1 text-[11px] text-stone-600 mb-3">
          {item.loaiGo && (
            <div className="inline-flex items-center gap-1 truncate"><Layers size={10} className="text-stone-400 flex-shrink-0" /><span className="truncate">{item.loaiGo}</span></div>
          )}
          {item.mauSac && (
            <div className="inline-flex items-center gap-1 truncate"><Palette size={10} className="text-stone-400 flex-shrink-0" /><span className="truncate">{item.mauSac}</span></div>
          )}
          {item.tonGiao && (
            <div className="inline-flex items-center gap-1 truncate"><Heart size={10} className="text-stone-400 flex-shrink-0" /><span className="truncate">{item.tonGiao}</span></div>
          )}
          {item.thanh && (
            <div className="inline-flex items-center gap-1 truncate"><Ruler size={10} className="text-stone-400 flex-shrink-0" /><span className="truncate">Thành {item.thanh}</span></div>
          )}
        </div>

        {/* Price */}
        <div className="mt-auto pt-3 border-t border-stone-100">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[9px] text-stone-400 font-semibold uppercase tracking-wider">Giá tham khảo</p>
              <p className="text-base font-extrabold text-amber-700 leading-tight">{formatPrice(item.giaBan || item.giaBan1)}</p>
            </div>
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-100 text-stone-500 group-hover:bg-stone-900 group-hover:text-white transition-all">
              →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────
   Main Client
───────────────────────────────────── */
export default function CatalogClient({ items }: { items: CatalogItem[] }) {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'code' | 'name' | 'price-asc' | 'price-desc' | 'stock'>('code');

  // Filters
  const [fLoaiGo, setFLoaiGo] = useState<string[]>([]);
  const [fMauSac, setFMauSac] = useState<string[]>([]);
  const [fTonGiao, setFTonGiao] = useState<string[]>([]);
  const [fGoiDichVu, setFGoiDichVu] = useState<string[]>([]);
  const [fNguonGoc, setFNguonGoc] = useState<string[]>([]);
  const [fOnlyInStock, setFOnlyInStock] = useState(false);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  // Build unique filter options with counts
  const uniqueValues = useMemo(() => {
    const collect = (key: keyof CatalogItem) => {
      const map = new Map<string, number>();
      items.forEach(i => {
        const v = String(i[key] || '').trim();
        if (v) map.set(v, (map.get(v) || 0) + 1);
      });
      return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    };
    return {
      loaiGo: collect('loaiGo'),
      mauSac: collect('mauSac'),
      tonGiao: collect('tonGiao'),
      goiDichVu: collect('goiDichVu'),
      nguonGoc: collect('nguonGoc'),
    };
  }, [items]);

  // Toggle filter chip
  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    setter(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };

  // Filtered + sorted
  const filtered = useMemo(() => {
    let result = items.filter(i => {
      const q = search.toLowerCase().trim();
      if (q) {
        const hay = `${i.maHom} ${i.tenMkt} ${i.tenTheHien} ${i.tenKyThuat} ${i.tenHom} ${i.loaiGo} ${i.mauSac}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (fLoaiGo.length && !fLoaiGo.includes(i.loaiGo)) return false;
      if (fMauSac.length && !fMauSac.includes(i.mauSac)) return false;
      if (fTonGiao.length && !fTonGiao.includes(i.tonGiao)) return false;
      if (fGoiDichVu.length && !fGoiDichVu.includes(i.goiDichVu)) return false;
      if (fNguonGoc.length && !fNguonGoc.includes(i.nguonGoc)) return false;
      if (fOnlyInStock && i.tonKho <= 0) return false;
      const price = i.giaBan || i.giaBan1;
      if (priceMin && price < Number(priceMin)) return false;
      if (priceMax && price > Number(priceMax)) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.tenMkt || a.tenTheHien || a.tenHom).localeCompare(b.tenMkt || b.tenTheHien || b.tenHom);
        case 'price-asc':
          return (a.giaBan || a.giaBan1) - (b.giaBan || b.giaBan1);
        case 'price-desc':
          return (b.giaBan || b.giaBan1) - (a.giaBan || a.giaBan1);
        case 'stock':
          return b.tonKho - a.tonKho;
        default:
          return a.maHom.localeCompare(b.maHom);
      }
    });
    return result;
  }, [items, search, fLoaiGo, fMauSac, fTonGiao, fGoiDichVu, fNguonGoc, fOnlyInStock, priceMin, priceMax, sortBy]);

  const activeFiltersCount =
    fLoaiGo.length + fMauSac.length + fTonGiao.length + fGoiDichVu.length + fNguonGoc.length +
    (fOnlyInStock ? 1 : 0) + (priceMin ? 1 : 0) + (priceMax ? 1 : 0);

  const clearAll = () => {
    setFLoaiGo([]); setFMauSac([]); setFTonGiao([]); setFGoiDichVu([]); setFNguonGoc([]);
    setFOnlyInStock(false); setPriceMin(''); setPriceMax('');
  };

  return (
    <PageLayout title="Catalog Hòm Sản phẩm" icon={<BookOpen size={15} className="text-stone-700" />}>
      {/* ── Hero Header ── */}
      <div className="relative mb-6 sm:mb-8 overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-stone-900 via-stone-800 to-amber-900 text-white p-6 sm:p-10">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-stone-400 rounded-full translate-y-32 -translate-x-32 blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-amber-300" />
            <span className="text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase text-amber-200">Bộ sưu tập Blackstones</span>
          </div>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-2 sm:mb-3 leading-tight">
            Catalog Hòm Sản phẩm
          </h1>
          <p className="text-sm sm:text-base text-stone-200 max-w-2xl leading-relaxed">
            Bộ sưu tập hòm chuẩn nhà tang lễ Blackstones — phân loại theo chất gỗ, màu sắc, tôn giáo và phân khúc giá. Phục vụ tư vấn trực tiếp khách hàng tại lễ tang.
          </p>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-2 sm:gap-4 mt-4 sm:mt-6">
            <div className="bg-white/10 backdrop-blur rounded-xl border border-white/15 px-4 py-2">
              <p className="text-[10px] text-amber-200 font-bold uppercase tracking-wider">Tổng SP</p>
              <p className="text-xl sm:text-2xl font-extrabold">{items.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl border border-white/15 px-4 py-2">
              <p className="text-[10px] text-amber-200 font-bold uppercase tracking-wider">Còn hàng</p>
              <p className="text-xl sm:text-2xl font-extrabold">{items.filter(i => i.tonKho > 0).length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl border border-white/15 px-4 py-2">
              <p className="text-[10px] text-amber-200 font-bold uppercase tracking-wider">Loại gỗ</p>
              <p className="text-xl sm:text-2xl font-extrabold">{uniqueValues.loaiGo.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl border border-white/15 px-4 py-2">
              <p className="text-[10px] text-amber-200 font-bold uppercase tracking-wider">Đang lọc</p>
              <p className="text-xl sm:text-2xl font-extrabold">{filtered.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search & Top Controls ── */}
      <div className="bg-white border border-stone-200 rounded-2xl p-3 sm:p-4 mb-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Tìm theo mã, tên sản phẩm, loại gỗ, màu sắc..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-stone-100 text-stone-400"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2">
            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="appearance-none pl-9 pr-9 py-2.5 border border-stone-200 rounded-xl text-xs sm:text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/20 cursor-pointer"
              >
                <option value="code">Mã sản phẩm A→Z</option>
                <option value="name">Tên A→Z</option>
                <option value="price-asc">Giá thấp → cao</option>
                <option value="price-desc">Giá cao → thấp</option>
                <option value="stock">Còn nhiều nhất</option>
              </select>
              <ArrowUpDown size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            </div>

            {/* Filter button */}
            <button
              onClick={() => setShowFilters(s => !s)}
              className={`relative inline-flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                showFilters || activeFiltersCount
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
              }`}
            >
              <SlidersHorizontal size={14} />
              <span className="hidden sm:inline">Bộ lọc</span>
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-amber-400 text-stone-900 text-[10px] font-bold flex items-center justify-center px-1">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* View toggle */}
            <div className="flex items-center bg-stone-100 rounded-xl p-0.5 border border-stone-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-700'}`}
                title="Xem dạng lưới"
              >
                <Grid3x3 size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-700'}`}
                title="Xem dạng danh sách"
              >
                <Rows3 size={16} />
              </button>
            </div>

            {/* Print */}
            <button
              onClick={() => window.print()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold border bg-white text-stone-700 border-stone-200 hover:border-stone-400 transition-all"
              title="In catalog"
            >
              <Printer size={14} />
            </button>
          </div>
        </div>

        {/* ── Filter Panel ── */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-stone-200 space-y-4">
            {/* Quick toggles */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider mr-1">Nhanh:</span>
              <button
                onClick={() => setFOnlyInStock(v => !v)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  fOnlyInStock
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-emerald-400'
                }`}
              >
                {fOnlyInStock && '✓ '}Chỉ còn hàng
              </button>
              {/* Price range */}
              <div className="inline-flex items-center gap-2 text-xs">
                <input
                  type="number"
                  placeholder="Giá từ"
                  value={priceMin}
                  onChange={e => setPriceMin(e.target.value)}
                  className="w-28 px-2.5 py-1.5 border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
                <span className="text-stone-400">→</span>
                <input
                  type="number"
                  placeholder="Giá đến"
                  value={priceMax}
                  onChange={e => setPriceMax(e.target.value)}
                  className="w-28 px-2.5 py-1.5 border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </div>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearAll}
                  className="ml-auto text-xs font-bold text-red-600 hover:text-red-800 underline underline-offset-2"
                >
                  Xóa tất cả ({activeFiltersCount})
                </button>
              )}
            </div>

            {/* Filter groups */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {uniqueValues.loaiGo.length > 0 && (
                <FilterGroup
                  title="Loại gỗ"
                  icon={<Layers size={12} />}
                  values={uniqueValues.loaiGo}
                  selected={fLoaiGo}
                  onToggle={v => toggle(setFLoaiGo, v)}
                />
              )}
              {uniqueValues.mauSac.length > 0 && (
                <FilterGroup
                  title="Màu sắc"
                  icon={<Palette size={12} />}
                  values={uniqueValues.mauSac}
                  selected={fMauSac}
                  onToggle={v => toggle(setFMauSac, v)}
                />
              )}
              {uniqueValues.tonGiao.length > 0 && (
                <FilterGroup
                  title="Tôn giáo"
                  icon={<Heart size={12} />}
                  values={uniqueValues.tonGiao}
                  selected={fTonGiao}
                  onToggle={v => toggle(setFTonGiao, v)}
                />
              )}
              {uniqueValues.goiDichVu.length > 0 && (
                <FilterGroup
                  title="Phân khúc"
                  icon={<Tag size={12} />}
                  values={uniqueValues.goiDichVu}
                  selected={fGoiDichVu}
                  onToggle={v => toggle(setFGoiDichVu, v)}
                />
              )}
              {uniqueValues.nguonGoc.length > 0 && (
                <FilterGroup
                  title="Nguồn gốc"
                  icon={<Compass size={12} />}
                  values={uniqueValues.nguonGoc}
                  selected={fNguonGoc}
                  onToggle={v => toggle(setFNguonGoc, v)}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Active filter pills (when collapsed) ── */}
      {!showFilters && activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {fLoaiGo.map(v => <ActivePill key={`g-${v}`} label={v} icon={<Layers size={11} />} onRemove={() => toggle(setFLoaiGo, v)} />)}
          {fMauSac.map(v => <ActivePill key={`c-${v}`} label={v} icon={<Palette size={11} />} onRemove={() => toggle(setFMauSac, v)} />)}
          {fTonGiao.map(v => <ActivePill key={`r-${v}`} label={v} icon={<Heart size={11} />} onRemove={() => toggle(setFTonGiao, v)} />)}
          {fGoiDichVu.map(v => <ActivePill key={`t-${v}`} label={v} icon={<Tag size={11} />} onRemove={() => toggle(setFGoiDichVu, v)} />)}
          {fNguonGoc.map(v => <ActivePill key={`o-${v}`} label={v} icon={<Compass size={11} />} onRemove={() => toggle(setFNguonGoc, v)} />)}
          {fOnlyInStock && <ActivePill label="Còn hàng" icon={<Package size={11} />} onRemove={() => setFOnlyInStock(false)} />}
          {priceMin && <ActivePill label={`≥ ${Number(priceMin).toLocaleString('vi-VN')}đ`} onRemove={() => setPriceMin('')} />}
          {priceMax && <ActivePill label={`≤ ${Number(priceMax).toLocaleString('vi-VN')}đ`} onRemove={() => setPriceMax('')} />}
          <button onClick={clearAll} className="text-xs font-bold text-red-600 hover:text-red-800 underline underline-offset-2 ml-1">Xóa hết</button>
        </div>
      )}

      {/* ── Results counter ── */}
      <div className="flex items-center justify-between mb-4 px-1">
        <p className="text-xs sm:text-sm text-stone-500">
          Hiển thị <span className="font-bold text-stone-900">{filtered.length}</span> / {items.length} sản phẩm
        </p>
      </div>

      {/* ── Grid / List ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
          <Package size={48} className="mx-auto text-stone-300 mb-3" />
          <p className="text-stone-500 font-semibold mb-1">Không tìm thấy sản phẩm phù hợp</p>
          <p className="text-xs text-stone-400">Thử thay đổi từ khóa hoặc xóa bớt bộ lọc</p>
          {activeFiltersCount > 0 && (
            <button onClick={clearAll} className="mt-4 px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-bold hover:bg-stone-700 transition-colors">
              Xóa bộ lọc
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5 pb-8">
          {filtered.map(item => <CatalogCard key={item.id} item={item} viewMode="grid" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-3 pb-8">
          {filtered.map(item => <CatalogCard key={item.id} item={item} viewMode="list" />)}
        </div>
      )}
    </PageLayout>
  );
}

/* ─────────────────────────────────────
   Filter Group Component
───────────────────────────────────── */
function FilterGroup({
  title, icon, values, selected, onToggle,
}: {
  title: string;
  icon: React.ReactNode;
  values: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? values : values.slice(0, 6);

  return (
    <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-stone-500">{icon}</span>
        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-stone-600">{title}</h4>
        <span className="text-[10px] text-stone-400">({values.length})</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map(([val, count]) => (
          <FilterChip
            key={val}
            label={val}
            active={selected.includes(val)}
            onClick={() => onToggle(val)}
            count={count}
          />
        ))}
        {values.length > 6 && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="px-3 py-1.5 rounded-full text-xs font-bold text-stone-500 hover:text-stone-900 underline underline-offset-2"
          >
            {expanded ? 'Thu gọn' : `+${values.length - 6} thêm`}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   Active Filter Pill
───────────────────────────────────── */
function ActivePill({ label, icon, onRemove }: { label: string; icon?: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-900 text-white text-xs font-semibold border border-stone-900">
      {icon}
      {label}
      <button onClick={onRemove} className="ml-0.5 hover:bg-white/15 rounded-full p-0.5">
        <X size={11} />
      </button>
    </span>
  );
}
