'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Search, X, Calendar, MapPin, Users, Heart, Package, Loader2 } from 'lucide-react';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import { getSupabase } from '@/lib/supabase/client';

const cn = (...classes: (string | undefined | false | null)[]) => {
  return classes.filter(Boolean).join(' ');
};

// Component helper cho Modal
const DetailRow = ({ label, value, sub }: { label: string, value?: any, sub?: string }) => {
  const isValueEmpty = !value || value === 'null' || value === '—' || String(value || '').trim() === '';
  const isSubEmpty = !sub || sub === 'null' || sub === '—' || String(sub || '').trim() === '';
  
  if (isValueEmpty && isSubEmpty) return null;

  return (
    <div className="flex justify-between items-start gap-4 hover:bg-gray-50/50 p-1.5 -mx-1.5 rounded-lg transition-colors">
      <span className="text-[13px] font-bold text-gray-500 w-[40%] flex-shrink-0 leading-tight pt-0.5">{label}</span>
      <div className="flex flex-col flex-1 items-end text-right">
         <span className="text-sm font-bold text-gray-900 leading-tight block">{!isValueEmpty ? value : '—'}</span>
         {!isSubEmpty && <span className="text-[11px] font-semibold text-gray-400 mt-1 uppercase tracking-wide leading-tight block">{sub}</span>}
      </div>
    </div>
  );
};

