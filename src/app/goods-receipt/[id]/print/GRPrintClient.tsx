'use client';

import { useEffect } from 'react';

export default function GRPrintClient() {
  useEffect(() => {
    // Wait for QR images to load before triggering print
    const timer = setTimeout(() => {
      window.print();
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="gr-print-toolbar">
      <button
        onClick={() => {
          // URL pattern: /goods-receipt/[id]/print
          const parts = window.location.pathname.split('/');
          const grId = parts[parts.length - 2]; // second-to-last segment
          window.location.href = `/goods-receipt/${grId}`;
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: 600,
          color: '#374151',
          cursor: 'pointer',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          fontFamily: 'inherit',
        }}
      >
        ← Quay lại
      </button>
      <button
        onClick={() => window.print()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 20px',
          background: '#ea580c',
          border: 'none',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: 700,
          color: 'white',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(234,88,12,0.35)',
          fontFamily: 'inherit',
        }}
      >
        🖨 In tất cả phiếu
      </button>
    </div>
  );
}
