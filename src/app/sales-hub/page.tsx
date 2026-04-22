"use client";

import { useState, useEffect } from "react";
import { 
  ShoppingCart, Receipt, Scale, Presentation
} from "lucide-react";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import { getUserRole, UserRole } from "@/config/roles.config";

export default function SalesHubPage() {
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
    ...(userRole === "sales" || userRole === "admin" ? [{
      id: "orders",
      title: "Tạo đơn hàng mới",
      icon: <ShoppingCart size={32} className="text-white" />,
      desc: "Lên đơn bán lẻ vật tư, tính toán chi phí và theo dõi tình trạng đơn đặt hàng.",
      href: "/sales/orders",
      color: "bg-amber-500",
      shadow: "shadow-amber-500/20",
      gradient: "from-amber-400 to-orange-600",
    }] : []),
    ...(userRole === "sales" || userRole === "admin" ? [{
      id: "packages",
      title: "Bán gói sản phẩm",
      icon: <Receipt size={32} className="text-white" />,
      desc: "Lên đơn đăng ký gói dịch vụ thành viên, tạo hồ sơ hợp đồng lưu trữ.",
      href: "/sales/packages",
      color: "bg-rose-500",
      shadow: "shadow-rose-500/20",
      gradient: "from-rose-400 to-pink-600",
    }] : []),
    ...(userRole === "sales" || userRole === "admin" ? [{
      id: "legal-documents",
      title: "Văn bản pháp lý",
      icon: <Scale size={32} className="text-white" />,
      desc: "Hệ thống quy chế tài chính, văn bản hành chính và tài liệu nội bộ.",
      href: "/sales/legal-documents",
      color: "bg-blue-500",
      shadow: "shadow-blue-500/20",
      gradient: "from-blue-400 to-indigo-600",
    }] : [])
  ];

  return (
    <PageLayout title="Trung Tâm Bán Hàng" icon={<Presentation size={15} className="text-amber-500" />}>
      {/* ── Header ── */}
      <div className="mb-10 text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">Trung Tâm Bán Hàng</h1>
        <p className="text-gray-500 max-w-xl mx-auto">
          Tập hợp các nghiệp vụ bán hàng, tạo đơn hàng vật tư, kinh doanh gói thành viên và tài liệu quy định nội bộ do bộ phận quản lý.
        </p>
      </div>

      {/* ── Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto px-4 pb-12">
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
            Tài khoản của bạn chưa được phân quyền thao tác tính năng bán hàng.
          </div>
        )}
      </div>
    </PageLayout>
  );
}
