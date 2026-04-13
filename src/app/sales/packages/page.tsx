'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag, ChevronLeft, Check, Star, Shield, 
  CreditCard, User, Phone, MapPin, Loader2, ArrowRight
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';

/* ─────────────────────────────────────
   Types & Mock Data
───────────────────────────────────── */
interface PackageOption {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  recommended?: boolean;
  color: string;           // base color identifier
  gradientFrom: string;
  gradientTo: string;
}

const PACKAGES: PackageOption[] = [
  {
    id: 'pkg-member-basic',
    name: 'Hội Viên Thông Thường',
    description: 'Quyền lợi cơ bản cho thành viên BlackStones.',
    price: 5000000,
    color: 'teal',
    gradientFrom: 'from-teal-400',
    gradientTo: 'to-emerald-600',
    features: [
      'Miễn phí tư vấn dịch vụ 24/7',
      'Giảm 5% khi mua trang thiết bị',
      'Hỗ trợ pháp lý cơ bản',
      'Bảo lưu gói trong 10 năm'
    ]
  },
  {
    id: 'pkg-membership-pro',
    name: 'Gói Membership Pro',
    description: 'Quyền lợi nâng cao với các dịch vụ chăm sóc hoàn hảo.',
    price: 18000000,
    color: 'blue',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-indigo-600',
    features: [
      'Miễn phí tư vấn dịch vụ 24/7',
      'Giảm 10% các gói dịch vụ nâng cấp',
      'Tham gia CLB BlackStones Member',
      'Được ưu tiên chọn vị trí tốt nhất',
      'Quà tặng Sinh nhật hàng năm'
    ]
  },
  {
    id: 'pkg-member-premium',
    name: 'Hội Viên Trăm Tuổi (VIP)',
    description: 'Bảo vệ toàn diện, an tâm cho bản thân và gia đình.',
    price: 35000000,
    recommended: true,
    color: 'amber',
    gradientFrom: 'from-amber-400',
    gradientTo: 'to-orange-500',
    features: [
      'Toàn bộ quyền lợi gói cơ bản',
      'Tổ chức tang lễ trọn gói tiêu chuẩn',
      'Trợ lý cá nhân hỗ trợ 1-1',
      'Giảm 15% khi nâng cấp nắp đặt',
      'Chăm sóc mộ phần hàng năm (5 năm)'
    ]
  },
  {
    id: 'pkg-service-luxury',
    name: 'Gói Di Sản Vĩnh Cửu',
    description: 'Dịch vụ tổ chức cao cấp nhất, tối đa hóa sự trang trọng.',
    price: 150000000,
    color: 'violet',
    gradientFrom: 'from-violet-500',
    gradientTo: 'to-fuchsia-600',
    features: [
      'Đội ngũ lễ tân và phục vụ VIP',
      'Quan tài gỗ nhập khẩu cao cấp',
      'Hoa tươi thiết kế độc bản',
      'Xe Limousine di quan',
      'Hỗ trợ toàn bộ thủ tục pháp lý'
    ]
  }
];

