"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getUserRole, UserRole } from "@/config/roles.config";
import { LayoutGrid, Package, Tags, LayoutDashboard } from "lucide-react";

export default function WarehouseSettingsTabs({ currentTab }: { currentTab: string }) {
  const router = useRouter();
  const [userRole] = useState<UserRole>(() => {
    if (typeof window === "undefined") return "sales";
    try {
      const raw = localStorage.getItem("auth_user");
      if (raw) {
        const u = JSON.parse(raw);
        return getUserRole(u.email || "");
      }
    } catch { /* ignore */ }
    return "sales";
  });

  const tabs = [
    ...(userRole === "admin" || userRole === "warehouse" || userRole === "procurement" || userRole === "sales" ? [{
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
    <div className="mb-5 flex max-w-full gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-white/10 dark:bg-[#111a33]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => router.push(`/warehouse-settings?tab=${tab.id}`)}
          className={`inline-flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
            currentTab === tab.id
              ? "bg-[#1B2A4A] text-white shadow-sm"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
