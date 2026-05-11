"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getUserRole, UserRole } from "@/config/roles.config";
import { PackageCheck, Database, Truck, Warehouse, Ban } from "lucide-react";

export default function InOutManagementTabs({ currentTab }: { currentTab: string }) {
  const router = useRouter();
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

  const tabs = [
    ...(userRole === "admin" || userRole === "warehouse" || userRole === "procurement" ? [{
      id: "import",
      label: "Nhập hàng",
      icon: <PackageCheck size={18} />,
    },
    {
      id: "receipt-management",
      label: "Quản lý phiếu nhập",
      icon: <Database size={18} />,
    }] : []),
    ...(userRole === "admin" || userRole === "warehouse" ? [{
      id: "export",
      label: "Xuất hàng",
      icon: <Truck size={18} />,
    },
    {
      id: "inventory",
      label: "Tồn kho",
      icon: <Warehouse size={18} />,
    }] : []),
    ...(userRole === "admin" ? [{
      id: "voided-receipts",
      label: "Phiếu Huỷ",
      icon: <Ban size={18} />,
    }] : [])
  ];

  return (
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
  );
}
