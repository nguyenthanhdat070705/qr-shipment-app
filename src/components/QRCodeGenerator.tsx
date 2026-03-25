'use client';

import { QRCodeSVG } from 'qrcode.react';
import type { QRDocType } from '@/types';

interface QRCodeGeneratorProps {
  type: QRDocType;
  id: string;
  code: string;
  size?: number;
  showLabel?: boolean;
}

/**
 * Generates a QR code that encodes a URL to the scan page.
 * URL format: /scan/{type}/{id}
 *
 * Types:
 * - po       → Purchase Order
 * - grpo     → Goods Receipt
 * - export   → Export Confirmation
 * - delivery → Delivery Order
 * - product  → Product detail
 */
export default function QRCodeGenerator({
  type,
  id,
  code,
  size = 128,
  showLabel = true,
}: QRCodeGeneratorProps) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const scanUrl = `${baseUrl}/scan/${type}/${id}`;

  const typeLabels: Record<QRDocType, string> = {
    po: 'Đơn mua hàng',
    grpo: 'Phiếu nhập kho',
    export: 'Xuất kho',
    delivery: 'Đơn giao hàng',
    product: 'Sản phẩm',
  };

  const typeColors: Record<QRDocType, string> = {
    po: '#7c3aed',
    grpo: '#ea580c',
    export: '#059669',
    delivery: '#d97706',
    product: '#1B2A4A',
  };

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div
        className="p-3 rounded-xl bg-white border-2 shadow-sm"
        style={{ borderColor: typeColors[type] + '40' }}
      >
        <QRCodeSVG
          value={scanUrl}
          size={size}
          level="M"
          fgColor={typeColors[type]}
          bgColor="transparent"
        />
      </div>
      {showLabel && (
        <div className="text-center">
          <p className="text-xs font-bold" style={{ color: typeColors[type] }}>
            {typeLabels[type]}
          </p>
          <p className="text-[10px] text-gray-400 font-mono">{code}</p>
        </div>
      )}
    </div>
  );
}
