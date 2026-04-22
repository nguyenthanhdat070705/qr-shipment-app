'use client';

import React, { useState } from 'react';
import PageLayout from '@/components/PageLayout';
import { MessageSquare, Plus, Search, Filter, Clock, CheckCircle2, AlertCircle, User, Phone, MoreHorizontal } from 'lucide-react';

interface Ticket {
  id: string;
  customer: string;
  phone: string;
  title: string;
  status: 'open' | 'progress' | 'resolved';
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
}

const mockTickets: Ticket[] = [
  { id: 'TK-1001', customer: 'Nguyễn Văn A', phone: '0901234567', title: 'Máy có mùi khó chịu sau 2 ngày', status: 'open', priority: 'high', createdAt: '2026-04-22T08:30:00' },
  { id: 'TK-1002', customer: 'Trần Thị B', phone: '0987654321', title: 'Yêu cầu đổi gói dịch vụ', status: 'progress', priority: 'medium', createdAt: '2026-04-21T14:15:00' },
  { id: 'TK-1003', customer: 'Lê Văn C', phone: '0912345678', title: 'Xác nhận lại kích thước quan tài gỗ xà cừ', status: 'resolved', priority: 'low', createdAt: '2026-04-20T09:45:00' },
  { id: 'TK-1004', customer: 'Phạm Thị D', phone: '0934567890', title: 'Chậm trễ trong quá trình giao hàng', status: 'progress', priority: 'high', createdAt: '2026-04-22T10:05:00' },
];

export default function CustomerSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  const [search, setSearch] = useState('');

  const filteredTickets = tickets.filter(t => 
    t.customer.toLowerCase().includes(search.toLowerCase()) || 
    t.phone.includes(search) || 
    t.id.toLowerCase().includes(search.toLowerCase())
  );

  const openTickets = filteredTickets.filter(t => t.status === 'open');
  const progressTickets = filteredTickets.filter(t => t.status === 'progress');
  const resolvedTickets = filteredTickets.filter(t => t.status === 'resolved');

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'high': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const TicketCard = ({ ticket }: { ticket: Ticket }) => (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative group">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-bold text-gray-400">{ticket.id}</span>
        <button className="text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal size={16} />
        </button>
      </div>
      <h4 className="text-sm font-bold text-gray-800 leading-tight mb-3 line-clamp-2">{ticket.title}</h4>
      
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <User size={12} className="text-gray-400" />
          <span className="font-medium">{ticket.customer}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Phone size={12} className="text-gray-400" />
          <span>{ticket.phone}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPriorityColor(ticket.priority)}`}>
          {ticket.priority.toUpperCase()}
        </span>
        <div className="flex items-center gap-1 text-[10px] font-medium text-gray-400">
          <Clock size={10} />
          {new Date(ticket.createdAt).toLocaleDateString('vi-VN')}
        </div>
      </div>
    </div>
  );

  return (
    <PageLayout title="Ticket Hỗ trợ" icon={<MessageSquare size={20} className="text-orange-500" />}>
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Tìm mã ticket, tên KH, sđt..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 w-64 lg:w-80 shadow-sm"
            />
          </div>
          <button className="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-orange-600 transition-colors shadow-sm">
            <Filter size={18} />
          </button>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-sm rounded-xl hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-500/20 active:scale-95 transition-all">
          <Plus size={16} />
          <span>Tạo Ticket Mới</span>
        </button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Column 1: Open */}
        <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 min-h-[500px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-500" />
              Mới tiếp nhận
            </h3>
            <span className="h-6 w-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold">
              {openTickets.length}
            </span>
          </div>
          <div className="space-y-4">
            {openTickets.map(t => <TicketCard key={t.id} ticket={t} />)}
            {openTickets.length === 0 && <p className="text-xs text-center text-gray-400 py-4 border-2 border-dashed border-gray-200 rounded-xl">Không có ticket nào</p>}
          </div>
        </div>

        {/* Column 2: In Progress */}
        <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 min-h-[500px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
              <Clock size={16} className="text-amber-500" />
              Đang xử lý
            </h3>
            <span className="h-6 w-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
              {progressTickets.length}
            </span>
          </div>
          <div className="space-y-4">
            {progressTickets.map(t => <TicketCard key={t.id} ticket={t} />)}
            {progressTickets.length === 0 && <p className="text-xs text-center text-gray-400 py-4 border-2 border-dashed border-gray-200 rounded-xl">Không có ticket nào</p>}
          </div>
        </div>

        {/* Column 3: Resolved */}
        <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 min-h-[500px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              Đã giải quyết
            </h3>
            <span className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
              {resolvedTickets.length}
            </span>
          </div>
          <div className="space-y-4">
            {resolvedTickets.map(t => <TicketCard key={t.id} ticket={t} />)}
            {resolvedTickets.length === 0 && <p className="text-xs text-center text-gray-400 py-4 border-2 border-dashed border-gray-200 rounded-xl">Không có ticket nào</p>}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
