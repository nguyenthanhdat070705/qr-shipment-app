'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Printer, Search, Filter } from 'lucide-react';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import DownloadAllQR from '@/components/DownloadAllQR';

interface ProductItem {
  productCode: string;
  productName: string;
  warehouse: string;
  quantity: number;
  category: string;
}

export default function ProductListClient({ products }: { products: ProductItem[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');

  // Tự động tạo danh sách kho có sẵn
  const warehouses = useMemo(() => {
    const list = Array.from(new Set(products.map(p => p.warehouse).filter(w => w && w !== '—')));
    return list.sort();
  }, [products]);

  // Lọc sản phẩm
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.productCode.toLowerCase().includes(searchTerm.toLowerCase());

      const matchWarehouse = selectedWarehouse ? p.warehouse === selectedWarehouse : true;

      return matchSearch && matchWarehouse;
    });
  }, [products, searchTerm, selectedWarehouse]);

  const downloadProducts = filteredProducts.map((p) => ({
    productCode: p.productCode,
    productName: p.productName,
  }));

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md mb-8 print:static print:border-0 print:mb-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors print:hidden"
            >
              <ArrowLeft size={16} />
              Về trang chủ
            </Link>
            <div className="hidden sm:block w-px h-5 bg-gray-200 print:hidden" />
            <Image
              src="/blackstones-logo.webp"
              alt="Blackstones"
              width={120}
              height={26}
              className="hidden sm:block print:block"
              style={{ height: 'auto', filter: 'invert(1) brightness(0.2)' }}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-800">
              {filteredProducts.length} sản phẩm
            </span>
            <DownloadAllQR products={downloadProducts} />
            <button
              onClick={undefined}
              className="print:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm"
              id="print-btn"
            >
              <Printer size={14} />
              In QR
            </button>
          </div>
        </div>
      </header>

      {/* Print button script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.getElementById('print-btn')?.addEventListener('click', function() { window.print(); });`,
        }}
      />

      <div className="max-w-6xl mx-auto px-4 space-y-8">
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative">
          
          {/* Left Stat Block */}
          <div className="flex-1 w-full md:w-auto text-left print:hidden">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm inline-block w-full md:w-auto">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Thống kê</p>
              <p className="text-sm font-semibold text-gray-800">
                Có bao nhiêu loại hòm: <span className="text-2xl font-black text-blue-600 ml-2">{filteredProducts.length}</span>
              </p>
            </div>
          </div>

          {/* Center Title */}
          <div className="text-center md:flex-[2] shrink-0">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Danh sách Mã QR Sản Phẩm
            </h1>
            <p className="mt-2 text-gray-500 max-w-2xl mx-auto text-sm">
              Mỗi mã QR liên kết trực tiếp đến trang chi tiết sản phẩm tương ứng.
              Nhấn <strong>Tải PDF QR</strong> để tải toàn bộ mã QR của danh sách hiện tại.
            </p>
          </div>

          {/* Right spacer for perfect centering */}
          <div className="flex-1 hidden md:block" />
        </div>

        {/* ── Filter & Search Bar ───────────────────── */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4 print:hidden">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Tìm kiếm theo mã sản phẩm hoặc tên sản phẩm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative sm:w-64 flex-shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter size={18} className="text-gray-400" />
            </div>
            <select
              className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white transition-colors"
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
            >
              <option value="">Tất cả các kho</option>
              {warehouses.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <p className="text-gray-500">
              {products.length === 0 ? 'Chưa có sản phẩm nào trong kho hàng.' : 'Không tìm thấy sản phẩm nào khớp với bộ lọc.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 print:grid-cols-3 print:gap-3">
            {filteredProducts.map((product, idx) => {
              const isOutOfStock = product.quantity <= 0;

              return (
                <div
                  key={`${product.productCode}-${idx}`}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col items-center text-center hover:shadow-md hover:border-[#a8b4ce] transition-all duration-200 print:shadow-none print:border print:p-3 print:break-inside-avoid"
                >
                  {/* Status indicator */}
                  <div className="self-end mb-2 print:hidden">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isOutOfStock
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isOutOfStock ? 'bg-red-500' : 'bg-blue-500'}`} />
                      {isOutOfStock ? 'Hết hàng' : `SL: ${product.quantity}`}
                    </span>
                  </div>

                  {/* Product name */}
                  <h3
                    className="font-bold text-gray-900 mb-0.5 line-clamp-2 w-full text-sm leading-tight print:text-xs"
                    title={product.productName}
                  >
                    {product.productName}
                  </h3>

                  {/* Product code */}
                  <p className="text-xs text-[#2d4a7a] font-mono mb-3 uppercase tracking-wider font-semibold">
                    {product.productCode}
                  </p>



                  {/* QR Code */}
                  <QRCodeDisplay code={product.productCode} size={130} />

                  {/* Action button */}
                  <div className="mt-4 w-full print:hidden">
                    <Link
                      href={`/product-sheet/${encodeURIComponent(product.productCode)}`}
                      className="block w-full text-sm font-semibold text-[#1B2A4A] bg-[#eef1f7] hover:bg-[#d5dbe9] py-2.5 rounded-xl transition-colors"
                      target="_blank"
                    >
                      Xem phiếu thông tin →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body { background: white !important; }
              .print\\:hidden { display: none !important; }
              .print\\:static { position: static !important; }
              .print\\:border-0 { border: 0 !important; }
              .print\\:mb-4 { margin-bottom: 1rem !important; }
              .print\\:block { display: block !important; }
              .print\\:grid-cols-3 { grid-template-columns: repeat(3, 1fr) !important; }
              .print\\:gap-3 { gap: 0.75rem !important; }
              .print\\:shadow-none { box-shadow: none !important; }
              .print\\:p-3 { padding: 0.75rem !important; }
              .print\\:text-xs { font-size: 0.75rem !important; }
              .print\\:break-inside-avoid { break-inside: avoid !important; }
            }
          `,
        }}
      />
    </main>
  );
}
