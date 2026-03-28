'use client';

import { useState } from 'react';
import { FileDown, Loader2, CheckCircle2 } from 'lucide-react';

const BASE_URL = 'https://qr-shipment-app.vercel.app';

interface ProductItem {
  productCode: string;
  productName: string;
}

/**
 * Render a QR code SVG offscreen and convert to a canvas image data URL.
 */
async function renderQRToDataURL(url: string, qrSize: number): Promise<string> {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.left = '-9999px';
  wrapper.style.top = '-9999px';
  document.body.appendChild(wrapper);

  const { createRoot } = await import('react-dom/client');
  const { createElement } = await import('react');
  const { QRCodeSVG } = await import('qrcode.react');

  return new Promise((resolve) => {
    const root = createRoot(wrapper);
    root.render(
      createElement(QRCodeSVG, { value: url, size: qrSize, level: 'M' })
    );

    setTimeout(() => {
      const svg = wrapper.querySelector('svg');
      if (!svg) {
        cleanup();
        resolve('');
        return;
      }

      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const canvas = document.createElement('canvas');
      canvas.width = qrSize;
      canvas.height = qrSize;
      const ctx = canvas.getContext('2d')!;

      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, qrSize, qrSize);
        ctx.drawImage(img, 0, 0, qrSize, qrSize);
        URL.revokeObjectURL(svgUrl);
        cleanup();
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        cleanup();
        resolve('');
      };
      img.src = svgUrl;

      function cleanup() {
        try { root.unmount(); } catch {}
        try { document.body.removeChild(wrapper); } catch {}
      }
    }, 80);
  });
}

export default function DownloadAllQR({ products }: { products: ProductItem[] }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);

  const handleDownload = async () => {
    if (isDownloading || products.length === 0) return;
    setIsDownloading(true);
    setProgress(0);
    setIsDone(false);

    try {
      const { jsPDF } = await import('jspdf');

      // A4 page: 210×297 mm
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210;
      const pageH = 297;

      // Grid layout: 3 columns × 4 rows per page
      const cols = 3;
      const rows = 4;
      const cellsPerPage = cols * rows;

      const marginX = 10;
      const marginY = 12;
      const gapX = 6;
      const gapY = 6;
      const cellW = (pageW - marginX * 2 - gapX * (cols - 1)) / cols;
      const cellH = (pageH - marginY * 2 - gapY * (rows - 1)) / rows;
      const qrImgSize = Math.min(cellW - 8, cellH - 22); // leave room for text

      // Header on first page
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(27, 42, 74); // #1B2A4A
      pdf.text('Danh sach Ma QR San Pham - Kho Hang', pageW / 2, 10, { align: 'center' });

      const date = new Date();
      const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Ngay xuat: ${dateStr}  |  Tong: ${products.length} san pham`, pageW / 2, 16, { align: 'center' });

      const firstPageMarginTop = 22;

      // Pre-generate all QR data URLs in batches for better performance
      const qrDataUrls: string[] = [];
      const batchSize = 6;

      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map((p) => {
            const url = `${BASE_URL}/product/${encodeURIComponent(p.productCode)}`;
            return renderQRToDataURL(url, 300);
          })
        );
        qrDataUrls.push(...batchResults);
        setProgress(Math.round(((Math.min(i + batchSize, products.length)) / products.length) * 90));
      }

      // Place QR codes on PDF pages
      for (let i = 0; i < products.length; i++) {
        const pageIndex = Math.floor(i / cellsPerPage);
        const posInPage = i % cellsPerPage;

        if (posInPage === 0 && i > 0) {
          pdf.addPage();
        }

        const col = posInPage % cols;
        const row = Math.floor(posInPage / cols);

        const topOffset = pageIndex === 0 ? firstPageMarginTop : marginY;
        const adjustedCellH = pageIndex === 0
          ? (pageH - firstPageMarginTop - marginY - gapY * (rows - 1)) / rows
          : cellH;

        const x = marginX + col * (cellW + gapX);
        const y = topOffset + row * (adjustedCellH + gapY);

        // Card background (light gray rounded rect)
        pdf.setFillColor(248, 249, 252);
        pdf.setDrawColor(220, 224, 232);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(x, y, cellW, adjustedCellH, 3, 3, 'FD');

        // QR image
        const dataUrl = qrDataUrls[i];
        if (dataUrl) {
          const imgSize = Math.min(qrImgSize, adjustedCellH - 24);
          const imgX = x + (cellW - imgSize) / 2;
          const imgY = y + 3;
          pdf.addImage(dataUrl, 'PNG', imgX, imgY, imgSize, imgSize);
        }

        // Product code (bold, below QR)
        const actualQrH = Math.min(qrImgSize, adjustedCellH - 24);
        const codeY = y + actualQrH + 7;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(27, 42, 74);
        pdf.text(
          products[i].productCode.toUpperCase(),
          x + cellW / 2,
          codeY,
          { align: 'center', maxWidth: cellW - 4 }
        );

        // Product name (smaller, truncated)
        const nameY = codeY + 4.5;
        pdf.setFontSize(6.5);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 100, 100);
        const truncName = products[i].productName.length > 40
          ? products[i].productName.substring(0, 37) + '...'
          : products[i].productName;
        pdf.text(truncName, x + cellW / 2, nameY, {
          align: 'center',
          maxWidth: cellW - 4,
        });
      }

      setProgress(100);

      // Footer on every page
      const totalPages = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(170, 170, 170);
        pdf.text(`Blackstones SCM  —  Trang ${p}/${totalPages}`, pageW / 2, pageH - 5, { align: 'center' });
      }

      const fileName = `QR_SanPham_KhoHang_${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}.pdf`;
      pdf.save(fileName);

      setIsDone(true);
      setTimeout(() => setIsDone(false), 3000);
    } catch (err) {
      console.error('Error generating QR PDF:', err);
      alert('Có lỗi khi tạo file PDF. Vui lòng thử lại.');
    } finally {
      setIsDownloading(false);
      setProgress(0);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading || products.length === 0}
      id="download-all-qr-btn"
      className={`
        print:hidden inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
        transition-all duration-300 shadow-sm
        ${isDone
          ? 'bg-emerald-500 text-white hover:bg-emerald-600'
          : isDownloading
          ? 'bg-[#1B2A4A]/80 text-white cursor-wait'
          : 'bg-gradient-to-r from-[#1B2A4A] to-[#2d4a7a] text-white hover:from-[#162240] hover:to-[#1B2A4A] hover:shadow-md'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      {isDone ? (
        <>
          <CheckCircle2 size={16} className="animate-bounce" />
          Đã tải xong!
        </>
      ) : isDownloading ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          <span>Đang tạo PDF... {progress}%</span>
        </>
      ) : (
        <>
          <FileDown size={16} />
          Tải PDF QR ({products.length})
        </>
      )}
    </button>
  );
}
