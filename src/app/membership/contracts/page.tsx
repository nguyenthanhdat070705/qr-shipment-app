'use client';

import { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import { FileText, ExternalLink, RefreshCw, HardDrive, User, CalendarDays, Search, Filter } from 'lucide-react';

interface ContractInfo {
  id: string;
  member_code: string;
  drive_link: string;
  created_time: string;
  full_name: string;
  status: string;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ContractInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchContracts();
  }, []);

  async function fetchContracts() {
    setRefreshing(true);
    try {
      const res = await fetch('/api/membership/contracts');
      const data = await res.json();
      if (data.contracts) {
        setContracts(data.contracts);
      }
    } catch (error) {
      console.error('Failed to fetch contracts', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-100 text-emerald-700 rounded-lg">Hoạt động</span>;
      case 'pending':
        return <span className="px-2.5 py-1 text-[11px] font-semibold bg-amber-100 text-amber-700 rounded-lg">Chờ duyệt</span>;
      case 'expired':
        return <span className="px-2.5 py-1 text-[11px] font-semibold bg-red-100 text-red-700 rounded-lg">Hết hạn</span>;
      default:
        return <span className="px-2.5 py-1 text-[11px] font-semibold bg-gray-100 text-gray-700 rounded-lg">Khác</span>;
    }
  };

  const filteredContracts = contracts.filter((c) => {
    const term = searchTerm.toLowerCase();
    const matchSearch = c.member_code?.toLowerCase().includes(term) || c.full_name?.toLowerCase().includes(term);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <PageLayout title="Danh sách hợp đồng" icon={<FileText size={18} className="text-blue-500" />}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col min-h-[calc(100vh-140px)] sm:h-[calc(100vh-140px)]">

        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                <HardDrive size={18} className="text-blue-500 sm:hidden" />
                <HardDrive size={20} className="text-blue-500 hidden sm:block" /> Đồng Bộ Google Drive
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-1">Danh sách folder hợp đồng được cập nhật tự động (Real-time) từ Drive của hệ thống.</p>
            </div>
            <button
              onClick={fetchContracts}
              disabled={refreshing}
              className="flex-shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs sm:text-sm font-semibold hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm mã HV, họ tên..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* Status Filter */}
            <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-xl px-2 w-full sm:w-auto">
              <Filter size={14} className="text-gray-400 ml-2 flex-shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-2 pr-6 py-2 bg-transparent text-sm text-gray-700 focus:outline-none appearance-none cursor-pointer w-full"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Hoạt động</option>
                <option value="pending">Chờ duyệt</option>
                <option value="expired">Hết hạn</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-3 sm:p-6 bg-gray-50/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[40vh] text-gray-400 gap-3">
              <RefreshCw size={24} className="animate-spin text-blue-500" />
              <p className="text-sm">Đang tải cấu trúc thư mục từ Google Drive...</p>
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[40vh] text-gray-400 gap-3">
              <HardDrive size={40} className="text-gray-300" />
              <p className="text-sm text-center px-4">{contracts.length === 0 ? 'Chưa có thư mục hợp đồng nào trên Drive.' : 'Không tìm thấy hợp đồng nào phù hợp.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredContracts.map(contract => (
                <div key={contract.id} className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow group">
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center bg-blue-50 text-blue-500 rounded-xl group-hover:scale-110 transition-transform flex-shrink-0">
                        <FileText size={18} className="sm:hidden" />
                        <FileText size={20} className="hidden sm:block" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{contract.member_code}</p>
                        <p className="text-[10px] text-gray-400 font-mono truncate">ID: {contract.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">{getStatusBadge(contract.status)}</div>
                  </div>

                  <div className="space-y-2 mb-4 flex-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="font-semibold truncate">{contract.full_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <CalendarDays size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">{new Date(contract.created_time).toLocaleString('vi-VN')}</span>
                    </div>
                  </div>

                  <a
                    href={contract.drive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 text-gray-600 rounded-xl text-sm font-semibold transition-colors"
                  >
                    Xem Hợp Đồng <ExternalLink size={14} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
