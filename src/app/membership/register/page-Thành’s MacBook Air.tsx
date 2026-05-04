'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import MemberPrintForm from '@/components/MemberPrintForm';
import { Crown, ArrowLeft, CheckCircle, Printer, ArrowRight } from 'lucide-react';

interface Beneficiary {
  full_name: string;
  id_number: string;
  address: string;
  relationship: string;
}

export default function RegisterMemberPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [memberCode, setMemberCode] = useState('');
  const [showPrintForm, setShowPrintForm] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    id_number: '',
    id_issue_date: '',
    id_issue_place: '',
    email: '',
    address: '',
    registered_date: new Date().toISOString().slice(0, 10),
    payment_method: 'transfer',
    consultant_name: '',
    branch: 'CN1',
    notes: '',
    // New fields matching GetFly
    service_package: 'tieu_chuan',
    contract_number: '',
    contact_channel: '',
    referral_source: '',
  });

  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([
    { full_name: '', id_number: '', address: '', relationship: '' },
    { full_name: '', id_number: '', address: '', relationship: '' },
  ]);

  function updateBen(i: number, field: keyof Beneficiary, val: string) {
    const updated = [...beneficiaries];
    updated[i] = { ...updated[i], [field]: val };
    setBeneficiaries(updated);
  }

  // Compute expiry date (10 years from registration)
  const expiryDateISO = form.registered_date
    ? new Date(new Date(form.registered_date).setFullYear(new Date(form.registered_date).getFullYear() + 10)).toISOString().slice(0, 10)
    : '';

  const expiryDate = form.registered_date
    ? new Date(new Date(form.registered_date).setFullYear(new Date(form.registered_date).getFullYear() + 10)).toLocaleDateString('vi-VN')
    : '—';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.full_name || !form.phone) {
      setError('Vui lòng điền đầy đủ họ tên và số điện thoại');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/membership/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member: form,
          beneficiaries: beneficiaries.filter(b => b.full_name.trim()),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Đăng ký thất bại');

      setMemberCode(data.member_code || '');
      setSuccess(true);
      // Do NOT auto-redirect — let user print first
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  // Build print data
  const printData = {
    member_code: memberCode,
    full_name: form.full_name,
    id_number: form.id_number,
    id_issue_date: form.id_issue_date,
    id_issue_place: form.id_issue_place,
    phone: form.phone,
    email: form.email,
    address: form.address,
    registered_date: form.registered_date,
    expiry_date: expiryDateISO,
    payment_method: form.payment_method,
    service_package: form.service_package,
    contract_number: form.contract_number,
    consultant_name: form.consultant_name,
    branch: form.branch,
    beneficiaries: beneficiaries.filter(b => b.full_name.trim()),
  };

  // ═══════════════════════════════
  // SUCCESS SCREEN
  // ═══════════════════════════════
  if (success) {
    return (
      <PageLayout title="Đăng ký HV" icon={<Crown size={18} className="text-yellow-500" />}>
        {/* Print Form Overlay */}
        {showPrintForm && (
          <MemberPrintForm 
            data={printData}
            onClose={() => setShowPrintForm(false)}
          />
        )}

        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 mx-auto mb-4">
              <CheckCircle size={40} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900">Đăng ký thành công!</h2>
            <p className="text-sm text-gray-500 mt-2">
              Hội viên <strong className="text-gray-800">{form.full_name}</strong> đã được thêm vào hệ thống
            </p>
            {memberCode && (
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                <Crown size={14} className="text-amber-600" />
                <span className="text-sm font-bold text-amber-800 font-mono">{memberCode}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={() => setShowPrintForm(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
              >
                <Printer size={16} />
                In Phiếu Đăng Ký Hội Viên
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSuccess(false);
                    setMemberCode('');
                    setForm({
                      full_name: '', phone: '', id_number: '', id_issue_date: '', id_issue_place: '', email: '', address: '',
                      registered_date: new Date().toISOString().slice(0, 10),
                      payment_method: 'transfer', consultant_name: '', branch: 'CN1', notes: '',
                      service_package: 'tieu_chuan', contract_number: '', contact_channel: '', referral_source: '',
                    });
                    setBeneficiaries([
                      { full_name: '', id_number: '', address: '', relationship: '' },
                      { full_name: '', id_number: '', address: '', relationship: '' },
                    ]);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all"
                >
                  <ArrowRight size={14} />
                  Đăng ký HV tiếp
                </button>
                <button
                  onClick={() => router.push('/membership/list')}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1B2A4A] text-white rounded-xl font-bold text-sm hover:bg-[#243656] transition-all"
                >
                  Danh sách HV
                </button>
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  // ═══════════════════════════════
  // REGISTRATION FORM
  // ═══════════════════════════════
  return (
    <PageLayout title="Đăng ký HV mới" icon={<Crown size={18} className="text-yellow-500" />}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Đăng Ký Hội Viên Mới</h1>
            <p className="text-sm text-gray-500">Chương trình Hội Viên Trăm Tuổi — Phí 2,000,000đ / 10 năm</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Thông tin cá nhân */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-bold text-gray-800">👤 Thông Tin Người Đăng Ký</h2>
              <p className="text-xs text-gray-500 mt-0.5">Thông tin cá nhân của người đứng tên hội viên</p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Họ và Tên <span className="text-red-500">*</span></label>
                <input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all"
                  value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="Nguyễn Văn A" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Số Điện Thoại <span className="text-red-500">*</span></label>
                <input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all"
                  value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="09xx xxx xxx" type="tel" required />
                <p className="text-[11px] text-gray-400 mt-1">Dùng làm Mã Hội Viên</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">CCCD / CMND</label>
                <input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all"
                  value={form.id_number} onChange={e => setForm({...form, id_number: e.target.value})} placeholder="079xxxxxxxxx" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Ngày Cấp</label>
                <input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all"
                  type="date" value={form.id_issue_date} onChange={e => setForm({...form, id_issue_date: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nơi Cấp</label>
                <input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all"
                  value={form.id_issue_place} onChange={e => setForm({...form, id_issue_place: e.target.value})} placeholder="Cục CS QLHC về TTXH" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email</label>
                <input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all"
                  value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@gmail.com" type="email" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Địa Chỉ</label>
                <input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all"
                  value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Số nhà, đường, phường, quận, tỉnh/thành phố" />
              </div>
            </div>
          </div>

          {/* Section 2: Chương trình HV */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-bold text-gray-800">🏷 Thông Tin Chương Trình</h2>
              <p className="text-xs text-gray-500 mt-0.5">Phí tham gia 2,000,000đ · Thời hạn 10 năm · Hết hạn: {expiryDate}</p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Gói Dịch Vụ <span className="text-red-500">*</span></label>
                <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all bg-white"
                  value={form.service_package} onChange={e => setForm({...form, service_package: e.target.value})}>
                  <option value="tieu_chuan">Tiêu Chuẩn</option>
                  <option value="cao_cap">Cao Cấp</option>
                  <option value="dac_biet">Đặc Biệt</option>
                  <option value="gia_dinh">Gói Gia Đình</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Số Hợp Đồng</label>
                <input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all"
                  value={form.contract_number} onChange={e => setForm({...form, contract_number: e.target.value})} placeholder="HĐ-2026-001" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Ngày Đăng Ký <span className="text-red-500">*</span></label>
                <input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all"
                  type="date" value={form.registered_date} onChange={e => setForm({...form, registered_date: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Hình Thức Thanh Toán <span className="text-red-500">*</span></label>
                <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all bg-white"
                  value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}>
                  <option value="transfer">🏦 Chuyển khoản</option>
                  <option value="cash">💵 Tiền mặt</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Kênh Tiếp Cận</label>
                <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all bg-white"
                  value={form.contact_channel} onChange={e => setForm({...form, contact_channel: e.target.value})}>
                  <option value="">Chọn kênh</option>
                  <option value="zalo">Zalo OA</option>
                  <option value="facebook">Facebook / Instagram</option>
                  <option value="referral">Referral (Giới thiệu)</option>
                  <option value="event">Event / Hội thảo</option>
                  <option value="hotline">Hotline</option>
                  <option value="website">Website</option>
                  <option value="walkin">Walk-in</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nguồn Giới Thiệu</label>
                <input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all"
                  value={form.referral_source} onChange={e => setForm({...form, referral_source: e.target.value})} placeholder="Tên người giới thiệu" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nhân Viên Tư Vấn</label>
                <input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all"
                  value={form.consultant_name} onChange={e => setForm({...form, consultant_name: e.target.value})} placeholder="Tên nhân viên" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Chi Nhánh</label>
                <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all bg-white"
                  value={form.branch} onChange={e => setForm({...form, branch: e.target.value})}>
                  <option value="CN1">CN1</option>
                  <option value="CN2">CN2</option>
                  <option value="CN3">CN3</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Ghi Chú</label>
                <textarea className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all resize-none"
                  rows={3} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Ghi chú thêm..." />
              </div>
            </div>
          </div>

          {/* Section 3: Người thụ hưởng */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-bold text-gray-800">👨‍👩‍👧 Đối Tượng Thụ Hưởng Quyền Lợi</h2>
              <p className="text-xs text-gray-500 mt-0.5">Tối đa 2 người · Quyền lợi chỉ áp dụng 1 lần duy nhất</p>
            </div>
            <div className="p-6 space-y-6">
              {beneficiaries.map((b, i) => (
                <div key={i}>
                  {i > 0 && <hr className="mb-6 border-gray-100" />}
                  <p className="text-sm font-bold text-gray-700 mb-3">
                    Người thụ hưởng {i + 1} {i === 1 && <span className="text-xs font-normal text-gray-400">(Tùy chọn)</span>}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Họ và Tên {i === 0 && <span className="text-red-500">*</span>}</label>
                      <input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all"
                        value={b.full_name} onChange={e => updateBen(i, 'full_name', e.target.value)} placeholder="Họ tên đầy đủ" required={i === 0} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Mối Quan Hệ</label>
                      <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all bg-white"
                        value={b.relationship} onChange={e => updateBen(i, 'relationship', e.target.value)}>
                        <option value="">Chọn</option>
                        <option value="Bản thân">Bản thân</option>
                        <option value="Vợ/Chồng">Vợ/Chồng</option>
                        <option value="Cha">Cha</option>
                        <option value="Mẹ">Mẹ</option>
                        <option value="Con">Con</option>
                        <option value="Anh/Chị/Em">Anh/Chị/Em</option>
                        <option value="Ông/Bà">Ông/Bà</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">CCCD / CMND</label>
                      <input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all"
                        value={b.id_number} onChange={e => updateBen(i, 'id_number', e.target.value)} placeholder="079xxxxxxxxx" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Địa Chỉ</label>
                      <input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all"
                        value={b.address} onChange={e => updateBen(i, 'address', e.target.value)} placeholder="Địa chỉ" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bank Info */}
          <div className="bg-gradient-to-br from-[#1B2A4A] to-indigo-800 rounded-2xl p-6 text-white">
            <p className="font-bold text-sm mb-3">🏦 Thông Tin Chuyển Khoản</p>
            <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <span className="text-white/60">Chủ TK:</span><span className="font-bold">CÔNG TY CỔ PHẦN DỊCH VỤ TANG LỄ BLACKSTONES</span>
              <span className="text-white/60">Số TK:</span><span className="font-bold font-mono">053 100 00 2 19 19</span>
              <span className="text-white/60">Ngân hàng:</span><span className="font-bold">Vietcombank</span>
              <span className="text-white/60">Nội dung:</span><span className="font-bold text-yellow-300">[Họ tên HV] chuyển tiền hội viên</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            {error && (
              <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm font-semibold text-red-600">
                ⚠️ {error}
              </div>
            )}
            <div className="flex gap-3 ml-auto">
              <button type="button" onClick={() => router.back()}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Hủy
              </button>
              <button type="submit" disabled={loading}
                className="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Đang lưu...' : '✅ Xác Nhận Đăng Ký'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}
