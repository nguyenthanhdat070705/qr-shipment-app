'use client';

import { QRCodeSVG } from 'qrcode.react';

// Dùng env var nếu có, fallback về domain production hiện tại
const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://blackstone-order-scm.vercel.app';

/**
 * QR Code display component — generates a QR code that links
 * directly to the product page URL.
 * Uses the production URL to ensure QR codes work on mobile.
 */
export default function QRCodeDisplay({ code, size = 150 }: { code: string; size?: number }) {
  const url = `${BASE_URL}/product/${encodeURIComponent(code)}`;

  return (
    <div className="bg-white p-3 rounded-xl inline-block shadow-sm border border-gray-100">
      <QRCodeSVG value={url} size={size} level="M" />
    </div>
  );
}
