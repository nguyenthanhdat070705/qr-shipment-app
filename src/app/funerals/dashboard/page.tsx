'use client';

import { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Calendar, AlertCircle, TrendingUp, BookOpen, Clock, Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import GanttChart from '@/components/GanttChart';

function parseDateStr(dateStr: string) {
  if (!dateStr || dateStr === '—') return null;
  // Giả sử định dạng là dd/mm/yyyy
  const parts = dateStr.toString().trim().split('/');
  if (parts.length === 3) {
    const d = Number(parts[0]?.trim());
    const m = Number(parts[1]?.trim()) - 1;
    const y = Number(parts[2]?.trim());
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
      return new Date(y, m, d);
    }
  }
  return null;
}

export default function FuneralsDashboardPage() {
  const [funerals, setFunerals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFunerals() {
      try {
        const response = await fetch('/api/funerals');
        if (response.ok) {
          const json = await response.json();
          setFunerals(json.data || []);
        }
      } catch (err) {
        console.error('Lỗi lấy dữ liệu Đám:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchFunerals();
  }, []);

  // Xử lý dữ liệu cho Gantt Chart
  const ganttData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return funerals
      .filter(f => f.ma_dam && f.ngay_liem && f.ngay_di_quan && f.ngay_liem !== '—' && f.ngay_di_quan !== '—')
      .map(f => {
        let start = parseDateStr(f.ngay_liem);
        let end = parseDateStr(f.ngay_di_quan);
        
        let status = 'Đang thực hiện';
        let progress = 50;
        let colorClass = 'bg-blue-500';
        let statusBadge = 'bg-blue-100 text-blue-700';

        if (start && end) {
          if (end < today) {
            status = 'Hoàn thành';
            progress = 100;
            colorClass = 'bg-emerald-500';
            statusBadge = 'bg-emerald-100 text-emerald-700';
          } else if (start > today) {
            status = 'Chờ thực hiện';
            progress = 0;
            colorClass = 'bg-amber-400';
            statusBadge = 'bg-amber-100 text-amber-700';
          } else {
            // Đang diễn ra
            const totalDuration = end.getTime() - start.getTime();
            const elapsed = today.getTime() - start.getTime();
            progress = totalDuration > 0 ? Math.min(100, Math.max(10, Math.round((elapsed / totalDuration) * 100))) : 50;
          }
        }

        return {
          ...f,
          startDate: start,
          endDate: end,
          status,
          progress,
          colorClass,
          statusBadge,
        };
      })
      .filter(f => f.startDate && f.endDate && !isNaN(f.startDate.getTime()) && !isNaN(f.endDate.getTime()))
      // Sắp xếp: Đang diễn ra trước, sau đó là chờ, rồi mới hoàn thành
      .sort((a, b) => {
         if (a.status !== b.status) {
            if (a.status === 'Đang thực hiện') return -1;
            if (b.status === 'Đang thực hiện') return 1;
            if (a.status === 'Chờ thực hiện') return -1;
            if (b.status === 'Chờ thực hiện') return 1;
         }
         return b.startDate!.getTime() - a.startDate!.getTime();
      });
  }, [funerals]);

  // Sinh các ngày để tạo grid (Trục thời gian)
  const timelineDays = useMemo(() => {
    if (ganttData.length === 0) return [];
    
    // Tìm ngày Min và Max
    const minD = new Date(Math.min(...ganttData.map(d => d.startDate!.getTime())));
    const maxD = new Date(Math.max(...ganttData.map(d => d.endDate!.getTime())));
    
    // Mở rộng range ra trước 3 ngày và sau 7 ngày để dễ nhìn
    minD.setDate(minD.getDate() - 2);
    maxD.setDate(maxD.getDate() + 5);

    // Limit to reasonable number to prevent huge renders
    let iterDate = new Date(minD);
    const arr = [];
    while (iterDate <= maxD && arr.length < 60) { // max 60 ngày
      arr.push(new Date(iterDate));
      iterDate.setDate(iterDate.getDate() + 1);
    }
    return arr;
  }, [ganttData]);

  const ongoingCount = ganttData.filter(d => d.status === 'Đang thực hiện').length;
  const pendingCount = ganttData.filter(d => d.status === 'Chờ thực hiện').length;
  const completedCount = ganttData.filter(d => d.status === 'Hoàn thành').length;

  return (
    <PageLayout title="Dashboard Đám & Gantt" icon={<LayoutDashboard size={15} className="text-indigo-500" />}>
      
      {/* ── Header ── */}
      <div className="mb-8 p-6 sm:p-8 rounded-[2rem] bg-gradient-to-br from-[#1B2A4A] via-indigo-800 to-[#1e1b4b] text-white shadow-xl shadow-indigo-900/20 max-w-full mx-auto relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-pink-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/10 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-4">
              <TrendingUp size={14} className="text-pink-300" />
              <span className="text-[11px] font-bold text-white tracking-widest uppercase">Thống kê & Tiến độ</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold mb-2 tracking-tight">Dashboard Quản Lý Đám</h1>
            <p className="text-indigo-100 text-sm max-w-lg">
              Theo dõi tổng quan trạng thái, biểu đồ tiến độ thực hiện các đám trên hệ thống.
            </p>
          </div>
          
          <Link href="/funerals" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all backdrop-blur-md">
            <ArrowLeft size={16} />
            Quay lại Hồ sơ
          </Link>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
         <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Tổng số hồ sơ Data</p>
            <p className="text-3xl font-black text-gray-900">{funerals.length}</p>
            <BookOpen className="absolute -bottom-2 -right-2 w-16 h-16 text-gray-50 opacity-50" />
         </div>
         <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
            <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider mb-1.5">Đang thực hiện</p>
            <p className="text-3xl font-black text-indigo-700">{ongoingCount}</p>
            <Clock className="absolute -bottom-2 -right-2 w-16 h-16 text-indigo-50 opacity-50" />
         </div>
         <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
            <p className="text-[11px] font-bold text-amber-500 uppercase tracking-wider mb-1.5">Chờ thực hiện</p>
            <p className="text-3xl font-black text-amber-600">{pendingCount}</p>
            <Calendar className="absolute -bottom-2 -right-2 w-16 h-16 text-amber-50 opacity-50" />
         </div>
         <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
            <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider mb-1.5">Hoàn thành</p>
            <p className="text-3xl font-black text-emerald-600">{completedCount}</p>
            <AlertCircle className="absolute -bottom-2 -right-2 w-16 h-16 text-emerald-50 opacity-50" />
         </div>
      </div>

      {/* ── Gantt Chart Section ── */}
      {loading ? (
         <div className="py-20 text-center text-gray-400 text-sm font-medium">Đang tải biểu đồ...</div>
      ) : ganttData.length === 0 ? (
         <div className="py-20 text-center text-gray-400 text-sm font-medium">Không đủ dữ liệu Khâm Liệm và Di Quan để vẽ biểu đồ.</div>
      ) : (
         <div className="mb-10">
           <GanttChart
             title="Biểu Đồ Tiến Độ (Gantt Chart)"
             tasks={ganttData.map(d => ({
               id: d.id || d.ma_dam,
               name: d.nguoi_mat || '(Chưa cập nhật)',
               subLabel: `Mã: ${d.ma_dam} - ${d.status} (${d.progress}%)`,
               startDate: d.startDate,
               endDate: d.endDate,
               progress: d.progress,
               color: d.status === 'Hoàn thành' ? '#10b981' : d.status === 'Chờ thực hiện' ? '#f59e0b' : '#6366f1',
               category: d.status
             }))}
           />
         </div>
      )}

    </PageLayout>
  );
}
