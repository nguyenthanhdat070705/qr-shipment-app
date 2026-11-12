"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getUserRole, type UserRole, type RolePermissions } from "@/config/roles.config";
import { PackageCheck, Database, Truck, Warehouse, Ban, FileText, XOctagon } from "lucide-react";

export default function InOutManagementTabs({ currentTab, children }: { currentTab: string; children: React.ReactNode }) {
  const router = useRouter();
  const [userRole, setUserRole] = useState<UserRole>("sales");
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const readUser = () => {
      try {
        const raw = localStorage.getItem("auth_user");
        if (raw) {
          const u = JSON.parse(raw);
          setUserRole(getUserRole(u.email || ""));
          setPermissions(u.permissions || null);
        }
      } catch { setPermissions(null); }
      setReady(true);
    };
    readUser();
    window.addEventListener('auth-user-updated', readUser);
    return () => window.removeEventListener('auth-user-updated', readUser);
  }, []);

  const tabs = [
    ...(permissions?.canManageReceipt || permissions?.canReceiveGoods ? [{
      id: "import",
      label: "Nhập hàng",
      icon: <PackageCheck size={18} />,
    },
    {
      id: "receipt-management",
      label: "Quản lý phiếu nhập",
      icon: <Database size={18} />,
    }] : []),
    ...(permissions?.canExport ? [{
      id: "export",
      label: "Xuất hàng",
      icon: <Truck size={18} />,
    },
    {
      id: "export-management",
      label: "Quản lý phiếu xuất",
      icon: <FileText size={18} />,
    },
    {
      id: "void-receipt",
      label: "Huỷ phiếu nhập xuất",
      icon: <XOctagon size={18} />,
    }] : []),
    ...(userRole === "admin" ? [{
      id: "voided-receipts",
      label: "Quản lý phiếu huỷ",
      icon: <Ban size={18} />,
    }] : []),
    ...(permissions?.canViewInventory ? [{
      id: "inventory",
      label: "Quản lý tồn kho",
      icon: <Warehouse size={18} />,
    }] : [])
  ];

  return (
    <>
    <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-100 dark:border-white/10 mb-4 px-2 sm:px-0 scrollbar-hide">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => router.push(`/inout-management?tab=${tab.id}`)}
          className={`whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all flex-shrink-0 ${
            currentTab === tab.id
              ? "bg-[#1B2A4A] text-white shadow-lg shadow-[#1B2A4A]/20"
              : "bg-gray-100 dark:bg-[#162240] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
    {ready && (tabs.some(tab => tab.id === currentTab)
      ? <div className="mt-2">{children}</div>
      : <div className="mt-4 rounded-xl border border-gray-200 p-6 text-sm text-gray-500">Tài khoản của bạn không có quyền sử dụng chức năng này. Vui lòng chọn chức năng khác hoặc liên hệ quản trị viên.</div>)}
    </>
  );
}
