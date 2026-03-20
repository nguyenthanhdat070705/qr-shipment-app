'use client';

import { QRCodeSVG } from 'qrcode.react';

const BASE_URL = 'https://qr-shipment-app.vercel.app';

/**
 * QR Code display component — generates a QR code that links
 * directly to the product page URL.
 * Uses a hardcoded production URL to ensure QR codes are consistent
 * regardless of which environment they were generated in.
 */
export default function QRCodeDisplay({ code, size = 150 }: { code: string; size?: number }) {
  const url = `${BASE_URL}/product/${encodeURIComponent(code)}`;

  return (
    <div className="bg-white p-3 rounded-xl inline-block shadow-sm border border-gray-100">
      <QRCodeSVG value={url} size={size} level="M" />
    </div>
  );
}
