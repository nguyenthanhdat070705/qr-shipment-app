'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, Plus, ArrowLeft, Search, Eye, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import DataTable from '@/components/DataTable';

interface Stocktake {
  id: string;
  stocktake_code: string;
  warehouse_name: string;
  status: string;
  stocktake_date: string;
  created_by: string;
}

export default function StocktakePage() {
  const router = useRouter();
  const [stocktakes, setStocktakes] = useState<Stocktake[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [userRole, setUserRole] = useState<string>('sales');
  const [userWarehouse, setUserWarehouse] = useState<string>('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem("auth_user");
      if (raw) {
        const u = JSON.parse(raw);
        setUserRole(u.role || 'sales');
        setUserWarehouse(u.warehouse_name || '');
      }
    } catch { /* ignore */ }
  }, []);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStocktakes();
  }, [userWarehouse]);

  const fetchStocktakes = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = userWarehouse ? `/api/stocktakes?warehouse=${encodeURIComponent(userWarehouse)}` : '/api/stocktakes';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setStocktakes(json.data || []);
      } else {
        console.warn('[stocktake] API error:', json.error);
        setError(json.error || 'Lỗi tải dữ liệu kiểm kho.');
        setStocktakes([]);
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối server.');
      setStocktakes([]);
    } finally {
      setLoading(false);
    }
  };

  const createStocktake = async () => {
    if (!userWarehouse && userRole !== 'admin') {
      alert("Bạn chưa được phân quyền kho, không thể tạo phiếu kiểm kho.");
      return;
    }
    
    // For admin without a specific warehouse, we might need a modal to select warehouse.
    // For simplicity, if admin has no warehouse, use a default or ask.
    let targetWarehouse = userWarehouse;
    if (!targetWarehouse) {
      const input = prompt("Nhập tên kho cần kiểm kê:");
      if (!input) return;
      targetWarehouse = input;
    }

    try {
      setCreating(true);
      const res = await fetch('/api/stocktakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_name: targetWarehouse,
          created_by: 'system', // Ideally from auth
          note: 'Kiểm kê định kỳ'
        })
      });
      const json = await res.json();
      if (json.success) {
        router.push(`/stocktake/${json.data.id}`);
      } else {
        alert("Lỗi: " + json.error);
      }
    } catch (err) {
      alert("Lỗi kết nối");
    } finally {
      setCreating(false);
    }
  };

  const columns = [
    {
      key: 'stocktake_code',
      label: 'Mã phiếu',
      sortable: true,
      render: (row: Stocktake) => (
        <span className="font-mono font-bold text-pink-700">{row.stocktake_code}</span>
      ),
    },
    {
      key: 'warehouse_name',
      label: 'Kho kiểm kê',
      sortable: true,
    },
    {
      key: 'stocktake_date',
      label: 'Ngày kiểm',
      sortable: true,
      render: (row: Stocktake) => new Date(row.stocktake_date).toLocaleDateString('vi-VN'),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      sortable: true,
      render: (row: Stocktake) => (
        <span className={`px-2 py-1 rounded-md text-xs font-bold ${
          row.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {row.status === 'completed' ? 'Đã chốt' : 'Đang kiểm'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Thao tác',
      render: (row: Stocktake) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/stocktake/${row.id}`);
          }}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-pink-100 text-gray-700 hover:text-pink-700 text-xs font-bold transition-colors"
        >
          <Eye size={14} />
          {row.status === 'completed' ? 'Xem lại' : 'Tiếp tục kiểm'}
        </button>
      ),
    }
  ];

  return (
    <PageLayout title="Kiểm kho" icon={<ClipboardCheck size={15} className="text-pink-500" />}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/warehouse-hub" 
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 transition-colors shadow-sm"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Quản lý Kiểm kho</h1>
            <p className="text-sm text-gray-500 mt-0.5">Đối chiếu số lượng thực tế với hệ thống</p>
          </div>
        </div>
        
        <button
          onClick={createStocktake}
          disabled={creating}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-pink-600 hover:bg-pink-700 disabled:bg-pink-300 text-white rounded-xl font-bold shadow-md shadow-pink-500/20 transition-all active:scale-95"
        >
          {creating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Plus size={18} />}
          Bắt đầu kiểm kho
        </button>
      </div>

      {error && (
        <div className="mb-6 px-5 py-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
          {error}
          <button 
            onClick={fetchStocktakes} 
            className="ml-auto px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold transition-colors"
          >
            Thử lại
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 mb-6">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-pink-200 border-t-pink-600"></div>
          </div>
        ) : (
          <DataTable
            data={stocktakes as any[]}
            columns={columns as any}
            searchPlaceholder="Tìm kiếm mã phiếu, kho..."
            onRowClick={(row: any) => router.push(`/stocktake/${row.id}`)}
            emptyMessage={
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <AlertCircle size={40} className="text-gray-300 mb-3" />
                <p className="mb-4">Chưa có phiếu kiểm kho nào.</p>
                <button
                  onClick={createStocktake}
                  disabled={creating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-pink-600 hover:bg-pink-700 disabled:bg-pink-300 text-white rounded-xl font-bold shadow-md shadow-pink-500/20 transition-all active:scale-95"
                >
                  <Plus size={18} />
                  Bắt đầu kiểm kho
                </button>
              </div>
            }
          />
        )}
      </div>
    </PageLayout>
  );
}