/* ─────────────────────────────────────
   Main Page
───────────────────────────────────── */
export default function SellPackagesPage() {
  const router = useRouter();
  
  // Checkout flow state
  const [selectedPkg, setSelectedPkg] = useState<PackageOption | null>(null);
  const [step, setStep] = useState<'selection' | 'customer_info' | 'success'>('selection');
  
  // Customer Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const handleSelectPackage = (pkg: PackageOption) => {
    setSelectedPkg(pkg);
    setStep('customer_info');
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg || !customerName || !customerPhone) return;
    
    setIsSubmitting(true);
    // Giả lập thời gian submit n8n webhook / tạo deal trên CRM
    await new Promise(r => setTimeout(r, 1500));
    setIsSubmitting(false);
    setStep('success');
  };

  const resetFlow = () => {
    setSelectedPkg(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerId('');
    setCustomerAddress('');
    setStep('selection');
  };

  return (
    <PageLayout title="Bán gói sản phẩm" icon={<ShoppingBag size={16} className="text-rose-500" />}>
      <div className="max-w-7xl mx-auto">
        
        {/* Breadcrumb & Navigation */}
        <button 
          onClick={() => {
            if (step === 'customer_info') setStep('selection');
            else router.push('/sales');
          }}
          className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <ChevronLeft size={16} />
          {step === 'customer_info' ? 'Quay lại chọn gói' : 'Về trang Bán hàng'}
        </button>

        {/* ── Step 1: Selection ───────────────────────────────── */}
        {step === 'selection' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h1 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">Ký kết & Bán Gói Sản Phẩm</h1>
              <p className="text-gray-500">
                Lựa chọn gói dịch vụ hoặc thẻ Hội Viên Trăm Tuổi phù hợp với nhu cầu của khách hàng.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
              {PACKAGES.map((pkg) => (
                <div 
                  key={pkg.id}
                  className={`
                    relative flex flex-col bg-white rounded-3xl p-6 md:p-8 
                    border-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl
                    ${pkg.recommended ? 'border-amber-400 shadow-lg scale-105 z-10' : 'border-gray-100 hover:border-gray-300'}
                  `}
                >
                  {pkg.recommended && (
                    <div className="absolute -top-4 left-0 right-0 flex justify-center">
                      <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                        <Star size={12} className="fill-white" /> Khuyên dùng
                      </div>
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{pkg.name}</h3>
                    <p className="text-xs text-gray-500 mt-2 mb-6 min-h-[40px]">{pkg.description}</p>
                    
                    <div className="mb-6">
                      <span className="text-3xl font-black text-gray-900">{formatPrice(pkg.price)}</span>
                    </div>

                    <ul className="space-y-3 mb-8">
                      {pkg.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm text-gray-600">
                          <div className={`mt-0.5 flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-${pkg.color}-100`}>
                            <Check size={12} className={`text-${pkg.color}-600 font-bold`} />
                          </div>
                          <span className="leading-tight">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleSelectPackage(pkg)}
                    className={`
                      w-full py-3.5 rounded-2xl font-bold text-sm text-white shadow-sm transition-all hover:shadow-md
                      bg-gradient-to-r ${pkg.gradientFrom} ${pkg.gradientTo}
                    `}
                  >
                    Chọn gói này
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Customer Info ───────────────────────────────── */}
        {step === 'customer_info' && selectedPkg && (
          <div className="max-w-4xl mx-auto animate-in slide-in-from-right-4 duration-300 fade-in">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col md:flex-row">
              
              {/* Left Panel: Package Summary */}
              <div className={`w-full md:w-2/5 p-8 bg-gradient-to-br ${selectedPkg.gradientFrom} ${selectedPkg.gradientTo} text-white flex flex-col justify-between`}>
                <div>
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
                    <Shield size={24} className="text-white" />
                  </div>
                  <h2 className="text-2xl font-extrabold mb-2">{selectedPkg.name}</h2>
                  <p className="text-white/80 text-sm mb-6">{selectedPkg.description}</p>
                  
                  <div className="bg-black/10 rounded-2xl p-4 backdrop-blur-sm mb-6 border border-white/10">
                    <p className="text-xs text-white/70 font-semibold mb-1 uppercase tracking-wide">Tổng thanh toán</p>
                    <p className="text-2xl font-black">{formatPrice(selectedPkg.price)}</p>
                  </div>
                </div>
                
                <div className="text-xs text-white/50 bg-black/5 p-3 rounded-xl border border-white/5">
                  Dữ liệu khách hàng sẽ được tự động đồng bộ sang Getfly CRM & gửi Zalo ZNS.
                </div>
              </div>

              {/* Right Panel: Form */}
              <div className="w-full md:w-3/5 p-8 lg:p-10">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <User size={20} className="text-gray-400" />
                  Thông tin khách hàng
                </h3>

                <form onSubmit={handleSubmitOrder} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Họ và tên <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text" 
                        required
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#1B2A4A]/20 focus:border-[#1B2A4A] transition-all outline-none"
                        placeholder="Nguyễn Văn A" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Số điện thoại <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                          type="tel" 
                          required
                          value={customerPhone}
                          onChange={e => setCustomerPhone(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#1B2A4A]/20 focus:border-[#1B2A4A] transition-all outline-none"
                          placeholder="0909 123 456" 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">CCCD / CMND</label>
                      <div className="relative">
                        <CreditCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                          type="text" 
                          value={customerId}
                          onChange={e => setCustomerId(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#1B2A4A]/20 focus:border-[#1B2A4A] transition-all outline-none"
                          placeholder="0790..." 
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Địa chỉ thường trú</label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                      <textarea 
                        rows={3}
                        value={customerAddress}
                        onChange={e => setCustomerAddress(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#1B2A4A]/20 focus:border-[#1B2A4A] transition-all outline-none resize-none"
                        placeholder="Số nhà, đường, phường/xã, quận/huyện..." 
                      />
                    </div>
                  </div>

                  <div className="pt-4 mt-2 border-t border-gray-100 flex justify-end gap-3">
                    <button 
                      type="button"
                      onClick={() => setStep('selection')}
                      className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Hủy & Chọn lại gói
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className={`
                        flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white shadow-md
                        bg-gradient-to-r ${selectedPkg.gradientFrom} ${selectedPkg.gradientTo}
                        hover:opacity-90 disabled:opacity-70 transition-all
                      `}
                    >
                      {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                      Xác nhận đăng ký / Ký kết
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Success ───────────────────────────────── */}
        {step === 'success' && selectedPkg && (
          <div className="max-w-2xl mx-auto text-center animate-in zoom-in-95 duration-500">
            <div className="bg-white rounded-3xl p-10 shadow-xl border border-emerald-100">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check size={40} className="text-emerald-500" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Đăng ký thành công!</h2>
              <p className="text-gray-500 mb-6">
                Hợp đồng cho gói <span className="font-bold text-gray-900">{selectedPkg.name}</span> của khách hàng <span className="font-bold text-gray-900">{customerName}</span> đã được ghi nhận.
              </p>
              
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 text-left mb-8 space-y-3">
                <p className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-2 mb-3">Luồng tự động hóa đang chạy ngầm:</p>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Check size={16} className="text-emerald-500 flex-shrink-0" />
                  <span>Dữ liệu đã truyền tới luồng <strong className="text-blue-600">n8n (New Customer)</strong></span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Check size={16} className="text-emerald-500 flex-shrink-0" />
                  <span>Đã tạo thẻ liên hệ (Deal) trên <strong className="text-blue-600">Getfly CRM</strong></span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Check size={16} className="text-emerald-500 flex-shrink-0" />
                  <span>Hệ thống <strong className="text-blue-600">Zalo ZNS</strong> đang chuẩn bị gửi tin nhắn lời chào</span>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <button 
                  onClick={() => router.push('/sales')}
                  className="px-6 py-3 border border-gray-200 rounded-xl font-bold text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Về màn hình chính
                </button>
                <button 
                  onClick={resetFlow}
                  className="px-6 py-3 bg-[#1B2A4A] rounded-xl font-bold text-sm text-white hover:bg-blue-900 transition-colors flex items-center gap-2 shadow-md"
                >
                  Tạo đơn mới <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </PageLayout>
  );
}
