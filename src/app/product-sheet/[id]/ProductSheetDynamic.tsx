'use client';

import { useEffect, useState } from 'react';
import { getWarehouseFilter } from '@/config/roles.config';

interface Warehouse {
  id: string;
  ma_kho: string;
  ten_kho: string;
}

interface ProductSheetDynamicProps {
  warehouses: Warehouse[];
  ngayNhapKho: string | null;
  ngayXuatKho: string | null;
  activeWarehouseIds: string[];
}

export default function ProductSheetDynamic({
  warehouses,
  ngayNhapKho,
  ngayXuatKho,
  activeWarehouseIds,
}: ProductSheetDynamicProps) {
  const [userWarehouseFilter, setUserWarehouseFilter] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        const wf = getWarehouseFilter(u.email || '', u.ho_ten || u.name || '');
        setUserWarehouseFilter(wf);
      }
    } catch {}
    setLoaded(true);
  }, []);

  function isWarehouseChecked(warehouse: Warehouse): boolean {
    if (userWarehouseFilter) {
      return warehouse.ten_kho === userWarehouseFilter;
    }
    return activeWarehouseIds.includes(warehouse.id);
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  }

  return (
    <>
      {/* Force print background colors for checkboxes */}
      <style dangerouslySetInnerHTML={{ __html: `
        .print-checkbox-checked {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        @media print {
          .print-checkbox-checked {
            background-color: #059669 !important;
            border-color: #059669 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .print-checkbox-checked svg { display: block !important; }
        }
      `}} />

      <div className="pt-8 text-xl font-medium">
        {/* Ngày nhập + xuất kho — cùng hàng */}
        <div className="grid grid-cols-[170px_1fr_150px_1fr] gap-y-1 gap-x-6 mb-8 items-end">
          <div className="font-bold text-gray-900 uppercase tracking-widest text-[17px]">Ngày nhập kho</div>
          <div className="text-gray-900 font-semibold text-[20px]">
            {ngayNhapKho ? (
              <span>{formatDate(ngayNhapKho)}</span>
            ) : (
              <span className="border-b-[3px] border-dotted border-gray-400 w-full inline-block mb-1 h-2">&nbsp;</span>
            )}
          </div>
          <div className="font-bold text-gray-900 uppercase tracking-widest text-[17px]">Ngày xuất kho</div>
          <div className="text-gray-900 font-semibold text-[20px]">
            {ngayXuatKho ? (
              <span>{formatDate(ngayXuatKho)}</span>
            ) : (
              <span className="border-b-[3px] border-dotted border-gray-400 w-full inline-block mb-1 h-2">&nbsp;</span>
            )}
          </div>
        </div>

        {/* Lưu kho tại — nằm ngang */}
        <div className="flex gap-x-6 items-center flex-nowrap">
          <div className="font-bold text-gray-900 uppercase tracking-widest text-[17px] whitespace-nowrap pt-0.5">Lưu kho tại</div>
          <div className="flex gap-x-8 items-center flex-nowrap">
            {warehouses?.map((k, i) => {
              const checked = loaded && isWarehouseChecked(k);
              return (
                <label key={i} className="flex items-center gap-2.5 cursor-pointer whitespace-nowrap">
                  <div
                    className={`w-[22px] h-[22px] border-[2px] rounded flex items-center justify-center transition-colors shrink-0 ${
                      checked
                        ? 'border-emerald-600 bg-emerald-600 text-white print-checkbox-checked'
                        : 'border-gray-400 text-transparent'
                    }`}
                    style={checked ? {
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact',
                      colorAdjust: 'exact',
                    } as React.CSSProperties : undefined}
                  >
                    {checked && (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </div>
                  <span className="text-gray-900 text-[18px] font-bold">{k.ten_kho}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
