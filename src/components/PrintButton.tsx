'use client';

import { Printer } from 'lucide-react';

export default function PrintButton() {
  return (
    <>
      <button
        onClick={() => window.print()}
        className="print:hidden flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#1B2A4A] text-white font-bold text-sm hover:bg-[#162240] shadow-lg shadow-[#1B2A4A]/20 transition-all active:scale-[0.98]"
      >
        <Printer size={16} />
        In phiếu
      </button>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          /* Hide non-essential UI */
          header, nav, .print\\:hidden {
            display: none !important;
          }
          /* Clean background */
          main {
            background: white !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </>
  );
}
