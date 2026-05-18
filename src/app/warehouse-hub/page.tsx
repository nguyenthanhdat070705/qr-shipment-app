"use client";

import { useState, useEffect } from "react";
import { 
  Warehouse, PackageCheck, ClipboardCheck, ShoppingCart, Settings
} from "lucide-react";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import { getUserRole, UserRole } from "@/config/roles.config";
import { useRouter } from "next/navigation";

export default function WarehouseHubPage() {
  const [userRole, setUserRole] = useState<UserRole>("sales");
  const [roleReady, setRoleReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("auth_user");
      if (raw) {
        const u = JSON.parse(raw);
        setUserRole(getUserRole(u.email || ""));
      }
    } catch { /* ignore */ }
    setRoleReady(true);
  }, []);

  useEffect(() => {
    if (roleReady && userRole === "warehouse") {
      router.replace("/warehouse");
    }
  }, [roleReady, router, userRole]);

  const cards = [
    ...(userRole === "admin" || userRole === "warehouse" || userRole === "procurement" || userRole === "sales" ? [{
      id: "inout-management",
      title: "Quản lý xuất nhập",
      icon: <PackageCheck size={32} className="text-white" />,
      desc: "Tổng hợp và quản lý dữ liệu xuất nhập kho",
      href: userRole === "sales" ? "/inout-management?tab=inventory" : "/inout-management",
      color: "bg-blue-500",
      shadow: "shadow-blue-500/20",
      gradient: "from-blue-400 to-indigo-600",
    }] : []),
    ...(userRole === "admin" || userRole === "warehouse" ? [{
      id: "stocktake",
      title: "Kiểm kho",
      icon: <ClipboardCheck size={32} className="text-white" />,
      desc: "Kiểm kê định kỳ, đối chiếu số lượng thực tế với hệ thống",
      href: "/stocktake",
      color: "bg-pink-500",
      shadow: "shadow-pink-500/20",
      gradient: "from-pink-400 to-rose-600",
    }] : []),
    ...(userRole === "admin" || userRole === "procurement" ? [{
      id: "purchase-orders",
      title: "Đặt hàng",
      icon: <ShoppingCart size={32} className="text-white" />,
      desc: "Tạo & quản lý các đơn đặt hàng (PO)",
      href: "/purchase-orders",
      color: "bg-violet-500",
      shadow: "shadow-violet-500/20",
      gradient: "from-violet-400 to-fuchsia-600",
    }] : []),
    ...(userRole === "admin" || userRole === "procurement" ? [{
      id: "warehouse-settings",
      title: "Quản lý & khai báo thông tin kho",
      icon: <Settings size={32} className="text-white" />,
      desc: "Toàn bộ sản phẩm, quản lý hòm, quản lý NCC, quản lý kho",
      href: "/warehouse-settings",
      color: "bg-teal-500",
      shadow: "shadow-teal-500/20",
      gradient: "from-teal-400 to-emerald-600",
    }] : [])
  ];

  if (!roleReady || userRole === "warehouse") {
    return null;
  }

  return (
    <PageLayout title="Trung Tâm Kho Vận" icon={<Warehouse size={15} className="text-emerald-500" />}>
      <div className="pb-12">
        {/* ── Header chuẩn dùng chung theo giao diện admin ── */}
        <div className="mb-8 sm:mb-10 text-center space-y-3 sm:space-y-4 pt-4 px-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">Tính năng Kho Vận</h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-sm sm:text-base">
            Lựa chọn một nghiệp vụ bên dưới để quản lý xuất nhập, tồn kho, sản phẩm và cấu hình hệ thống kho.
          </p>
        </div>

        {/* ── Grid chuẩn dùng chung theo giao diện admin ── */}
        <div className="space-y-10 max-w-7xl mx-auto px-4">
          {cards.length > 0 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
                {cards.map((card) => (
                  <Link
                    key={card.id}
                    href={card.href}
                    className={`group bg-white dark:bg-[#162240] p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-xl ${card.shadow} dark:shadow-none hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 relative overflow-hidden flex flex-col h-full`}
                  >
                    {/* Background decor */}
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${card.gradient} opacity-5 dark:opacity-10 rounded-bl-[100px] transform group-hover:scale-110 transition-transform duration-500`}></div>
                    
                    <div className="relative z-10 flex-1 flex flex-col">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg mb-5 transform group-hover:rotate-6 transition-transform duration-300`}>
                        {card.icon}
                      </div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2 leading-tight">{card.title}</h2>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-relaxed mb-6 flex-1">
                        {card.desc}
                      </p>
                      
                      <div className="flex items-center text-sm font-bold text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-white transition-colors mt-auto">
                        <span className="flex-1">Chi tiết</span>
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500 group-hover:bg-gray-900 dark:group-hover:bg-white/20 group-hover:text-white transition-all`}>
                          →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {cards.length === 0 && (
            <div className="col-span-full border border-gray-200 rounded-2xl p-8 text-center text-gray-500">
              Tài khoản của bạn chưa được phân quyền thao tác tính năng kho.
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
