'use client';

import React, { useState } from 'react';
import PageLayout from '@/components/PageLayout';
import { Clock, PhoneCall, MessageCircle, Mail, Search, FileText, ArrowRight, UserCheck, Calendar } from 'lucide-react';

interface HistoryRecord {
  id: string;
  customer: string;
  phone: string;
  type: 'call' | 'zns' | 'sms' | 'meeting';
  content: string;
  staff: string;
  createdAt: string;
}

const mockHistory: HistoryRecord[] = [
  { id: '1', customer: 'Nguyễn Văn A', phone: '0901234567', type: 'call', content: 'Gọi điện tư vấn gói dịch vụ Hội Viên Kim Cương. Khách hàng đang cân nhắc.', staff: 'Lê Sales', createdAt: '2026-04-22T09:15:00' },
  { id: '2', customer: 'Trần Thị B', phone: '0987654321', type: 'zns', content: 'Hệ thống tự động gửi tin nhắn ZNS xác nhận đơn hàng quan tài gỗ Đài Loan.', staff: 'Hệ thống', createdAt: '2026-04-22T08:30:00' },
  { id: '3', customer: 'Lê Văn C', phone: '0912345678', type: 'meeting', content: 'Khách đến văn phòng lấy hợp đồng. Đã tiếp đón và bàn giao đầy đủ.', staff: 'Trần Lễ Tân', createdAt: '2026-04-21T15:00:00' },
  { id: '4', customer: 'Phạm Thị D', phone: '0934567890', type: 'sms', content: 'Gửi SMS thông báo nhắc nhở thanh toán đợt 2.', staff: 'Hệ thống', createdAt: '2026-04-21T09:00:00' },
  { id: '5', customer: 'Hoàng Văn E', phone: '0977777777', type: 'call', content: 'Gọi hỏi thăm tình hình khách hàng sau lễ cúng 49 ngày.', staff: 'Phạm CSKH', createdAt: '2026-04-20T10:30:00' },
];

export default function CareHistoryPage() {
  const [history, setHistory] = useState<HistoryRecord[]>(mockHistory);
  const [search, setSearch] = useState('');

  const filteredHistory = history.filter(h => 
    h.customer.toLowerCase().includes(search.toLowerCase()) || 
    h.phone.includes(search) || 
    h.content.toLowerCase().includes(search.toLowerCase())
  );

  const getIconForType = (type: string) => {
    switch(type) {
      case 'call': return { icon: <PhoneCall size={18} />, color: 'bg-blue-100 text-blue-600 border-blue-200' };
      case 'zns': return { icon: <MessageCircle size={18} />, color: 'bg-sky-100 text-sky-600 border-sky-200' };
      case 'sms': return { icon: <Mail size={18} />, color: 'bg-indigo-100 text-indigo-600 border-indigo-200' };
      case 'meeting': return { icon: <UserCheck size={18} />, color: 'bg-emerald-100 text-emerald-600 border-emerald-200' };
      default: return { icon: <FileText size={18} />, color: 'bg-gray-100 text-gray-600 border-gray-200' };
    }
  };

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'call': return 'Cuộc gọi';
      case 'zns': return 'Zalo ZNS';
      case 'sms': return 'Tin nhắn SMS';
      case 'meeting': return 'Gặp mặt trực tiếp';
      default: return 'Khác';
    }
  };

  return (
    <PageLayout title="Lịch sử chăm sóc" icon={<Clock size={20} className="text-pink-500" />}>
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-8">
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Tra cứu theo tên KH, SĐT, nội dung..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 shadow-sm"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold text-sm rounded-xl hover:bg-gray-50 shadow-sm transition-colors">
            <Calendar size={16} />
            Hôm nay
          </button>
          <button className="flex-1 md:flex-none px-4 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold text-sm rounded-xl hover:from-pink-600 hover:to-rose-600 shadow-md shadow-pink-500/20 active:scale-95 transition-all">
            Xuất Excel
          </button>
        </div>
      </div>

      {/* Timeline Layout */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-8">
        <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bgGradient-to-b before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
          
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto text-gray-300 mb-3" size={32} />
              <p className="text-gray-500 font-medium">Không tìm thấy lịch sử tương tác nào.</p>
            </div>
          ) : (
            filteredHistory.map((item, i) => {
              const { icon, color } = getIconForType(item.type);
              const label = getTypeLabel(item.type);
              const isEven = i % 2 === 0;

              return (
                <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group md:mb-8 mb-6 last:mb-0">
                  {/* Icon */}
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${color}`}>
                    {icon}
                  </div>

                  {/* Card Main */}
                  <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-300 transition-colors shadow-sm ml-4 md:ml-0 hover:shadow-md">
                    <div className="flex flex-wrap shadow-none justify-between items-start gap-2 mb-2">
                       <div>
                         <h4 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                           {item.customer}
                           <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">{item.phone}</span>
                         </h4>
                         <span className="text-xs text-gray-400 block mt-0.5">{label}</span>
                       </div>
                       <div className="text-right">
                         <span className="text-xs font-semibold text-gray-600 flex items-center gap-1"><Clock size={10}/> {new Date(item.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>
                         <span className="text-[10px] text-gray-400 block">{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
                       </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 leading-relaxed bg-gray-50/50 p-3 rounded-lg border border-gray-50 border-l-2 border-l-pink-400">
                        {item.content}
                      </p>
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                      <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md flex items-center gap-1">
                        <UserCheck size={12} className="text-gray-400"/> Nhân viên: <strong className="text-gray-700">{item.staff}</strong>
                      </span>
                      <button className="text-pink-500 hover:text-pink-600 text-xs font-bold flex items-center gap-1 group/btn">
                        Chi tiết <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </PageLayout>
  );
}
