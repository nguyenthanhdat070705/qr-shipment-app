'use client';

import { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import Link from 'next/link';
import { Crown, UserPlus, Users, TrendingUp, Search, Calendar, Phone, ChevronRight } from 'lucide-react';

interface MemberSummary {
  id: string;
  member_code: string;
  full_name: string;
  phone: string;
  status: string;
  registered_date: string;
  expiry_date: string;
}

export default function MembershipDashboard() {
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0, pending: 0 });
  const [recentMembers, setRecentMembers] = useState<MemberSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/membership/stats');
        const data = await res.json();
        if (data.stats) setStats(data.stats);
        if (data.recent) setRecentMembers(data.recent);
      } catch (err) {
        console.error('Failed to load membership data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const statCards = [
    { label: 'Tổng hội viên', value: stats.total, icon: <Users size={22} />, color: 'from-blue-500 to-indigo-600', iconBg: 'bg-blue-500/15' },
    { label: 'Đang hoạt động', value: stats.active, icon: <Crown size={22} />, color: 'from-emerald-500 to-teal-600', iconBg: 'bg-emerald-500/15' },
    { label: 'Chờ duyệt', value: stats.pending, icon: <TrendingUp size={22} />, color: 'from-amber-500 to-orange-600', iconBg: 'bg-amber-500/15' },
    { label: 'Hết hạn', value: stats.expired, icon: <Calendar size={22} />, color: 'from-red-400 to-rose-600', iconBg: 'bg-red-500/15' },
  ];

  return (
    <PageLayout title="Hội viên" icon={<Crown size={18} className="text-yellow-500" />}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Hội Viên Trăm Tuổi</h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý chương trình hội viên — Phí 2,000,000đ / 10 năm</p>
          </div>
          <Link
            href="/membership/register"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
          >
            <UserPlus size={16} />
            Đăng ký HV mới
          </Link>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg} text-gray-600`}>
                  {card.icon}
                </div>
              </div>
              <p className="text-3xl font-extrabold text-gray-900">
                {loading ? '—' : card.value}
              </p>
              <p className="text-xs font-semibold text-gray-500 mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/membership/register" className="group bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-yellow-200 transition-all">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 text-yellow-600 group-hover:scale-110 transition-transform">
                <UserPlus size={22} />
              </div>
              <div>
                <p className="font-bold text-gray-800">Đăng ký HV mới</p>
                <p className="text-xs text-gray-500">Nhập thông tin khách hàng</p>
              </div>
              <ChevronRight size={18} className="ml-auto text-gray-300 group-hover:text-yellow-500 transition-colors" />
            </div>
          </Link>

          <Link href="/membership/list" className="group bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-cyan-200 transition-all">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600 group-hover:scale-110 transition-transform">
                <Search size={22} />
              </div>
              <div>
                <p className="font-bold text-gray-800">Tra cứu HV</p>
                <p className="text-xs text-gray-500">Tìm theo SĐT, CCCD, tên</p>
              </div>
              <ChevronRight size={18} className="ml-auto text-gray-300 group-hover:text-cyan-500 transition-colors" />
            </div>
          </Link>

          <div className="bg-gradient-to-br from-[#1B2A4A] to-indigo-800 rounded-2xl p-5 text-white">
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Quyền lợi chiết khấu</p>
            <div className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-white/70">0–60 ngày</span><span className="font-bold">0%</span></div>
              <div className="flex justify-between"><span className="text-white/70">60 ngày–1 năm</span><span className="font-bold text-emerald-300">5%</span></div>
              <div className="flex justify-between"><span className="text-white/70">1–3 năm</span><span className="font-bold text-emerald-300">7%</span></div>
              <div className="flex justify-between"><span className="text-white/70">Trên 3 năm</span><span className="font-bold text-yellow-300">10%</span></div>
            </div>
            <p className="text-[10px] text-white/40 mt-2">+ Khấu trừ phí HV 2,000,000đ</p>
          </div>
        </div>

        {/* Recent Members */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">Hội viên gần đây</h2>
            <Link href="/membership/list" className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
              Xem tất cả →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              <div className="py-12 text-center text-gray-400 text-sm">Đang tải...</div>
            ) : recentMembers.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                <Crown size={32} className="mx-auto mb-2 text-gray-300" />
                Chưa có hội viên nào
              </div>
            ) : (
              recentMembers.map((m) => (
                <div key={m.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-white font-bold text-sm flex-shrink-0">
                    {m.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{m.full_name}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Phone size={10} />{m.phone || m.member_code}</span>
                      <span>{new Date(m.registered_date).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                    m.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    m.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {m.status === 'active' ? 'Hoạt động' : m.status === 'pending' ? 'Chờ duyệt' : 'Hết hạn'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
