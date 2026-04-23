"use client";

import { useState, useEffect } from "react";
import { 
  Warehouse, PackageCheck, Truck, LayoutGrid, Package, LayoutDashboard, Database, Tags, ShoppingCart
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
      id: "import",
      title: "Nhập hàng (GRPO)",
      icon: <PackageCheck size={32} className="text-white" />,
      desc: "Tạo phiếu nhập kho, kiểm kê hàng vào",
      href: "/goods-receipt",
      color: "bg-emerald-500",
      shadow: "shadow-emerald-500/20",
      gradient: "from-emerald-400 to-teal-600",
    }] : []),
    ...(userRole === "admin" || userRole === "warehouse" || userRole === "procurement" ? [{
      id: "receipt-management",
      title: "Quản lý phiếu nhập",
      icon: <Database size={32} className="text-white" />,
      desc: "Đối chiếu PO & theo dõi tiến độ nhập kho",
      href: "/receipt-management",
      color: "bg-indigo-500",
      shadow: "shadow-indigo-500/20",
      gradient: "from-indigo-400 to-blue-600",
    }] : []),
    ...(userRole === "admin" || userRole === "warehouse" ? [{
      id: "export",
      title: "Xuất hàng",
      icon: <Truck size={32} className="text-white" />,
      desc: "Tạo phiếu xuất IT (chuyển kho) & GRIT (trả hàng)",
      href: "/goods-issue",
      color: "bg-amber-500",
      shadow: "shadow-amber-500/20",
      gradient: "from-amber-400 to-orange-600",
    }] : []),
    ...(userRole === "admin" || userRole === "warehouse" ? [{
      id: "inventory",
      title: "Tồn kho",
      icon: <Warehouse size={32} className="text-white" />,
      desc: "Xem số lượng tồn, tra cứu mã lô chi tiết",
      href: "/inventory",
      color: "bg-sky-500",
      shadow: "shadow-sky-500/20",
      gradient: "from-sky-400 to-cyan-600",
    }] : []),
    ...(userRole === "admin" || userRole === "warehouse" || userRole === "procurement" ? [{
      id: "products",
      title: "Toàn bộ sản phẩm",
      icon: <LayoutGrid size={32} className="text-white" />,
      desc: "Danh mục sản phẩm, xem và in mã QR",
      href: "/product/fullproductlist",
      color: "bg-teal-500",
      shadow: "shadow-teal-500/20",
      gradient: "from-teal-400 to-emerald-600",
    }] : []),
    ...(userRole === "admin" || userRole === "procurement" ? [{
      id: "boxes",
      title: "Quản lý hòm",
      icon: <Package size={32} className="text-white" />,
      desc: "Khởi tạo mã hòm & thiết lập sản phẩm trong hòm",
      href: "/products-manage",
      color: "bg-purple-500",
      shadow: "shadow-purple-500/20",
      gradient: "from-purple-400 to-violet-600",
    }] : []),
    ...(userRole === "admin" || userRole === "procurement" ? [{
      id: "suppliers",
      title: "Quản lý NCC",
      icon: <Tags size={32} className="text-white" />,
      desc: "Thông tin và chi tiết danh sách Nhà cung cấp",
      href: "/suppliers-manage",
      color: "bg-orange-500",
      shadow: "shadow-orange-500/20",
      gradient: "from-orange-400 to-red-600",
    }] : []),
    ...(userRole === "admin" ? [{
      id: "warehouses",
      title: "Quản lý kho",
      icon: <LayoutDashboard size={32} className="text-white" />,
      desc: "Tạo và cấu hình các kho vật lý trong hệ thống",
      href: "/warehouses-manage",
      color: "bg-rose-500",
      shadow: "shadow-rose-500/20",
      gradient: "from-rose-400 to-rose-600",
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
    ...(userRole === "admin" || userRole === "operations" ? [{
      id: "operations",
      title: "Điều phối",
      icon: <Truck size={32} className="text-white" />,
      desc: "Quản lý và điều phối phương tiện giao nhận",
      href: "/operations",
      color: "bg-yellow-500",
      shadow: "shadow-yellow-500/20",
      gradient: "from-yellow-400 to-amber-600",
    }] : [])
  ];

  const isWarehouseUser = userRole === "warehouse";

  return (
    <PageLayout title="Trung Tâm Kho Vận" icon={<Warehouse size={15} className="text-emerald-500" />}>
      {isWarehouseUser ? (
        <div className="max-w-6xl mx-auto px-4 pb-16 pt-8">
          {/* ── Header Simple cho Kho ── */}
          <div className="mb-12 text-center bg-blue-50 rounded-[3rem] p-10 border border-blue-100 shadow-sm">
            <h1 className="text-4xl md:text-5xl font-black text-blue-900 mb-4 tracking-tight">Xin chào, Kho Vận 👋</h1>
            <p className="text-xl md:text-2xl text-blue-700 font-medium max-w-2xl mx-auto">
              Hôm nay bạn muốn thao tác gì? Nhấn vào các ô lớn bên dưới để bắt đầu.
            </p>
          </div>

          {/* ── Grid Simple cho Kho ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {cards.map((card) => (
              <Link
                key={card.id}
                href={card.href}
                className="group flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6 bg-white p-8 rounded-[2.5rem] border-4 border-gray-50 shadow-xl hover:border-blue-400 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer"
              >
                {/* Icon siêu to */}
                <div className={`w-32 h-32 flex-shrink-0 rounded-[2rem] bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-md`}>
                  <div className="scale-[2]">
                    {card.icon}
                  </div>
                </div>
                
                <div className="flex-1 mt-4 sm:mt-2">
                  <h2 className="text-3xl font-extrabold text-gray-900 mb-3">{card.title}</h2>
                  <p className="text-lg md:text-xl text-gray-500 leading-relaxed font-medium">
                    {card.desc}
                  </p>
                </div>
                
                {/* Nút mũi tên to, rõ ràng */}
                <div className="hidden sm:flex mt-6 w-16 h-16 flex-shrink-0 rounded-full bg-blue-50 items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </div>
              </Link>
            ))}
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
          <div className="mb-10 text-center space-y-4 pt-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">Tính năng Kho Vận</h1>
            <p className="text-gray-500 max-w-xl mx-auto">
              Lựa chọn một nghiệp vụ bên dưới để quản lý xuất nhập, tồn kho, sản phẩm và cấu hình hệ thống kho.
            </p>
          </div>

          {/* ── Grid Mặc định ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto px-4">
            {cards.map((card) => (
              <Link
                key={card.id}
                href={card.href}
                className={`group bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl ${card.shadow} hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 relative overflow-hidden flex flex-col h-full`}
              >
                {/* Background decor */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${card.gradient} opacity-5 rounded-bl-[100px] transform group-hover:scale-110 transition-transform duration-500`}></div>
                
                <div className="relative z-10 flex-1 flex flex-col">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg mb-5 transform group-hover:rotate-6 transition-transform duration-300`}>
                    {card.icon}
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 mb-2 leading-tight">{card.title}</h2>
                  <p className="text-sm font-medium text-gray-500 leading-relaxed mb-6 flex-1">
                    {card.desc}
                  </p>
                  
                  <div className="flex items-center text-sm font-bold text-gray-400 group-hover:text-gray-700 transition-colors mt-auto">
                    <span className="flex-1">Chi tiết</span>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 text-gray-400 group-hover:bg-gray-900 group-hover:text-white transition-all`}>
                      →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
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
