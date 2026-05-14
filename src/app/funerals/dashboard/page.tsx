'use client';

import { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Calendar, AlertCircle, TrendingUp, BookOpen, Clock, Users, ArrowLeft, RefreshCw, CheckCircle, X } from 'lucide-react';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import GanttChart from '@/components/GanttChart';

/**
 * Smart date parser — xử lý cả DD/MM/YYYY và MM/DD/YYYY
 * Dùng expectedMonth (cột "thang") làm kim chỉ nam cho trường hợp mập mờ
 */
function parseDateStr(dateStr: string, expectedMonth?: number | null): Date | null {
  if (!dateStr || dateStr === '—' || dateStr === '-' || dateStr.trim() === '') return null;

  const trimmed = dateStr.toString().trim();
  const match = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!match) return null;

  let a = parseInt(match[1], 10);
  let b = parseInt(match[2], 10);
  let yStr = match[3];
  let y: number;
  
  if (yStr.length === 2) {
    const yy = parseInt(yStr, 10);
    // 2-digit year: chỉ chấp nhận 20-29 → 2020-2029
    if (yy >= 20 && yy <= 29) {
      y = 2000 + yy;
    } else {
      return null; // Year không hợp lệ (ví dụ: "36" → reject)
    }
  } else {
    y = parseInt(yStr, 10);
  }

  // Sanity check: chỉ chấp nhận năm 2020-2030 (hệ thống kinh doanh thực tế)
  if (y < 2020 || y > 2030) return null;

  let day: number, month: number;

  if (a > 12 && b <= 12) {
    // a chắc chắn là ngày → DD/MM
    day = a; month = b;
  } else if (b > 12 && a <= 12) {
    // b chắc chắn là ngày → MM/DD → swap
    day = b; month = a;
  } else if (a <= 12 && b <= 12 && expectedMonth && expectedMonth >= 1 && expectedMonth <= 12) {
    // Ambiguous — dùng expectedMonth
    if (b === expectedMonth) {
      day = a; month = b; // DD/MM
    } else if (a === expectedMonth) {
      day = b; month = a; // MM/DD → swap
    } else {
      day = a; month = b; // default DD/MM
    }
  } else {
    // Default: DD/MM (chuẩn Việt Nam)
    day = a; month = b;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(y, month - 1, day);
  if (isNaN(date.getTime())) return null;
  return date;
}

function getMonthFromDamCode(maDam: unknown): number | null {
  const match = String(maDam || '').match(/^(?:BL)?\d{2}(\d{2})/i);
  if (!match) return null;
  const month = Number(match[1]);
  return month >= 1 && month <= 12 ? month : null;
}

