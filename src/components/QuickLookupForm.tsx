'use client';

import { useState, useRef, FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { extractProductCode } from '@/lib/utils';

/**
 * Form tra cứu sản phẩm — nhập mã sản phẩm / mã QR thủ công
 */
export default function QuickLookupForm() {
  const [code, setCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function navigate(value: string) {
    if (!value) return;

    // Nếu người dùng quét được hẳn 1 URL (VD: quét mã QR của PO, GRPO, vv)
    try {
      const url = new URL(value);
      if (url.origin === window.location.origin) {
        window.location.href = url.pathname + url.search + url.hash;
        return;
      }
      window.location.href = value;
      return;
    } catch {
      // Bỏ qua lỗi vì đây chỉ là chuỗi mã sản phẩm bình thường
    }

    const productCode = extractProductCode(value);
    if (productCode) {
      window.location.href = `/product-sheet/${encodeURIComponent(productCode)}`;
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    navigate(code);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        ref={inputRef}
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Nhập mã sản phẩm…"
        autoFocus
        className="flex-1 rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-mono
                   focus:outline-none focus:ring-2 focus:ring-[#2d4a7a] focus:border-transparent transition"
      />
      <button
        type="submit"
        className="rounded-xl bg-[#1B2A4A] px-4 py-3 text-sm font-semibold text-white
                   hover:bg-[#162240] active:scale-95 transition-all inline-flex items-center gap-1.5"
      >
        <ArrowRight size={15} />
        Tìm
      </button>
    </form>
  );
}
