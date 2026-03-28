'use client';

import { QRCodeSVG } from 'qrcode.react';

// URL production của ứng dụng — QR code sẽ link tới đây
const PROD_URL = 'https://blackstone-order-scm.vercel.app';

/**
 * QR Code display component — generates a QR code that links
 * directly to the product page URL on production.
 */
export default function QRCodeDisplay({ code, size = 150 }: { code: string; size?: number }) {
  const url = `${PROD_URL}/product/${encodeURIComponent(code)}`;

  return (
    <div className="bg-white p-3 rounded-xl inline-block shadow-sm border border-gray-100">
      <QRCodeSVG value={url} size={size} level="M" />
    </div>
  );
}
