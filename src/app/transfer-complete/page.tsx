'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import {
  CheckCircle, Printer, Hash, FileText, User, Mail,
  Calendar, Clock, Package, Warehouse, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

function TransferCompleteContent() {
  const params = useSearchParams();

  const stt = params.get('stt') || '';
  const maDam = params.get('ma_dam') || '';
  const nguoiMat = params.get('nguoi_mat') || '';
  const productCode = params.get('product_code') || '';
  const productName = params.get('product_name') || '';
  const khoXuat = params.get('kho_xuat') || '';
  const nguoiXuat = params.get('nguoi_xuat') || '';
  const email = params.get('email') || '';
  const ngayXuat = params.get('ngay_xuat') || '';
  const thoiGian = params.get('thoi_gian') || '';
  const soLuong = params.get('so_luong') || '1';

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#faf7f2] via-white to-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md print:bg-white print:backdrop-blur-none">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors print:hidden"
          >
            <ArrowLeft size={16} />
            Trang chủ
          </Link>
          <Image
            src="/blackstones-logo.webp"
            alt="Blackstones"
            width={100}
            height={22}
            style={{ height: 'auto', filter: 'invert(1) brightness(0.2)' }}
          />
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-5">
        {/* Success header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 flex-shrink-0">
            <CheckCircle size={28} className="text-green-600" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-gray-900">Yêu cầu chuyển hàng hoàn thành</h1>
            <p className="text-xs text-green-600 font-medium">Đã lưu vào hệ thống — Tồn kho đã được cập nhật</p>
          </div>
        </div>

        {/* Transfer info card */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden print:shadow-none print:border-gray-300">
          <div className="px-4 py-3 bg-gradient-to-r from-[#1B2A4A] to-teal-600">
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Phiếu chuyển hàng nội bộ</p>
            <p className="text-white text-lg font-extrabold font-mono mt-0.5">IT-{maDam || 'N/A'}</p>
          </div>

          <div className="divide-y divide-gray-50">
            {stt && (
              <InfoRow icon={<Hash size={14} />} label="STT" value={`#${stt}`} />
            )}
            <InfoRow icon={<FileText size={14} />} label="Mã Đám" value={maDam} highlight />
            {nguoiMat && (
              <InfoRow icon={<User size={14} />} label="Người mất" value={nguoiMat} />
            )}
            <InfoRow icon={<Package size={14} />} label="Mã sản phẩm" value={productCode} mono />
            <InfoRow icon={<Package size={14} />} label="Tên sản phẩm" value={productName} />
            <InfoRow icon={<Package size={14} />} label="Số lượng" value={soLuong} />
            {khoXuat && (
              <InfoRow icon={<Warehouse size={14} />} label="Kho xuất" value={khoXuat} />
            )}
            <InfoRow icon={<User size={14} />} label="Người xuất" value={nguoiXuat} />
            <InfoRow icon={<Mail size={14} />} label="Email" value={email} />
            <InfoRow icon={<Calendar size={14} />} label="Ngày xuất" value={ngayXuat} />
            {thoiGian && (
              <InfoRow icon={<Clock size={14} />} label="Thời gian" value={thoiGian} />
            )}
          </div>
        </div>

        {/* Print button */}
        <button
          onClick={() => window.print()}
          className="print:hidden w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#1B2A4A] text-white font-bold text-sm hover:bg-[#162240] shadow-lg shadow-[#1B2A4A]/20 transition-all active:scale-[0.98]"
        >
          <Printer size={16} />
          In phiếu chuyển hàng
        </button>

        {/* Back link */}
        <Link
          href="/"
          className="print:hidden block text-center text-sm text-gray-400 hover:text-gray-600 font-medium py-2 transition-colors"
        >
          ← Quay về trang chủ
        </Link>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          header, nav, aside, .print\\:hidden {
            display: none !important;
          }
          main { background: white !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </main>
  );
}

function InfoRow({ icon, label, value, highlight, mono }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="text-teal-500 flex-shrink-0 mt-0.5">{icon}</span>
      <span className="text-xs text-gray-500 font-medium w-24 flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm font-medium break-words flex-1 ${
        highlight ? 'font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-mono' :
        mono ? 'font-mono font-bold text-[#1B2A4A]' :
        'text-gray-800'
      }`}>
        {value || '—'}
      </span>
    </div>
  );
}

export default function TransferCompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-gray-200 border-t-teal-500 rounded-full" /></div>}>
      <TransferCompleteContent />
    </Suspense>
  );
}
