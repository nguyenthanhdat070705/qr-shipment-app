'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import { Crown, ArrowLeft, Phone, Mail, MapPin, Calendar, User, FileText, Shield, Edit, Save, X, DollarSign, Printer, CreditCard, Package, Eye } from 'lucide-react';

interface MemberDetail {
  id: string;
  member_code: string;
  full_name: string;
  phone: string;
  email: string;
  id_number: string;
  address: string;
  registered_date: string;
  expiry_date: string;
  status: string;
  payment_method: string;
  consultant_name: string;
  branch: string;
  notes: string;
  created_at: string;
  service_package?: string;
  contract_number?: string;
  contact_channel?: string;
  referral_source?: string;
}

interface Beneficiary {
  id: string;
  full_name: string;
  id_number: string;
  address: string;
  relationship: string;
}

interface CareLog {
  id: string;
  contact_date: string;
  contact_type: string;
  notes: string;
  staff_name: string;
}

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [careLogs, setCareLogs] = useState<CareLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<MemberDetail>>({});

  // Care log form
  const [showCareForm, setShowCareForm] = useState(false);
  const [careForm, setCareForm] = useState({ contact_type: 'call', notes: '', staff_name: '' });
  const [careSubmitting, setCareSubmitting] = useState(false);

  useEffect(() => {
    fetchMember();
  }, [memberId]);

  async function fetchMember() {
    try {
      const res = await fetch(`/api/membership/detail?id=${memberId}`);
      const data = await res.json();
      if (data.member) {
        setMember(data.member);
        setEditForm(data.member);
      }
      if (data.beneficiaries) setBeneficiaries(data.beneficiaries);
      if (data.care_logs) setCareLogs(data.care_logs);
    } catch (err) {
      console.error('Failed to load member:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      const res = await fetch('/api/membership/detail', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: memberId, updates: editForm }),
      });
      if (res.ok) {
        setMember({ ...member!, ...editForm } as MemberDetail);
        setEditing(false);
      }
    } catch (err) {
      console.error('Save failed:', err);
    }
  }

  async function handleAddCareLog() {
    setCareSubmitting(true);
    try {
      const res = await fetch('/api/membership/care-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId, ...careForm }),
      });
      if (res.ok) {
        setShowCareForm(false);
        setCareForm({ contact_type: 'call', notes: '', staff_name: '' });
        fetchMember(); // reload
      }
    } catch (err) {
      console.error('Add care log failed:', err);
    } finally {
      setCareSubmitting(false);
    }
  }

  if (loading) {
    return (
      <PageLayout title="Chi tiết HV" icon={<Crown size={18} className="text-yellow-500" />}>
        <div className="flex items-center justify-center min-h-[50vh] text-gray-400">Đang tải...</div>
      </PageLayout>
    );
  }

  if (!member) {
    return (
      <PageLayout title="Chi tiết HV" icon={<Crown size={18} className="text-yellow-500" />}>
        <div className="flex items-center justify-center min-h-[50vh] text-gray-400">Không tìm thấy hội viên</div>
      </PageLayout>
    );
  }

  const statusMap: Record<string, { label: string; cls: string }> = {
    active: { label: 'Hoạt động', cls: 'bg-emerald-100 text-emerald-700' },
    pending: { label: 'Chờ duyệt', cls: 'bg-amber-100 text-amber-700' },
    expired: { label: 'Hết hạn', cls: 'bg-red-100 text-red-700' },
    terminated: { label: 'Đã kết thúc', cls: 'bg-gray-100 text-gray-700' },
  };
  const st = statusMap[member.status] || { label: member.status, cls: 'bg-gray-100 text-gray-600' };

  const daysActive = Math.floor((Date.now() - new Date(member.registered_date).getTime()) / 86400000);
  const discountPct = daysActive <= 60 ? 0 : daysActive <= 365 ? 5 : daysActive <= 1095 ? 7 : 10;

  return (
    <PageLayout title={member.full_name} icon={<Crown size={18} className="text-yellow-500" />}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/membership/list')} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-extrabold text-gray-900">{member.full_name}</h1>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
            </div>
            <p className="text-sm text-gray-500 font-mono">{member.member_code}</p>
          </div>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">
              <Edit size={14} /> Sửa
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"><X size={14} /> Hủy</button>
              <button onClick={handleSave} className="flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"><Save size={14} /> Lưu</button>
            </div>
          )}
        </div>

        {/* Info Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-[11px] font-semibold text-gray-500 uppercase">Mã Hội Viên</p>
            <p className="text-lg font-extrabold text-gray-900 mt-1 font-mono">{member.member_code}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-[11px] font-semibold text-gray-500 uppercase">Ngày tham gia</p>
            <p className="text-lg font-extrabold text-gray-900 mt-1">{new Date(member.registered_date).toLocaleDateString('vi-VN')}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-[11px] font-semibold text-gray-500 uppercase">Hết hạn</p>
            <p className="text-lg font-extrabold text-gray-900 mt-1">{member.expiry_date ? new Date(member.expiry_date).toLocaleDateString('vi-VN') : '—'}</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl p-4 text-white">
            <p className="text-[11px] font-semibold text-white/70 uppercase">Chiết khấu hiện tại</p>
            <p className="text-2xl font-extrabold mt-1">{discountPct}%</p>
            <p className="text-[10px] text-white/60">{daysActive} ngày hoạt động</p>
          </div>
        </div>

        {/* Contract Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h2 className="font-bold text-gray-800">📋 Thông tin hợp đồng</h2>
            <div className="flex gap-2">
              {/* Nếu đã có Drive folder ID → mở folder riêng của HV */}
              {member.contract_number && member.contract_number.length > 20 ? (
                <a
                  href={`https://drive.google.com/drive/folders/${member.contract_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-colors"
                >
                  <Eye size={13} /> Mở Folder Hợp Đồng
                </a>
              ) : (
                /* Nếu chưa có → nút tạo folder mới */
                <button
                  onClick={async () => {
                    const btn = document.activeElement as HTMLButtonElement;
                    if (btn) btn.disabled = true;
                    try {
                      const res = await fetch('/api/membership/create-folder', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          member_id: memberId,
                          member_code: member.member_code,
                          full_name: member.full_name,   // ← gửi tên để đặt tên folder
                        }),
                      });
                      const data = await res.json();
                      if (data.folder_id) {
                        alert(`✅ Đã tạo folder: "${data.folder_name}"\nĐang mở Google Drive...`);
                        window.open(`https://drive.google.com/drive/folders/${data.folder_id}`, '_blank');
                        fetchMember(); // reload để cập nhật contract_number
                      } else {
                        alert('❌ Không thể tạo folder:\n' + (data.error || 'Lỗi hệ thống') + (data.debug ? `\n\nDebug: ${JSON.stringify(data.debug)}` : ''));
                      }
                    } finally {
                      if (btn) btn.disabled = false;
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-600 text-xs font-semibold hover:bg-green-100 transition-colors"
                >
                  <Eye size={13} /> Tạo Folder Drive
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-600 text-xs font-semibold hover:bg-violet-100 transition-colors"
              >
                <Printer size={13} /> In hợp đồng
              </button>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-500 flex-shrink-0"><Package size={18} /></div>
              <div>
                <p className="text-xs text-gray-500">Gói dịch vụ</p>
                <p className="text-sm font-bold text-gray-800">{{
                  tieu_chuan: 'Tiêu Chuẩn (2,000,000đ)',
                  cao_cap: 'Cao Cấp (5,000,000đ)',
                  dac_biet: 'Đặc Biệt (10,000,000đ)',
                  gia_dinh: 'Gia Đình (8,000,000đ)',
                }[member.service_package || ''] || member.service_package || 'Chưa xác định'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500 flex-shrink-0"><FileText size={18} /></div>
              <div>
                <p className="text-xs text-gray-500">Số hợp đồng</p>
                <p className="text-sm font-bold text-gray-800 font-mono">{member.contract_number || member.member_code}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500 flex-shrink-0"><CreditCard size={18} /></div>
              <div>
                <p className="text-xs text-gray-500">Phương thức thanh toán</p>
                <p className="text-sm font-bold text-gray-800">{{
                  transfer: 'Chuyển khoản',
                  cash: 'Tiền mặt',
                  installment: 'Trả góp',
                }[member.payment_method] || member.payment_method || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 flex-shrink-0"><Calendar size={18} /></div>
              <div>
                <p className="text-xs text-gray-500">Thời hạn hợp đồng</p>
                <p className="text-sm font-bold text-gray-800">10 năm</p>
                <p className="text-[10px] text-gray-400">{member.registered_date ? new Date(member.registered_date).toLocaleDateString('vi-VN') : ''} → {member.expiry_date ? new Date(member.expiry_date).toLocaleDateString('vi-VN') : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500 flex-shrink-0"><User size={18} /></div>
              <div>
                <p className="text-xs text-gray-500">NV tư vấn</p>
                <p className="text-sm font-bold text-gray-800">{member.consultant_name || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-500 flex-shrink-0"><Shield size={18} /></div>
              <div>
                <p className="text-xs text-gray-500">Chi nhánh</p>
                <p className="text-sm font-bold text-gray-800">{member.branch || '—'}</p>
              </div>
            </div>
          </div>
          {member.notes && (
            <div className="px-6 pb-5">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 mb-1">Ghi chú</p>
                <p className="text-sm text-gray-700">{member.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Personal Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-bold text-gray-800">👤 Thông tin cá nhân</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {editing ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Họ tên</label>
                  <input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm" value={editForm.full_name || ''} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">SĐT</label>
                  <input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm" value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email</label>
                  <input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">CCCD</label>
                  <input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm" value={editForm.id_number || ''} onChange={e => setEditForm({ ...editForm, id_number: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Địa chỉ</label>
                  <input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm" value={editForm.address || ''} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Trạng thái</label>
                  <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white" value={editForm.status || ''} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                    <option value="active">Hoạt động</option>
                    <option value="pending">Chờ duyệt</option>
                    <option value="expired">Hết hạn</option>
                    <option value="terminated">Đã kết thúc</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3"><Phone size={16} className="text-gray-400" /><div><p className="text-xs text-gray-500">Điện thoại</p><p className="text-sm font-semibold text-gray-800">{member.phone || '—'}</p></div></div>
                <div className="flex items-center gap-3"><Mail size={16} className="text-gray-400" /><div><p className="text-xs text-gray-500">Email</p><p className="text-sm font-semibold text-gray-800">{member.email || '—'}</p></div></div>
                <div className="flex items-center gap-3"><FileText size={16} className="text-gray-400" /><div><p className="text-xs text-gray-500">CCCD/CMND</p><p className="text-sm font-semibold text-gray-800">{member.id_number || '—'}</p></div></div>
                <div className="flex items-center gap-3"><MapPin size={16} className="text-gray-400" /><div><p className="text-xs text-gray-500">Địa chỉ</p><p className="text-sm font-semibold text-gray-800">{member.address || '—'}</p></div></div>
                <div className="flex items-center gap-3"><User size={16} className="text-gray-400" /><div><p className="text-xs text-gray-500">NV Tư vấn</p><p className="text-sm font-semibold text-gray-800">{member.consultant_name || '—'}</p></div></div>
                <div className="flex items-center gap-3"><Shield size={16} className="text-gray-400" /><div><p className="text-xs text-gray-500">Chi nhánh</p><p className="text-sm font-semibold text-gray-800">{member.branch || '—'}</p></div></div>
              </>
            )}
          </div>
        </div>

        {/* Beneficiaries */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-bold text-gray-800">👨‍👩‍👧 Người thụ hưởng</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {beneficiaries.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">Chưa có người thụ hưởng</div>
            ) : (
              beneficiaries.map(b => (
                <div key={b.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold text-sm flex-shrink-0">{b.full_name.charAt(0)}</div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-800">{b.full_name}</p>
                    <div className="text-xs text-gray-500 flex gap-3">
                      {b.relationship && <span>Quan hệ: {b.relationship}</span>}
                      {b.id_number && <span>CCCD: {b.id_number}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Care Logs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h2 className="font-bold text-gray-800">📞 Lịch sử chăm sóc</h2>
            <button onClick={() => setShowCareForm(!showCareForm)}
              className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-colors">
              + Thêm
            </button>
          </div>

          {showCareForm && (
            <div className="px-6 py-4 bg-blue-50/30 border-b border-blue-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
                  value={careForm.contact_type} onChange={e => setCareForm({ ...careForm, contact_type: e.target.value })}>
                  <option value="call">📞 Gọi điện</option>
                  <option value="zalo">💬 Zalo</option>
                  <option value="sms">📱 SMS</option>
                  <option value="email">📧 Email</option>
                  <option value="visit">🏠 Gặp mặt</option>
                </select>
                <input className="px-3 py-2 rounded-xl border border-gray-200 text-sm" placeholder="Tên nhân viên"
                  value={careForm.staff_name} onChange={e => setCareForm({ ...careForm, staff_name: e.target.value })} />
                <input className="px-3 py-2 rounded-xl border border-gray-200 text-sm" placeholder="Ghi chú nội dung"
                  value={careForm.notes} onChange={e => setCareForm({ ...careForm, notes: e.target.value })} />
              </div>
              <button onClick={handleAddCareLog} disabled={careSubmitting}
                className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50">
                {careSubmitting ? 'Đang lưu...' : 'Lưu lịch sử'}
              </button>
            </div>
          )}

          <div className="divide-y divide-gray-50">
            {careLogs.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">Chưa có lịch sử chăm sóc</div>
            ) : (
              careLogs.map(log => {
                const typeIcons: Record<string, string> = { call: '📞', zalo: '💬', sms: '📱', email: '📧', visit: '🏠' };
                return (
                  <div key={log.id} className="px-6 py-3.5 flex items-start gap-3">
                    <span className="text-lg">{typeIcons[log.contact_type] || '📋'}</span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-800">{log.notes || 'Không có ghi chú'}</p>
                      <div className="flex gap-3 text-xs text-gray-500 mt-1">
                        <span><Calendar size={10} className="inline mr-0.5" />{new Date(log.contact_date).toLocaleDateString('vi-VN')}</span>
                        {log.staff_name && <span>NV: {log.staff_name}</span>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
