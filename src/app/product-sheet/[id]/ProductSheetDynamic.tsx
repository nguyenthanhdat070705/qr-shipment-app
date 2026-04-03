'use client';

import { useEffect, useState } from 'react';
import { getWarehouseFilter } from '@/config/roles.config';
import { Check } from 'lucide-react';

interface Warehouse {
  id: string;
  ma_kho: string;
  ten_kho: string;
}

interface ProductSheetDynamicProps {
  warehouses: Warehouse[];
  /** Ngày nhập kho lấy từ server (ISO string or dd/mm/yyyy) */
  ngayNhapKho: string | null;
  /** Ngày xuất kho lấy từ server */
  ngayXuatKho: string | null;
  /** Danh sách kho mà sản phẩm đang tồn tại (từ fact_inventory) */
  activeWarehouseIds: string[];
}

/**
 * Client component cho phần động của Phiếu thông tin sản phẩm:
 * - Ngày nhập kho: hiển thị real-time data
 * - Lưu kho tại: tự động tick theo tài khoản đang đăng nhập
 */
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

  /**
   * Determine if a warehouse checkbox should be checked:
   * - If user is a specific warehouse account → auto-check that warehouse
   * - Otherwise check based on actual inventory (activeWarehouseIds)
   */
  function isWarehouseChecked(warehouse: Warehouse): boolean {
    if (userWarehouseFilter) {
      // User is locked to a specific warehouse → check that one
      return warehouse.ten_kho === userWarehouseFilter;
    }
    // Admin or other role → check based on actual inventory data
    return activeWarehouseIds.includes(warehouse.id);
  }

  // Format date for display (ISO → dd/mm/yyyy)
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
    <div className="pt-3 border-t border-gray-100 text-[13px] font-medium">
      {/* Dates row - side by side */}
      <div className="grid grid-cols-[150px_1fr_150px_1fr] gap-y-2 gap-x-4 mb-3">
        <div className="font-bold text-gray-900 uppercase tracking-widest text-[12px]">Ngày nhập kho</div>
        <div className="text-gray-800 font-semibold">
          {ngayNhapKho ? (
            <span>{formatDate(ngayNhapKho)}</span>
          ) : (
            <span className="border-b border-dotted border-gray-400 w-full inline-block">&nbsp;</span>
          )}
        </div>
        <div className="font-bold text-gray-900 uppercase tracking-widest text-[12px]">Ngày xuất kho</div>
        <div className="text-gray-800 font-semibold">
          {ngayXuatKho ? (
            <span>{formatDate(ngayXuatKho)}</span>
          ) : (
            <span className="border-b border-dotted border-gray-400 w-full inline-block">&nbsp;</span>
          )}
        </div>
      </div>

      {/* Warehouses - horizontal row */}
      <div className="grid grid-cols-[150px_1fr] gap-x-4">
        <div className="font-bold text-gray-900 uppercase tracking-widest text-[12px] pt-0.5">Lưu kho tại</div>
        <div className="flex flex-wrap gap-x-6 gap-y-1.5 font-bold">
          {warehouses?.map((k, i) => {
            const checked = loaded && isWarehouseChecked(k);
            return (
              <label key={i} className="flex items-center gap-2 cursor-pointer">
                <div
                  className={`w-4 h-4 border-[1.5px] rounded-sm flex items-center justify-center transition-colors print:border-gray-600 ${
                    checked
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-gray-400 text-transparent hover:border-gray-900'
                  }`}
                >
                  {checked && <Check size={12} strokeWidth={3} />}
                </div>
                <span className="text-gray-800 text-[13px]">{k.ten_kho}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
