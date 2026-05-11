"use client";

import { useState, useEffect } from "react";
import { 
  Warehouse, PackageCheck, ClipboardCheck, ShoppingCart, Settings
} from "lucide-react";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import { getUserRole, UserRole } from "@/config/roles.config";

export default function WarehouseHubPage() {
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

  const cards = [
    ...(userRole === "admin" || userRole === "warehouse" || userRole === "procurement" ? [{
      id: "inout-management",
      title: "Quản lý xuất nhập",
      icon: <PackageCheck size={32} className="text-white" />,
      desc: "Tổng hợp và quản lý dữ liệu xuất nhập kho",
      href: "/inout-management",
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
    ...(userRole === "admin" || userRole === "procurement" || userRole === "sales" ? [{
      id: "purchase-orders",
      title: "Đặt hàng",
      icon: <ShoppingCart size={32} className="text-white" />,
      desc: "Tạo & quản lý các đơn đặt hàng (PO)",
      href: "/purchase-orders",
      color: "bg-violet-500",
      shadow: "shadow-violet-500/20",
      gradient: "from-violet-400 to-fuchsia-600",
    }] : []),
    ...(userRole === "admin" || userRole === "warehouse" || userRole === "procurement" ? [{
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

  const isWarehouseUser = userRole === "warehouse";

  return (
    <PageLayout title="Trung Tâm Kho Vận" icon={<Warehouse size={15} className="text-emerald-500" />}>
      {isWarehouseUser ? (
        <div className="max-w-6xl mx-auto px-4 pb-16 pt-6 sm:pt-8">
          {/* ── Header Simple cho Kho ── */}
          <div className="mb-8 sm:mb-12 text-center bg-blue-50 dark:bg-[#162240] rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 border border-blue-100 dark:border-white/10 shadow-sm">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-blue-900 dark:text-white mb-3 sm:mb-4 tracking-tight">Xin chào, Kho Vận 👋</h1>
            <p className="text-base sm:text-xl md:text-2xl text-blue-700 dark:text-blue-300 font-medium max-w-2xl mx-auto">
              Hôm nay bạn muốn thao tác gì? Nhấn vào các ô lớn bên dưới để bắt đầu.
            </p>
          </div>

          {/* ── Grid Simple cho Kho ── */}
          <div className="space-y-12">
            {cards.length > 0 && (
              <div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                  {cards.map((card) => (
                    <Link
                      key={card.id}
                      href={card.href}
                      className="group flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5 sm:gap-6 bg-white dark:bg-[#162240] p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border-4 border-gray-50 dark:border-white/5 shadow-xl dark:shadow-none hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer"
                    >
                      {/* Icon siêu to */}
                      <div className={`w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-[1.5rem] sm:rounded-[2rem] bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-md`}>
                        <div className="scale-[1.5] sm:scale-[2]">
                          {card.icon}
                        </div>
                      </div>
                      
                      <div className="flex-1 mt-2">
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-2 sm:mb-3">{card.title}</h2>
                        <p className="text-base sm:text-lg md:text-xl text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                          {card.desc}
                        </p>
                      </div>
                      
                      {/* Nút mũi tên to, rõ ràng */}
                      <div className="hidden sm:flex mt-4 sm:mt-6 w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 rounded-full bg-blue-50 dark:bg-white/5 items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="sm:w-9 sm:h-9"><path d="m9 18 6-6-6-6"/></svg>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {cards.length === 0 && (
              <div className="col-span-full border-4 border-dashed border-gray-200 rounded-[3rem] p-12 text-center text-2xl font-bold text-gray-400">
                Tài khoản của bạn chưa được phân quyền.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="pb-12">
          {/* ── Header Mặc định ── */}
          <div className="mb-8 sm:mb-10 text-center space-y-3 sm:space-y-4 pt-4 px-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">Tính năng Kho Vận</h1>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-sm sm:text-base">
              Lựa chọn một nghiệp vụ bên dưới để quản lý xuất nhập, tồn kho, sản phẩm và cấu hình hệ thống kho.
            </p>
          </div>

          {/* ── Grid Mặc định ── */}
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
      )}
    </PageLayout>
  );
}
