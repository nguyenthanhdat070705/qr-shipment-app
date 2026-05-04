'use client';

import { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import { Crown, DollarSign, Download, Check, Clock, TrendingUp, Filter } from 'lucide-react';

interface CommissionRecord {
  id: string;
  member_id: string;
  member_code: string;
  member_name: string;
  sales_name: string;
  service_package: string;
  deal_value: number;
  commission_rate: number;
  commission_amount: number;
  status: string; // pending | confirmed | paid
  deal_date: string;
  paid_date: string | null;
  approved_by: string | null;
  created_at: string;
}

const packageLabels: Record<string, string> = {
  tieu_chuan: 'Tiêu Chuẩn',
  cao_cap: 'Cao Cấp',
  dac_biet: 'Đặc Biệt',
  gia_dinh: 'Gia Đình',
};

export default function CommissionPage() {
  const [records, setRecords] = useState<CommissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'paid'>('all');
  const [monthFilter, setMonthFilter] = useState('');

  useEffect(() => {
    fetchCommissions();
  }, []);

  async function fetchCommissions() {
    try {
      const res = await fetch('/api/membership/commission');
      const data = await res.json();
      setRecords(data.records || []);
    } catch (err) {
      console.error('Failed to load commissions:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(id: string) {
    try {
      await fetch('/api/membership/commission', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'confirm' }),
      });
      fetchCommissions();
    } catch (err) {
      console.error('Confirm failed:', err);
    }
  }

  async function handleMarkPaid(id: string) {
    try {
      await fetch('/api/membership/commission', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'pay' }),
      });
      fetchCommissions();
    } catch (err) {
      console.error('Pay failed:', err);
    }
  }

  function exportExcel() {
    const filtered = getFiltered();
    const headers = ['Mã HV', 'Tên KH', 'Sales', 'Gói DV', 'Giá trị HĐ', '% HH', 'Số tiền HH', 'Trạng thái', 'Ngày Deal', 'Ngày TT'];
    const rows = filtered.map(r => [
      r.member_code, r.member_name, r.sales_name,
      packageLabels[r.service_package] || r.service_package,
      r.deal_value, r.commission_rate, r.commission_amount,
      r.status === 'paid' ? 'Đã TT' : r.status === 'confirmed' ? 'Đã duyệt' : 'Chờ duyệt',
      r.deal_date, r.paid_date || ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doi-soat-hoa-hong-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function getFiltered() {
    return records.filter(r => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (monthFilter && r.deal_date && !r.deal_date.startsWith(monthFilter)) return false;
      return true;
    });
  }

  const filtered = getFiltered();
  const totalCommission = filtered.reduce((s, r) => s + (r.commission_amount || 0), 0);
  const pendingCount = records.filter(r => r.status === 'pending').length;
  const confirmedCount = records.filter(r => r.status === 'confirmed').length;
  const paidTotal = records.filter(r => r.status === 'paid').reduce((s, r) => s + (r.commission_amount || 0), 0);

  return (
    <PageLayout title="Đối soát hoa hồng" icon={<DollarSign size={18} className="text-emerald-500" />}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Đối Soát & Thanh Toán Hoa Hồng</h1>
            <p className="text-sm text-gray-500">{filtered.length} bản ghi</p>
          </div>
          <button onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
            <Download size={15} /> Xuất Excel
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500 mb-2"><TrendingUp size={20} /></div>
            <p className="text-2xl font-extrabold text-gray-900">{loading ? '—' : new Intl.NumberFormat('vi-VN').format(totalCommission)}đ</p>
            <p className="text-xs font-semibold text-gray-500">Tổng HH hiển thị</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 mb-2"><Clock size={20} /></div>
            <p className="text-2xl font-extrabold text-gray-900">{loading ? '—' : pendingCount}</p>
            <p className="text-xs font-semibold text-gray-500">Chờ duyệt</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-500 mb-2"><Check size={20} /></div>
            <p className="text-2xl font-extrabold text-gray-900">{loading ? '—' : confirmedCount}</p>
            <p className="text-xs font-semibold text-gray-500">Đã duyệt, chờ TT</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500 mb-2"><DollarSign size={20} /></div>
            <p className="text-2xl font-extrabold text-gray-900">{loading ? '—' : new Intl.NumberFormat('vi-VN').format(paidTotal)}đ</p>
            <p className="text-xs font-semibold text-gray-500">Đã thanh toán</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1 text-sm text-gray-500"><Filter size={14} /> Lọc:</div>
          {(['all', 'pending', 'confirmed', 'paid'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filter === s ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              {s === 'all' ? 'Tất cả' : s === 'pending' ? 'Chờ duyệt' : s === 'confirmed' ? 'Đã duyệt' : 'Đã TT'}
            </button>
          ))}
          <input type="month" className="ml-auto px-3 py-1.5 rounded-lg border border-gray-200 text-xs"
            value={monthFilter} onChange={e => setMonthFilter(e.target.value)} />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Mã HV</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Khách hàng</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Sales</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Gói</th>
                  <th className="text-right px-4 py-3 font-bold text-gray-600 text-xs uppercase">Giá trị HĐ</th>
                  <th className="text-center px-4 py-3 font-bold text-gray-600 text-xs uppercase">%</th>
                  <th className="text-right px-4 py-3 font-bold text-gray-600 text-xs uppercase">Hoa hồng</th>
                  <th className="text-center px-4 py-3 font-bold text-gray-600 text-xs uppercase">Trạng thái</th>
                  <th className="text-center px-4 py-3 font-bold text-gray-600 text-xs uppercase">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={9} className="py-16 text-center text-gray-400">Đang tải...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="py-16 text-center text-gray-400">
                    <DollarSign size={28} className="mx-auto mb-2 text-gray-300" />
                    Chưa có dữ liệu hoa hồng
                  </td></tr>
                ) : (
                  filtered.map(r => {
                    const stCls = r.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : r.status === 'confirmed' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700';
                    const stLabel = r.status === 'paid' ? 'Đã TT' : r.status === 'confirmed' ? 'Đã duyệt' : 'Chờ duyệt';
                    return (
                      <tr key={r.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.member_code}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{r.member_name}</td>
                        <td className="px-4 py-3 text-gray-600">{r.sales_name}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{packageLabels[r.service_package] || r.service_package}</td>
                        <td className="px-4 py-3 text-right text-gray-700 font-mono">{new Intl.NumberFormat('vi-VN').format(r.deal_value)}đ</td>
                        <td className="px-4 py-3 text-center font-bold text-gray-700">{r.commission_rate}%</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600 font-mono">{new Intl.NumberFormat('vi-VN').format(r.commission_amount)}đ</td>
                        <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${stCls}`}>{stLabel}</span></td>
                        <td className="px-4 py-3 text-center">
                          {r.status === 'pending' && (
                            <button onClick={() => handleConfirm(r.id)} className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[11px] font-semibold hover:bg-indigo-100 transition-colors">
                              ✓ Duyệt
                            </button>
                          )}
                          {r.status === 'confirmed' && (
                            <button onClick={() => handleMarkPaid(r.id)} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[11px] font-semibold hover:bg-emerald-100 transition-colors">
                              💰 Thanh toán
                            </button>
                          )}
                          {r.status === 'paid' && (
                            <span className="text-xs text-gray-400">{r.paid_date ? new Date(r.paid_date).toLocaleDateString('vi-VN') : '—'}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <td colSpan={6} className="px-4 py-3 text-right font-bold text-gray-700 text-sm">Tổng cộng:</td>
                    <td className="px-4 py-3 text-right font-extrabold text-emerald-700 text-sm font-mono">{new Intl.NumberFormat('vi-VN').format(totalCommission)}đ</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
