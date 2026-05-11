"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getUserRole, UserRole } from "@/config/roles.config";
import { LayoutGrid, Package, Tags, LayoutDashboard } from "lucide-react";

export default function WarehouseSettingsTabs({ currentTab }: { currentTab: string }) {
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
      id: "products",
      label: "Toàn bộ sản phẩm",
      icon: <LayoutGrid size={18} />,
    }] : []),
    ...(userRole === "admin" || userRole === "procurement" ? [{
      id: "boxes",
      label: "Quản lý hòm",
      icon: <Package size={18} />,
    },
    {
      id: "suppliers",
      label: "Quản lý NCC",
      icon: <Tags size={18} />,
    }] : []),
    ...(userRole === "admin" ? [{
      id: "warehouses",
      label: "Quản lý kho",
      icon: <LayoutDashboard size={18} />,
    }] : [])
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-100 dark:border-white/10 mb-6 px-2 sm:px-0 scrollbar-hide">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => router.push(`/warehouse-settings?tab=${tab.id}`)}
          className={`whitespace-nowrap inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all flex-shrink-0 ${
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
