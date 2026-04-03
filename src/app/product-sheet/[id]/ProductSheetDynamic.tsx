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

      <div className="pt-2 border-t border-gray-100 text-[11px] font-medium">
        {/* Ngày nhập + xuất kho — cùng hàng */}
        <div className="grid grid-cols-[130px_1fr_130px_1fr] gap-y-1 gap-x-3 mb-2">
          <div className="font-bold text-gray-900 uppercase tracking-widest text-[10px]">Ngày nhập kho</div>
          <div className="text-gray-800 font-semibold">
            {ngayNhapKho ? (
              <span>{formatDate(ngayNhapKho)}</span>
            ) : (
              <span className="border-b border-dotted border-gray-400 w-full inline-block">&nbsp;</span>
            )}
          </div>
          <div className="font-bold text-gray-900 uppercase tracking-widest text-[10px]">Ngày xuất kho</div>
          <div className="text-gray-800 font-semibold">
            {ngayXuatKho ? (
              <span>{formatDate(ngayXuatKho)}</span>
            ) : (
              <span className="border-b border-dotted border-gray-400 w-full inline-block">&nbsp;</span>
            )}
          </div>
        </div>

        {/* Lưu kho tại — nằm ngang */}
        <div className="grid grid-cols-[130px_1fr] gap-x-3">
          <div className="font-bold text-gray-900 uppercase tracking-widest text-[10px] pt-0.5">Lưu kho tại</div>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {warehouses?.map((k, i) => {
              const checked = loaded && isWarehouseChecked(k);
              return (
                <label key={i} className="flex items-center gap-1.5 cursor-pointer">
                  <div
                    className={`w-3.5 h-3.5 border-[1.5px] rounded-sm flex items-center justify-center transition-colors ${
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
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </div>
                  <span className="text-gray-800 text-[11px]">{k.ten_kho}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