export default function FuneralsDashboardPage() {
  const [funerals, setFunerals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchFunerals();
  }, []);

  async function fetchFunerals() {
    try {
      setLoading(true);
      const response = await fetch('/api/funerals?t=' + Date.now(), { cache: 'no-store' });
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

  // Sync thủ công
  const handleManualSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/sync-dam', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.success) {
        setSyncResult({
          success: true,
          message: `Đồng bộ thành công! ${json.fact_dam_upserted || 0} bản ghi đã cập nhật.`,
        });
        await fetchFunerals();
      } else {
        setSyncResult({ success: false, message: json.error || 'Sync thất bại.' });
      }
    } catch (err: any) {
      setSyncResult({ success: false, message: `Lỗi: ${err.message}` });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncResult(null), 8000);
    }
  };

  // Xử lý dữ liệu cho Gantt Chart — logic thông minh hơn
  const ganttData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return funerals
      .filter(f => f.ma_dam) // Chỉ cần có mã đám
      .map(f => {
        const thang = parseInt(f.thang, 10);
        const expectedMonth = (thang >= 1 && thang <= 12 ? thang : null) || getMonthFromDamCode(f.ma_dam);

        // Parse tất cả các ngày có thể dùng
        const ngay = parseDateStr(f.ngay, expectedMonth);
        const ngayLiem = parseDateStr(f.ngay_liem, expectedMonth);
        const ngayDiQuan = parseDateStr(f.ngay_di_quan, expectedMonth);

        // Xác định khoảng thời gian (start → end) linh hoạt:
        // Ưu tiên: ngay_liem → ngay_di_quan
        // Fallback 1: ngay → ngay_di_quan  
        // Fallback 2: ngay_liem → ngay_liem + 1 ngày
        // Fallback 3: ngay → ngay + 1 ngày
        let start: Date | null = null;
        let end: Date | null = null;

        if (ngayLiem && ngayDiQuan) {
          start = ngayLiem;
          end = ngayDiQuan;
        } else if (ngay && ngayDiQuan) {
          start = ngay;
          end = ngayDiQuan;
        } else if (ngayLiem) {
          start = ngayLiem;
          end = new Date(ngayLiem);
          end.setDate(end.getDate() + 1); // +1 ngày
        } else if (ngay && ngayLiem) {
          start = ngay;
          end = ngayLiem;
        } else if (ngay) {
          start = ngay;
          end = new Date(ngay);
          end.setDate(end.getDate() + 1);
        }

        // Nếu vẫn không có ngày nào hợp lệ → bỏ qua
        if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return null;

        // Đảm bảo start <= end
        if (start > end) {
          const tmp = start; start = end; end = tmp;
        }

        // Xác định trạng thái
        let status = 'Đang thực hiện';
        let progress = 50;

        if (end < today) {
          status = 'Hoàn thành';
          progress = 100;
        } else if (start > today) {
          status = 'Chờ thực hiện';
          progress = 0;
        } else {
          const totalDuration = end.getTime() - start.getTime();
          const elapsed = today.getTime() - start.getTime();
          progress = totalDuration > 0
            ? Math.min(100, Math.max(10, Math.round((elapsed / totalDuration) * 100)))
            : 50;
        }

        const color = status === 'Hoàn thành' ? '#10b981'
          : status === 'Chờ thực hiện' ? '#f59e0b'
          : '#6366f1';

        // Sub label: thông tin giờ liệm / giờ di quan
        const timeInfo = [
          f.gio_liem ? `Liệm: ${f.gio_liem}` : '',
          f.gio_di_quan ? `Di quan: ${f.gio_di_quan}` : '',
        ].filter(Boolean).join(' · ');

        return {
          ...f,
          startDate: start,
          endDate: end,
          status,
          progress,
          color,
          timeInfo,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        // Đang diễn ra → Chờ → Hoàn thành
        const statusOrder: Record<string, number> = { 'Đang thực hiện': 0, 'Chờ thực hiện': 1, 'Hoàn thành': 2 };
        const sa = statusOrder[a.status] ?? 9;
        const sb = statusOrder[b.status] ?? 9;
        if (sa !== sb) return sa - sb;
        return b.startDate.getTime() - a.startDate.getTime();
      });
  }, [funerals]);

  const ongoingCount = ganttData.filter((d: any) => d.status === 'Đang thực hiện').length;
  const pendingCount = ganttData.filter((d: any) => d.status === 'Chờ thực hiện').length;
  const completedCount = ganttData.filter((d: any) => d.status === 'Hoàn thành').length;
  const noDateCount = funerals.length - ganttData.length;

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
          
          <div className="flex items-center gap-3">
            {/* Nút Sync */}
            <button
              onClick={handleManualSync}
              disabled={syncing}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border shadow-md ${
                syncing
                  ? 'bg-amber-500/80 border-amber-400/50 text-white cursor-wait'
                  : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-400/50 text-white hover:shadow-emerald-500/30'
              }`}
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Đang sync...' : 'Sync Sheets'}
            </button>

            <Link href="/funerals" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all backdrop-blur-md">
              <ArrowLeft size={16} />
              Quay lại Hồ sơ
            </Link>
          </div>
        </div>
      </div>

      {/* Sync Result Banner */}
      {syncResult && (
        <div className={`mb-4 flex items-center gap-3 px-5 py-3.5 rounded-2xl border text-sm font-semibold transition-all ${
          syncResult.success
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {syncResult.success
            ? <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />
            : <X size={18} className="text-red-500 flex-shrink-0" />
          }
          <span className="flex-1">{syncResult.message}</span>
          <button onClick={() => setSyncResult(null)} className="p-1 rounded-lg hover:bg-white/50 transition-colors flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
         <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Tổng hồ sơ</p>
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
            <CheckCircle className="absolute -bottom-2 -right-2 w-16 h-16 text-emerald-50 opacity-50" />
         </div>
         <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-gray-300"></div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Trên Gantt</p>
            <p className="text-3xl font-black text-gray-600">{ganttData.length}</p>
            <p className="text-[10px] font-semibold text-gray-400 mt-1">{noDateCount > 0 ? `${noDateCount} chưa có ngày` : 'Đầy đủ'}</p>
         </div>
      </div>

      {/* ── Gantt Chart Section ── */}
      {loading ? (
         <div className="py-20 text-center text-gray-400 text-sm font-medium">Đang tải biểu đồ...</div>
      ) : ganttData.length === 0 ? (
         <div className="py-20 text-center">
           <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100 mx-auto mb-4">
             <AlertCircle className="text-gray-300 w-8 h-8" />
           </div>
           <p className="text-sm font-semibold text-gray-500 mb-2">Không có đám nào có dữ liệu ngày để vẽ biểu đồ.</p>
           <p className="text-xs text-gray-400">Vui lòng bấm "Sync Sheets" để đồng bộ dữ liệu mới nhất từ Google Sheet.</p>
         </div>
      ) : (
         <div className="mb-10">
           <GanttChart
             title="Biểu Đồ Tiến Độ (Gantt Chart)"
             tasks={ganttData.map((d: any) => ({
               id: d.id || d.ma_dam,
               name: `${d.ma_dam} — ${d.nguoi_mat || '(Chưa cập nhật)'}`,
               subLabel: [
                 d.chi_nhanh || '',
                 d.loai || '',
                 d.timeInfo || '',
               ].filter(Boolean).join(' · '),
               startDate: d.startDate,
               endDate: d.endDate,
               progress: d.progress,
               color: d.color,
               category: d.status,
               tooltip: [
                 `Sale: ${d.sale || '—'}`,
                 `ĐP: ${d.dieu_phoi || '—'}`,
                 d.dia_chi_to_chuc ? `Địa chỉ: ${d.dia_chi_to_chuc}` : '',
               ].filter(Boolean).join('\n'),
               details: {
                 'Mã đám': d.ma_dam,
                 'Người mất': d.nguoi_mat,
                 'Ngày': d.ngay,
                 'Loại': d.loai,
                 'Chi nhánh': d.chi_nhanh,
                 'Địa chỉ tổ chức': d.dia_chi_to_chuc,
                 'Địa chỉ chôn/thiêu': d.dia_chi_chon_thieu,
                 'Giờ liệm': d.gio_liem,
                 'Ngày liệm': d.ngay_liem,
                 'Giờ di quan': d.gio_di_quan,
                 'Ngày di quan': d.ngay_di_quan,
                 'Sale': d.sale,
                 'Điều phối': d.dieu_phoi,
                 'Thầy số lượng': d.thay_so_luong,
                 'Thầy NCC': d.thay_ncc,
                 'Tên thầy': d.thay_ten,
                 'Hòm loại': d.hom_loai,
                 'Hòm NCC/Kho': d.hom_ncc_hay_kho,
                 'Hoa': d.hoa,
                 'Đá khô/Tiêm focmol': d.da_kho_tiem_focmol,
                 'Kèn tây số lễ': d.ken_tay_so_le,
                 'Kèn tây NCC': d.ken_tay_ncc,
                 'Quay phim/chụp hình gói DV': d.quay_phim_chup_hinh_goi_dv,
                 'Quay phim/chụp hình NCC': d.quay_phim_chup_hinh_ncc,
                 'Mâm cúng số lượng': d.mam_cung_so_luong,
                 'Mâm cúng NCC': d.mam_cung_ncc,
                 'Di ảnh/Cáo phó': d.di_anh_cao_pho,
                 'Băng rôn': d.bang_ron,
                 'Lá triệu/Bài vị': d.la_trieu_bai_vi,
                 'Nhạc': d.nhac,
                 'Thuê rạp bàn ghế số lượng': d.thue_rap_ban_ghe_so_luong,
                 'Thuê rạp bàn ghế NCC': d.thue_rap_ban_ghe_ncc,
                 'Hủ tro cốt': d.hu_tro_cot,
                 'Teabreak': d.teabreak,
                 'Xe tang lễ loại': d.xe_tang_le_loai,
                 'Xe tang lễ đạo tỳ': d.xe_tang_le_dao_ty,
                 'Xe tang lễ NCC': d.xe_tang_le_ncc,
                 'Xe khách loại': d.xe_khach_loai,
                 'Xe khách NCC': d.xe_khach_ncc,
                 'Xe cấp cứu': d.xe_cap_cuu,
                 'Xe khác': d.xe_khac,
                 'Thuê NV trực': d.thue_nv_truc,
                 'Báo đồn': d.bao_don,
                 'Hình thức chôn/thiêu': d.chon_thieu,
                 'Ghi chú': d.ghi_chu,
               },
             }))}
           />
         </div>
      )}

    </PageLayout>
  );
}
