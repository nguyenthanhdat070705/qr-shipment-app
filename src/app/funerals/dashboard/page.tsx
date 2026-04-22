'use client';

import { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Calendar, AlertCircle, TrendingUp, BookOpen, Clock, Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';

// Hàm helper để gộp ngày
function parseDateStr(dateStr: string) {
  if (!dateStr || dateStr === '—') return null;
  // Giả sử định dạng là dd/mm/yyyy
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
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
      .filter(f => f.startDate && f.endDate)
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 flex flex-col mb-10 overflow-hidden">
         <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
           <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
             <LayoutDashboard size={18} className="text-indigo-600" />
             Biểu Đồ Tiến Độ (Gantt Chart)
           </h2>
           <span className="text-[11px] font-semibold text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
             Scroll ngang để xem chi tiết timeline
           </span>
         </div>
         
         <div className="p-0 overflow-x-auto">
            {loading ? (
               <div className="py-20 text-center text-gray-400 text-sm font-medium">Đang tải biểu đồ...</div>
            ) : timelineDays.length === 0 ? (
               <div className="py-20 text-center text-gray-400 text-sm font-medium">Không đủ dữ liệu Khâm Liệm và Di Quan để vẽ biểu đồ.</div>
            ) : (
               <div className="min-w-[1200px]" style={{ width: `max(100%, ${timelineDays.length * 60 + 350}px)` }}>
                  
                  {/* Header Row */}
                  <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10">
                    <div className="w-[350px] flex-shrink-0 flex text-xs font-black text-gray-500 uppercase bg-white select-none">
                       <div className="w-[120px] p-3 border-r border-gray-200">Trạng thái</div>
                       <div className="w-[60px] p-3 border-r border-gray-200 text-center">Tiến độ</div>
                       <div className="flex-1 p-3 border-r border-gray-200">Tên Đám / Mã</div>
                    </div>
                    <div className="flex-1 flex overflow-hidden">
                      {timelineDays.map((d, i) => {
                         const isToday = d.toDateString() === new Date().toDateString();
                         const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                         return (
                           <div key={i} className={`flex-1 min-w-[60px] border-r border-gray-100 flex flex-col text-center ${isToday ? 'bg-indigo-50/50' : ''} ${isWeekend ? 'bg-gray-50/50' : ''}`}>
                             <div className={`p-1.5 text-[10px] font-bold border-b border-gray-100 uppercase ${isToday ? 'text-indigo-600' : 'text-gray-400'}`}>
                               Th {d.getMonth() + 1}
                             </div>
                             <div className={`p-1.5 flex flex-col items-center justify-center ${isToday ? 'text-indigo-700' : 'text-gray-600'}`}>
                               <span className={`text-[10px] font-semibold mb-0.5 ${isToday ? 'text-indigo-500' : 'text-gray-400'}`}>T{d.getDay() === 0 ? 'CN' : d.getDay() + 1}</span>
                               <span className={`text-sm font-black w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white shadow-sm' : ''}`}>{d.getDate()}</span>
                             </div>
                           </div>
                         );
                      })}
                    </div>
                  </div>

                  {/* Body Rows */}
                  <div className="flex flex-col relative">
                     {/* Cột dọc báo Hôm nay */}
                     <div className="absolute top-0 bottom-0 pointer-events-none z-0 flex" style={{ left: '350px', right: 0 }}>
                        {timelineDays.map((d, i) => {
                           const isToday = d.toDateString() === new Date().toDateString();
                           return (
                             <div key={i} className={`flex-1 min-w-[60px] border-r ${isToday ? 'border-indigo-200/50 bg-indigo-50/30' : 'border-gray-50'}`} />
                           );
                        })}
                     </div>

                     {ganttData.map((row, rIndex) => {
                       // Tính toán độ dài & vị trí bar
                       const startT = row.startDate!.getTime();
                       const endT = row.endDate!.getTime();
                       const minT = timelineDays[0].getTime();
                       const maxT = timelineDays[timelineDays.length - 1].getTime();
                       const MS_PER_DAY = 1000 * 60 * 60 * 24;
                       
                       const dayWidthPercent = 100 / timelineDays.length;
                       
                       // Tính vị trí left = bao nhiêu ngày từ minT
                       const leftDays = (startT - minT) / MS_PER_DAY;
                       const durationDays = (endT - startT) / MS_PER_DAY || 1; // Tối thiểu 1 ngày
                       
                       const leftPct = Math.max(0, leftDays * dayWidthPercent);
                       const widthPct = Math.min(100 - leftPct, durationDays * dayWidthPercent);

                       return (
                         <div key={row.id || Math.random()} className="flex border-b border-gray-100 hover:bg-gray-50/50 transition-colors z-10 relative">
                           
                           {/* Side Columns */}
                           <div className="w-[350px] flex-shrink-0 flex items-center bg-white text-xs z-20">
                             <div className="w-[120px] p-3 border-r border-gray-200 h-full flex items-center">
                               <span className={`px-2 py-1 rounded inline-block text-[10px] font-bold ${row.statusBadge}`}>
                                 {row.status}
                               </span>
                             </div>
                             <div className="w-[60px] p-3 border-r border-gray-200 h-full flex items-center justify-center">
                               <div className="w-full flex items-center gap-1.5">
                                 <span className="font-bold text-gray-700">{row.progress}%</span>
                               </div>
                             </div>
                             <div className="flex-1 p-3 border-r border-gray-200 h-full flex flex-col justify-center gap-1">
                               <span className="font-black text-gray-900 truncate max-w-[150px]" title={row.nguoi_mat}>{row.nguoi_mat || '(Chưa cập nhật)'}</span>
                               <span className="font-mono text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded w-fit">{row.ma_dam}</span>
                             </div>
                           </div>

                           {/* Timeline row */}
                           <div className="flex-1 flex items-center relative min-h-[56px] py-2">
                             {/* Thanh Gantt */}
                             <div 
                               className={`absolute h-7 rounded-sm shadow-sm overflow-hidden flex items-center ${row.colorClass} opacity-90 hover:opacity-100 transition-opacity cursor-pointer`}
                               style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                               title={`${row.ngay_liem} đến ${row.ngay_di_quan}\nTiến độ: ${row.progress}%`}
                             >
                                <div className="absolute top-0 bottom-0 left-0 bg-white/20 select-none pointer-events-none" style={{ width: `${row.progress}%` }}></div>
                             </div>
                           </div>

                         </div>
                       );
                     })}
                  </div>
               </div>
            )}
         </div>
      </div>

    </PageLayout>
  );
}
