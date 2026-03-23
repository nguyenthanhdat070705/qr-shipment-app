'use client';

import { useState, useRef, FormEvent } from 'react';
import { ArrowRight, ScanLine, Keyboard } from 'lucide-react';
import { extractProductCode } from '@/lib/utils';
import dynamic from 'next/dynamic';

const Scanner = dynamic(() => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner), {
  ssr: false,
});

/**
 * Form tra cứu sản phẩm — hỗ trợ:
 * 1. Nhập thủ công mã sản phẩm / mã QR
 * 2. Quét QR bằng camera điện thoại (native capture trên mobile)
 */
export default function QuickLookupForm() {
  const [code, setCode] = useState('');
  const [inputMode, setInputMode] = useState<'type' | 'scan'>('type');
  const inputRef = useRef<HTMLInputElement>(null);

  function navigate(value: string) {
    const productCode = extractProductCode(value);
    if (productCode) {
      window.location.href = `/product/${encodeURIComponent(productCode)}`;
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    navigate(code);
  }

  // Khi đổi sang chế độ nhập thủ công — focus vào input
  function switchToType() {
    setInputMode('type');
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <div className="space-y-3">
      {/* Chọn chế độ nhập */}
      <div className="flex rounded-xl border border-gray-200 bg-gray-100 p-1 gap-1">
        <button
          type="button"
          onClick={switchToType}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-all ${
            inputMode === 'type'
              ? 'bg-white text-navy-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Keyboard size={14} />
          Nhập mã
        </button>
        <button
          type="button"
          onClick={() => setInputMode('scan')}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-all ${
            inputMode === 'scan'
              ? 'bg-white text-navy-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ScanLine size={14} />
          Quét QR
        </button>
      </div>

      {inputMode === 'type' ? (
        /* ── Chế độ nhập thủ công ─────────────────────────── */
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Nhập mã sản phẩm…"
            autoFocus
            className="flex-1 rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-mono
                       focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent transition"
          />
          <button
            type="submit"
            className="rounded-xl bg-navy-600 px-4 py-3 text-sm font-semibold text-white
                       hover:bg-navy-700 active:scale-95 transition-all inline-flex items-center gap-1.5"
          >
            <ArrowRight size={15} />
            Tìm
          </button>
        </form>
      ) : (
        /* ── Chế độ quét QR (mobile camera) ────────────────── */
        <div className="space-y-3">
          <p className="text-sm text-gray-500 text-center">
            Đưa mã QR vào khung hình bên dưới để quét tự động.
          </p>
          <div className="rounded-xl overflow-hidden border-2 border-navy-300 bg-black relative aspect-square max-h-[300px] mx-auto flex items-center justify-center">
            <Scanner
              onScan={(result) => {
                if (result && result.length > 0 && result[0].rawValue) {
                  navigate(result[0].rawValue);
                }
              }}
              formats={['qr_code']}
              components={{
                onOff: true,
                torch: true,
                zoom: true,
                finder: true,
              }}
              sound={true}
            />
          </div>
          <button
            type="button"
            onClick={switchToType}
            className="w-full text-sm text-gray-400 hover:text-gray-600 transition my-2"
          >
            Hoặc nhập thủ công →
          </button>
        </div>
      )}
    </div>
  );
}
