'use client';

import { LayoutDashboard, Crown, UserPlus, List, Search, HardDrive, DollarSign, MessageSquare, Clock, Scale } from 'lucide-react';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';

export default function MembershipHubPage() {
  const dashboards = [
    {
      id: 'legal',
      title: 'Văn bản pháp lý',
      icon: <Scale size={28} className="text-white" />,
      desc: 'Kho quy chế nội bộ, văn bản tài chính, chính sách & điều khoản.',
      href: '/sales/legal-documents',
      shadow: 'shadow-amber-500/20',
      gradient: 'from-amber-400 to-orange-600',
    },
    {
      id: 'membership',
      title: 'Hội viên',
      icon: <Crown size={28} className="text-white" />,
      desc: 'Dashboard tổng quan về dữ liệu và hoạt động của Hội viên.',
      href: '/membership',
      shadow: 'shadow-yellow-500/20',
      gradient: 'from-yellow-400 to-amber-600',
    },
    {
      id: 'register',
      title: 'Đăng ký HV mới',
      icon: <UserPlus size={28} className="text-white" />,
      desc: 'Form tạo mới và đăng ký hồ sơ cho Hội viên mới.',
      href: '/membership/register',
      shadow: 'shadow-lime-500/20',
      gradient: 'from-lime-400 to-green-600',
    },
    {
      id: 'list',
      title: 'Danh sách HV',
      icon: <List size={28} className="text-white" />,
      desc: 'Quản lý, tra cứu và hiển thị toàn bộ danh sách Hội viên.',
      href: '/membership/list',
      shadow: 'shadow-cyan-500/20',
      gradient: 'from-cyan-400 to-blue-600',
    },
    {
      id: 'lookup',
      title: 'Tra Cứu HV',
      icon: <Search size={28} className="text-white" />,
      desc: 'Tìm kiếm nhanh thông tin Hội viên qua số điện thoại hoặc mã.',
      href: '/membership/lookup',
      shadow: 'shadow-teal-500/20',
      gradient: 'from-teal-400 to-emerald-600',
    },
    {
      id: 'contracts',
      title: 'DS Hợp đồng',
      icon: <HardDrive size={28} className="text-white" />,
      desc: 'Quản lý kho tài liệu, hợp đồng lưu trữ trên Google Drive.',
      href: '/membership/contracts',
      shadow: 'shadow-indigo-500/20',
      gradient: 'from-indigo-400 to-violet-600',
    },
    {
      id: 'commission',
      title: 'Đối soát hoa hồng',
      icon: <DollarSign size={28} className="text-white" />,
      desc: 'Hệ thống báo cáo và thanh toán hoa hồng cho các hội viên/đại lý.',
      href: '/membership/commission',
      shadow: 'shadow-emerald-500/20',
      gradient: 'from-emerald-400 to-teal-500',
    },
    {
      id: 'support',
      title: 'Ticket Hỗ trợ',
      icon: <MessageSquare size={28} className="text-white" />,
      desc: 'Hệ thống tiếp nhận khiếu nại, hỗ trợ và xử lý yêu cầu KH.',
      href: '/customer-support',
      shadow: 'shadow-orange-500/20',
      gradient: 'from-orange-400 to-red-500',
    },
    {
      id: 'history',
      title: 'Lịch sử chăm sóc',
      icon: <Clock size={28} className="text-white" />,
      desc: 'Theo dõi nhật ký tiếp xúc, gọi điện và tương tác khách hàng.',
      href: '/care-history',
      shadow: 'shadow-pink-500/20',
      gradient: 'from-pink-400 to-rose-600',
    }
  ];

  return (
    <PageLayout title="Trung tâm CSKH Membership" icon={<Crown size={15} className="text-yellow-500" />}>
      {/* ── Header ── */}
      <div className="mb-10 text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">Trung Tâm CSKH Membership</h1>
        <p className="text-gray-500 max-w-xl mx-auto">
          Tất cả các chức năng liên quan đến chăm sóc khách hàng và quản lý tài khoản hội viên nay được gom về một nơi duy nhất để bạn dễ dàng tác nghiệp.
        </p>
      </div>

      {/* ── Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 mt-8 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto px-4 pb-12">
        {dashboards.map((card) => (
          <Link
            key={card.id}
            href={card.href}
            className={`group bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-xl ${card.shadow} hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 relative overflow-hidden flex flex-col`}
          >
            {/* Background decor */}
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${card.gradient} opacity-5 rounded-bl-[80px] transform group-hover:scale-110 transition-transform duration-500`}></div>
            
            <div className="relative z-10 flex-1 flex flex-col">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg mb-5 transform group-hover:scale-110 transition-transform duration-300`}>
                {card.icon}
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">{card.title}</h2>
              <p className="text-[13px] font-medium text-gray-500 leading-relaxed mb-6 flex-1">
                {card.desc}
              </p>
              
              <div className="flex items-center text-xs font-bold text-gray-400 group-hover:text-gray-800 transition-colors mt-auto">
                <span className="flex-1 uppercase tracking-wide">Truy cập</span>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center bg-gray-50 text-gray-400 group-hover:bg-gray-900 group-hover:text-white transition-all`}>
                  →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </PageLayout>
  );
}
