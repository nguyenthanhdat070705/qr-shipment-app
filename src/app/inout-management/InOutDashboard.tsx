"use client";

import { useState, useEffect } from "react";
import { getUserRole, UserRole } from "@/config/roles.config";
import { GoodsReceiptContent } from "../goods-receipt/page";
import { ReceiptManagementContent } from "../receipt-management/page";
import { GoodsIssueContent } from "../goods-issue/page";
import { VoidedReceiptsContent } from "../voided-receipts/page";
import { PackageCheck, Database, Truck, Warehouse, Ban } from "lucide-react";

export default function InOutDashboard({ inventoryComponent }: { inventoryComponent?: React.ReactNode }) {
  const [userRole, setUserRole] = useState<UserRole>("sales");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("auth_user");
      if (raw) {
        const u = JSON.parse(raw);
        setUserRole(getUserRole(u.email || ""));
      }
    } catch { /* ignore */ }
  }, []);

  const canSeeImport = userRole === "admin" || userRole === "warehouse" || userRole === "procurement";
  const canSeeExport = userRole === "admin" || userRole === "warehouse";
  const canSeeVoided = userRole === "admin";

  return (
    <div className="flex flex-col gap-6 w-full">
      {canSeeImport && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
           <div className="bg-white dark:bg-[#162240] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10">
             <div className="flex items-center gap-2 mb-4 text-[#1B2A4A] dark:text-white border-b pb-3">
                <PackageCheck size={20} />
                <h2 className="text-xl font-bold">Quản lý Nhập Hàng</h2>
             </div>
             <div className="scale-[0.95] origin-top w-[105.2%]">
               <GoodsReceiptContent />
             </div>
           </div>
           
           <div className="bg-white dark:bg-[#162240] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10">
             <div className="flex items-center gap-2 mb-4 text-indigo-600 dark:text-indigo-400 border-b pb-3">
                <Database size={20} />
                <h2 className="text-xl font-bold">Phiếu Nhập Chờ Duyệt / Hoàn Tất</h2>
             </div>
             <div className="scale-[0.95] origin-top w-[105.2%]">
               <ReceiptManagementContent />
             </div>
           </div>
        </div>
      )}
      
      {canSeeExport && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
           <div className="bg-white dark:bg-[#162240] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10">
             <div className="flex items-center gap-2 mb-4 text-emerald-600 dark:text-emerald-400 border-b pb-3">
                <Truck size={20} />
                <h2 className="text-xl font-bold">Quản lý Xuất Hàng</h2>
             </div>
             <div className="scale-[0.95] origin-top w-[105.2%]">
               <GoodsIssueContent />
             </div>
           </div>
           
           <div className="bg-white dark:bg-[#162240] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10">
             <div className="flex items-center gap-2 mb-4 text-amber-600 dark:text-amber-400 border-b pb-3">
                <Warehouse size={20} />
                <h2 className="text-xl font-bold">Tồn Kho Hiện Tại</h2>
             </div>
             <div className="scale-[0.95] origin-top w-[105.2%]">
               {inventoryComponent}
             </div>
           </div>
        </div>
      )}

      {canSeeVoided && (
        <div className="bg-white dark:bg-[#162240] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10">
           <div className="flex items-center gap-2 mb-4 text-red-600 dark:text-red-400 border-b pb-3">
              <Ban size={20} />
              <h2 className="text-xl font-bold">Danh sách Phiếu Huỷ</h2>
           </div>
           <div className="scale-[0.95] origin-top w-[105.2%]">
             <VoidedReceiptsContent />
           </div>
        </div>
      )}
    </div>
  );
}
