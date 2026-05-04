'use client';

import { useState, useEffect } from 'react';
import { LayoutDashboard, BarChart3, Warehouse, ShoppingCart, BookOpen } from 'lucide-react';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import { getUserRole, UserRole } from '@/config/roles.config';

export default function DashboardsHubPage() {
  const [userRole, setUserRole] = useState<UserRole>('sales');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        setUserRole(getUserRole(u.email || ''));
      }
    } catch { /* ignore */ }
  }, []);

  const dashboards = [
    ...(userRole === 'admin' ? [{
      id: 'admin',
      title: 'Admin Dashboard',
      icon: <BarChart3 size={32} className="text-white" />,
      desc: 'Tổng quan toàn hệ thống kinh doanh, kho vận, tài chính...',
      href: '/admin',
      color: 'bg-red-500',
      shadow: 'shadow-red-500/20',
      gradient: 'from-red-400 to-rose-600',
    }] : []),
    ...(userRole === 'admin' || userRole === 'warehouse' ? [{
      id: 'warehouse',
      title: 'Dashboard Kho',
      icon: <Warehouse size={28} className="text-white" />,
      desc: 'Theo dõi tồn kho, xuất nhập, giá trị hàng hóa hiện tại...',
      href: '/warehouse',
      color: 'bg-emerald-500',
      shadow: 'shadow-emerald-500/20',
      gradient: 'from-emerald-400 to-teal-600',
    }] : []),
    ...(userRole === 'admin' || userRole === 'sales' ? [{
      id: 'sales',
      title: 'Dashboard Bán Hàng',
      icon: <ShoppingCart size={28} className="text-white" />,
      desc: 'Hiệu suất bán hàng, đơn giá trị, trạng thái vận chuyển...',
      href: '/sales',
      color: 'bg-blue-500',
      shadow: 'shadow-blue-500/20',
      gradient: 'from-blue-400 to-indigo-600',
    }] : []),
    ...(userRole === 'admin' || userRole === 'sales' || userRole === 'operations' ? [{
      id: 'funerals',
      title: 'Dashboard Đám',
      icon: <BookOpen size={28} className="text-white" />,
      desc: 'Tiến độ thực hiện đám, biểu đồ Gantt, phân bổ nhân sự...',
      href: '/funerals/dashboard',
      color: 'bg-pink-500',
      shadow: 'shadow-pink-500/20',
      gradient: 'from-pink-400 to-fuchsia-600',
    }] : [])
  ];

  return (
    <PageLayout title="Trung Tâm Dashboards" icon={<LayoutDashboard size={15} className="text-indigo-500" />}>
      {/* ── Header ── */}
      <div className="mb-10 text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">Trung Tâm Dashboard Quản Trị</h1>
        <p className="text-gray-500 max-w-xl mx-auto">
          Chọn một báo cáo bên dưới để tra cứu số liệu hoạt động, tiến độ nghiệp vụ của từng bộ phận chuyên trách.
        </p>
      </div>

      {/* ── Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 mt-8 lg:grid-cols-2 xl:grid-cols-2 gap-6 max-w-5xl mx-auto px-4 pb-12">
        {dashboards.map((card) => (
          <Link
            key={card.id}
            href={card.href}
            className={`group bg-white p-6 sm:p-8 rounded-[2rem] border border-gray-100 shadow-xl ${card.shadow} hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 relative overflow-hidden`}
          >
            {/* Background decor */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${card.gradient} opacity-5 rounded-bl-[100px] transform group-hover:scale-110 transition-transform duration-500`}></div>
            
            <div className="relative z-10">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg mb-6 transform group-hover:rotate-6 transition-transform duration-300`}>
                {card.icon}
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{card.title}</h2>
              <p className="text-sm font-medium text-gray-500 leading-relaxed mb-6">
                {card.desc}
              </p>
              
              <div className="flex items-center text-sm font-bold text-gray-400 group-hover:text-gray-700 transition-colors">
                <span className="flex-1">Xem chi tiết</span>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 text-gray-400 group-hover:bg-gray-900 group-hover:text-white transition-all`}>
                  →
                </span>
              </div>
            </div>
          </Link>
        ))}
        {dashboards.length === 0 && (
          <div className="col-span-1 border border-gray-200 rounded-2xl p-8 text-center text-gray-500">
            Tài khoản của bạn chưa được phân quyền xem Dashboard nào.
          </div>
        )}
      </div>
    </PageLayout>
  );
}