export default function FuneralsPage() {
  const [funerals, setFunerals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [selectedFuneral, setSelectedFuneral] = useState<any | null>(null);

  // Lấy dữ liệu từ dim_dam
  useEffect(() => {
    async function fetchFunerals() {
      try {
        const response = await fetch('/api/funerals');
        if (!response.ok) {
           throw new Error(`Lỗi HTTP: ${response.status}`);
        }
        const json = await response.json();
        setFunerals(json.data || []);
      } catch (err) {
        console.error('Lỗi lấy dữ liệu Đám:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchFunerals();
  }, []);

  const filtered = funerals.filter(f => {
    const matchSearch = (f.ma_dam && f.ma_dam.toLowerCase().includes(search.toLowerCase())) ||
      (f.nguoi_mat && f.nguoi_mat.toLowerCase().includes(search.toLowerCase())) ||
      (f.dia_chi_to_chuc && f.dia_chi_to_chuc.toLowerCase().includes(search.toLowerCase()));
    
    let matchDate = true;
    if (filterDate) {
      // Convert filterDate from YYYY-MM-DD to DD/MM/YYYY to match `ngay` format in CSV
      const [year, month, day] = filterDate.split('-');
      const formattedFilterDate = `${day}/${month}/${year}`;
      matchDate = (f.ngay === formattedFilterDate);
    }
    
    return matchSearch && matchDate;
  });

  return (
    <PageLayout title="Danh Sách Đám" icon={<BookOpen size={15} className="text-pink-500" />}>
      {/* ── Header ── */}
      <div className="mb-8 p-8 sm:p-10 rounded-[2rem] bg-gradient-to-br from-[#1B2A4A] via-indigo-900 to-[#0f172a] text-white shadow-xl shadow-indigo-900/20 max-w-7xl mx-auto relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-pink-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-500/20 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-4 flex-shrink-0">
              <BookOpen size={14} className="text-pink-400" />
              <span className="text-[11px] font-bold text-white tracking-widest uppercase">Quản lý Đám</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight">Hồ Sơ Đám</h1>
            <p className="text-indigo-100 text-sm max-w-lg leading-relaxed">
              Duyệt qua danh sách, tìm kiếm và xem toàn bộ chi tiết tổ chức, thông tin các gói dịch vụ của từng đám.
            </p>
          </div>
          
          <div className="w-full md:w-auto mt-4 md:mt-0 relative max-w-md flex-1 flex gap-2">
             <div className="relative flex-1">
               <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search size={18} className="text-indigo-300" />
               </div>
               <input
                 type="text"
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 placeholder="Mã đám, Người mất..."
                 className="w-full pl-11 pr-4 py-4 bg-white/10 border border-white/20 focus:bg-white focus:border-indigo-300 rounded-2xl text-sm font-medium text-white focus:text-gray-900 placeholder:text-indigo-200 focus:placeholder:text-gray-400 transition-all shadow-inner outline-none backdrop-blur-md"
               />
             </div>
             
             {/* Bộ lọc Date */}
             <div className="relative w-36 sm:w-40 flex-shrink-0">
               <input
                 type="date"
                 value={filterDate}
                 onChange={(e) => setFilterDate(e.target.value)}
                 className="w-full px-3 py-4 bg-white/10 border border-white/20 focus:bg-white focus:border-indigo-300 rounded-2xl text-sm font-medium text-white focus:text-gray-900 transition-all shadow-inner outline-none backdrop-blur-md cursor-pointer h-[54px]"
                 title="Lọc theo ngày"
               />
             </div>
             
             {/* Nút Xem Dashboard Gantt */}
             <Link 
                href="/funerals/dashboard"
                className="flex-shrink-0 flex items-center justify-center bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-4 rounded-2xl text-sm font-bold shadow-lg transition-all border border-indigo-400/50 hover:shadow-indigo-500/30 h-[54px]"
             >
                <div className="flex items-center gap-2">
                   <Calendar size={18} />
                   <span className="hidden sm:inline">Gantt & Dashboard</span>
                </div>
             </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pb-12">
         {/* ── Table / Grid ── */}
         <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
           {loading ? (
             <div className="flex flex-col items-center justify-center p-20 gap-4 text-indigo-400">
               <Loader2 className="animate-spin w-10 h-10" />
               <p className="text-sm font-semibold">Đang tải dữ liệu đám...</p>
             </div>
           ) : filtered.length === 0 ? (
             <div className="flex flex-col items-center justify-center p-20 gap-4">
               <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
                 <Search className="text-gray-300 w-8 h-8" />
               </div>
               <p className="text-sm font-semibold text-gray-500">Không tìm thấy đám nào khớp với tìm kiếm.</p>
             </div>
           ) : (
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                 <thead>
                   <tr className="bg-gray-50/80 border-b border-gray-100 uppercase text-[10px] font-black tracking-widest text-gray-500 whitespace-nowrap">
                     <th className="px-3 py-3 lg:px-4 w-[120px]">Ngày / Tạo</th>
                     <th className="px-3 py-3 lg:px-4">Mã Đám</th>
                     <th className="px-3 py-3 lg:px-4">Người Mất</th>
                     <th className="px-3 py-3 lg:px-4">Phân Loại / CN</th>
                     <th className="px-3 py-3 lg:px-4">Thời gian liệm</th>
                     <th className="px-3 py-3 lg:px-4">Sale & Điều Phối</th>
                     <th className="px-3 py-3 lg:px-4 text-right flex-shrink-0">Tác vụ</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                   {filtered.map(row => (
                     <tr key={row.id || row.ma_dam} className="hover:bg-indigo-50/30 transition-colors group text-xs sm:text-[13px]">
                       <td className="px-3 py-3 lg:px-4 font-bold text-gray-600 whitespace-nowrap">
                         <div className="flex flex-col gap-1">
                           {row.ngay ? <span className="flex items-center gap-1.5"><Calendar size={12} className="text-gray-400" /> {row.ngay}</span> : <span className="text-gray-300">—</span>}
                           {row.created_at && (
                             <span className="text-[10px] text-gray-400 font-semibold tracking-wider bg-gray-100/50 px-1.5 py-0.5 rounded w-fit">
                               Tạo: {new Date(row.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                             </span>
                           )}
                         </div>
                       </td>
                       <td className="px-3 py-3 lg:px-4 font-bold text-indigo-700 whitespace-nowrap">{row.ma_dam}</td>
                       <td className="px-3 py-3 lg:px-4 font-semibold text-gray-900 max-w-[180px] lg:max-w-[220px]">
                         <div className="line-clamp-2" title={row.nguoi_mat || '—'}>
                           {row.nguoi_mat || '—'}
                         </div>
                       </td>
                       <td className="px-3 py-3 lg:px-4 whitespace-nowrap">
                         <div className="flex flex-col gap-1">
                           <span className="font-bold text-gray-800 truncate max-w-[150px]" title={row.loai}>{row.loai || '—'}</span>
                           <span className="text-[10px] font-bold text-gray-400 tracking-wider">{row.chi_nhanh}</span>
                         </div>
                       </td>
                       <td className="px-3 py-3 lg:px-4 whitespace-nowrap">
                         <div className="flex flex-col gap-1">
                           <span className="font-bold text-gray-700 inline-flex items-center gap-1.5"><Calendar size={12}/> {row.ngay_liem || '—'}</span>
                           <span className="text-[11px] font-semibold text-gray-500">{row.gio_liem}</span>
                         </div>
                       </td>
                       <td className="px-3 py-3 lg:px-4 whitespace-nowrap">
                         <div className="flex flex-col gap-1 w-fit">
                           <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1 truncate max-w-[120px]" title={row.sale}>S: {row.sale || '—'}</span>
                           <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 flex items-center gap-1 truncate max-w-[120px]" title={row.dieu_phoi}>Đ: {row.dieu_phoi || '—'}</span>
                         </div>
                       </td>
                       <td className="px-3 py-3 lg:px-4 text-right w-[90px] whitespace-nowrap">
                         <button 
                           onClick={() => setSelectedFuneral(row)}
                           className="bg-gray-900 hover:bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                         >
                           Chi tiết
                         </button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           )}
         </div>
      </div>

      {/* ── Modal Chi Tiết Đám ── */}
      {selectedFuneral && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md p-4 sm:p-6 sm:py-10 transition-opacity duration-300">
          <div className="bg-white rounded-[2rem] w-full max-w-5xl h-full flex flex-col shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 sm:px-8 py-5 sm:py-6 border-b border-gray-100 bg-gray-50/80 backdrop-blur-md relative">
              <div className="flex flex-col gap-1.5 min-w-0 pr-4">
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                  <span className="w-2 h-7 bg-pink-500 rounded-full inline-block flex-shrink-0"></span>
                  <span className="truncate">Hồ Sơ Đám: <span className="text-pink-600 ml-1">{selectedFuneral.ma_dam}</span></span>
                </h2>
                <div className="flex items-center gap-3 text-[13px] font-bold text-gray-500 sm:ml-5">
                  <span className="inline-flex items-center gap-1.5"><Users size={14} className="text-indigo-400"/> {selectedFuneral.chi_nhanh}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  <span className="inline-flex items-center gap-1.5"><Heart size={14} className="text-rose-400"/> {selectedFuneral.nguoi_mat}</span>
                </div>
              </div>
              
              <button onClick={() => setSelectedFuneral(null)} className="p-2 sm:p-3 bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 hover:text-red-600 rounded-full transition-all shadow-sm cursor-pointer hover:shadow-md hover:rotate-90 flex-shrink-0">
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#f8fafc] modal-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
                
                {/* Cột 1: Thông tin chung & Thời gian */}
                <div className="space-y-4 sm:space-y-6">
                  <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-indigo-100/50 hover:border-indigo-200 hover:shadow-md transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50 rounded-bl-full -z-0"></div>
                    <h3 className="text-sm font-black uppercase text-indigo-700 tracking-widest mb-4 flex items-center gap-2 relative z-10">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                      Thông tin Tổ Chức
                    </h3>
                    <div className="space-y-3 relative z-10">
                      <DetailRow label="Người Mất" value={selectedFuneral.nguoi_mat} />
                      <DetailRow label="Cáo phó / Di ảnh" value={selectedFuneral.di_anh_cao_pho} />
                      <DetailRow label="Phân Loại" value={selectedFuneral.loai} />
                      <DetailRow label="Chi Nhánh" value={selectedFuneral.chi_nhanh} />
                      <div className="h-px bg-gray-100 my-2"></div>
                      <DetailRow label="Ngày giờ liệm" value={`${selectedFuneral.gio_liem || ''} ${selectedFuneral.ngay_liem || ''}`.trim()} />
                      <DetailRow label="Ngày giờ di quan" value={`${selectedFuneral.gio_di_quan || ''} ${selectedFuneral.ngay_di_quan || ''}`.trim()} />
                      <div className="h-px bg-gray-100 my-2"></div>
                      <DetailRow label="Nơi tổ chức" value={selectedFuneral.dia_chi_to_chuc} />
                      <DetailRow label="Nơi Chôn/Thiêu" value={selectedFuneral.dia_chi_chon_thieu || selectedFuneral.chon_thieu} />
                    </div>
                  </div>

                  <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-rose-100/50 hover:border-rose-200 hover:shadow-md transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-rose-50 rounded-bl-full -z-0"></div>
                    <h3 className="text-sm font-black uppercase text-rose-700 tracking-widest mb-4 flex items-center gap-2 relative z-10">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      Nhân sự & Bố trí
                    </h3>
                    <div className="space-y-3 relative z-10">
                      <DetailRow label="Sale" value={selectedFuneral.sale} />
                      <DetailRow label="Điều Phối" value={selectedFuneral.dieu_phoi} />
                      <DetailRow label="Thầy" value={selectedFuneral.thay_ten} sub={selectedFuneral.thay_so_luong ? `SL: ${selectedFuneral.thay_so_luong} (${selectedFuneral.thay_ncc || ''})` : ''} />
                      <DetailRow label="Bảo Đồn" value={selectedFuneral.bao_don} />
                      <DetailRow label="Thuê NV trực" value={selectedFuneral.thue_nv_truc} />
                    </div>
                  </div>
                </div>

                {/* Cột 2: Sản phẩm & Logistics */}
                <div className="space-y-4 sm:space-y-6">
                  <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-emerald-100/50 hover:border-emerald-200 hover:shadow-md transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full -z-0"></div>
                    <h3 className="text-sm font-black uppercase text-emerald-700 tracking-widest mb-4 flex items-center gap-2 relative z-10">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      Vật tư & Sự Kiện
                    </h3>
                    <div className="space-y-3 relative z-10">
                      <DetailRow label="Hòm" value={selectedFuneral.hom_loai} sub={selectedFuneral.hom_ncc_hay_kho} />
                      <DetailRow label="Hoa" value={selectedFuneral.hoa} />
                      <DetailRow label="Focmol/Đá khô" value={selectedFuneral.da_kho_tiem_focmol} />
                      <DetailRow label="Rạp bàn ghế" value={selectedFuneral.thue_rap_ban_ghe_so_luong} sub={selectedFuneral.thue_rap_ban_ghe_ncc} />
                      <DetailRow label="Hủ tro cút" value={selectedFuneral.hu_tro_cot} />
                      <DetailRow label="Lá triệu / Bài vị" value={selectedFuneral.la_trieu_bai_vi} />
                      <DetailRow label="Băng rôn" value={selectedFuneral.bang_ron} />
                      <DetailRow label="Mâm cúng" value={selectedFuneral.mam_cung_so_luong} sub={selectedFuneral.mam_cung_ncc} />
                      <DetailRow label="Teabreak" value={selectedFuneral.teabreak} />
                    </div>
                  </div>
                </div>

                {/* Cột 3: Xe & Dịch vụ Khác */}
                <div className="space-y-4 sm:space-y-6">
                  <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-amber-100/50 hover:border-amber-200 hover:shadow-md transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-full -z-0"></div>
                    <h3 className="text-sm font-black uppercase text-amber-700 tracking-widest mb-4 flex items-center gap-2 relative z-10">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      Xe Chuyên Vận
                    </h3>
                    <div className="space-y-3 relative z-10">
                      <DetailRow label="Xe tang lễ" value={selectedFuneral.xe_tang_le_loai} sub={`${selectedFuneral.xe_tang_le_ncc || ''} ${selectedFuneral.xe_tang_le_dao_ty ? `(Đạo tỳ: ${selectedFuneral.xe_tang_le_dao_ty})` : ''}`.trim()} />
                      <DetailRow label="Xe khách" value={selectedFuneral.xe_khach_loai} sub={selectedFuneral.xe_khach_ncc} />
                      <DetailRow label="Xe cấp cứu" value={selectedFuneral.xe_cap_cuu} />
                      <DetailRow label="Xe khác" value={selectedFuneral.xe_khac} />
                    </div>
                  </div>

                  <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-violet-100/50 hover:border-violet-200 hover:shadow-md transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-violet-50 rounded-bl-full -z-0"></div>
                    <h3 className="text-sm font-black uppercase text-violet-700 tracking-widest mb-4 flex items-center gap-2 relative z-10">
                      <span className="w-2.5 h-2.5 rounded-full bg-violet-500"></span>
                      Dịch vụ & Ghi chú
                    </h3>
                    <div className="space-y-3 relative z-10">
                      <DetailRow label="Kèn tây" value={selectedFuneral.ken_tay_so_le} sub={selectedFuneral.ken_tay_ncc} />
                      <DetailRow label="Media" value={selectedFuneral.quay_phim_chup_hinh_goi_dv} sub={selectedFuneral.quay_phim_chup_hinh_ncc} />
                      <DetailRow label="Nhạc" value={selectedFuneral.nhac} />
                      
                      {selectedFuneral.ghi_chu && selectedFuneral.ghi_chu !== 'null' && selectedFuneral.ghi_chu !== '—' && (
                        <>
                          <div className="h-px bg-violet-50 my-2"></div>
                          <div className="pt-2">
                            <span className="block text-[11px] font-black text-violet-600/70 uppercase tracking-widest mb-2 pl-1">Ghi chú</span>
                            <p className="text-[13px] font-semibold text-violet-900 bg-violet-50 p-4 rounded-xl border border-violet-100 leading-relaxed shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">{selectedFuneral.ghi_chu}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

    </PageLayout>
  );
}
