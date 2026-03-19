'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';

export default function QRCodeDisplay({ code, size = 150 }: { code: string, size?: number }) {
  const [url, setUrl] = useState(`http://localhost:3000/product/${encodeURIComponent(code)}`);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUrl(`${window.location.origin}/product/${encodeURIComponent(code)}`);
    }
  }, [code]);

  return (
    <div className="bg-white p-3 rounded-xl inline-block shadow-sm border border-gray-100">
      <QRCodeSVG value={url} size={size} level="M" />
    </div>
  );
}
