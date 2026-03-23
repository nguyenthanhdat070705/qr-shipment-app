'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, User, Mail, Phone, Briefcase, Building2,
  FileText, Save, CheckCircle, AlertCircle, Loader2,
  Package, Calendar, Clock, Hash, Edit3, X, Truck
} from 'lucide-react';

interface UserProfile {
  email: string;
  ho_ten: string;
  chuc_vu: string;
  so_dien_thoai: string;
  phong_ban: string;
  ghi_chu: string;
}

interface ExportRecord {
  stt: number;
  ma_san_pham: string;
  ho_ten: string;
  email: string;
  chuc_vu: string;
  ghi_chu: string;
  ngay_xuat: string;
  thoi_gian_xuat: string;
  created_at: string;
}

function formatDate(iso: string): string {
  try {
    if (!iso) return '—';
    const d = new Date(iso.includes('T') ? iso : iso + 'T00:00:00');
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso || '—';
  }
}

function formatTime(time: string): string {
  if (!time) return '—';
  return time.slice(0, 5);
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [profile, setProfile] = useState<UserProfile>({
    email: '',
    ho_ten: '',
    chuc_vu: '',
    so_dien_thoai: '',
    phong_ban: '',
    ghi_chu: '',
  });

  const [editProfile, setEditProfile] = useState<UserProfile>({ ...profile });
  const [exports, setExports] = useState<ExportRecord[]>([]);
  const [totalExports, setTotalExports] = useState(0);

  // Load user profile on mount
  useEffect(() => {
    async function loadProfile() {
      try {
        const raw = localStorage.getItem('auth_user');
        if (!raw) return;
        const u = JSON.parse(raw);
        const email = u.email || '';

        const res = await fetch(`/api/profile?email=${encodeURIComponent(email)}`);
        const data = await res.json();

        if (data.profile) {
          const p: UserProfile = {
            email: data.profile.email || email,
            ho_ten: data.profile.ho_ten || '',
            chuc_vu: data.profile.chuc_vu || '',
            so_dien_thoai: data.profile.so_dien_thoai || '',
            phong_ban: data.profile.phong_ban || '',
            ghi_chu: data.profile.ghi_chu || '',
          };
          setProfile(p);
          setEditProfile(p);
        }

        if (data.exportHistory) {
          setExports(data.exportHistory);
        }
        setTotalExports(data.totalExports || 0);
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editProfile),
      });

      const data = await res.json();
      if (data.success) {
        setProfile({ ...editProfile });
        setEditing(false);
        setSaveMsg({ type: 'success', text: 'Cập nhật thành công!' });
        setTimeout(() => setSaveMsg(null), 3000);
      } else if (data.needsSetup) {
        setSaveMsg({
          type: 'error',
          text: 'Bảng dữ liệu chưa được tạo. Vui lòng liên hệ quản trị viên để thiết lập database.',
        });
      } else {
        setSaveMsg({ type: 'error', text: data.error || 'Lỗi khi cập nhật.' });
      }
    } catch {
      setSaveMsg({ type: 'error', text: 'Lỗi kết nối mạng.' });
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setEditProfile({ ...profile });
    setEditing(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={32} className="animate-spin text-[#2d4a7a]" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} />
            Trang chủ
          </Link>
          <Image
            src="/blackstones-logo.webp"
            alt="Blackstones"
            width={110}
            height={24}
            style={{ height: 'auto', filter: 'invert(1) brightness(0.2)' }}
          />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* ── Profile Card ────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Profile header with avatar */}
          <div className="bg-gradient-to-r from-[#1B2A4A] to-teal-500 px-6 py-8">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm text-white text-2xl font-extrabold border border-white/30">
                {(profile.ho_ten || profile.email)[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white">
                  {profile.ho_ten || profile.email.split('@')[0]}
                </h1>
                <p className="text-sm text-white/70">{profile.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-semibold text-white">
                    <Package size={11} />
                    {totalExports} đơn đã xuất
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile fields */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900">Thông tin cá nhân</h2>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#1B2A4A] bg-[#eef1f7] hover:bg-[#d5dbe9] transition-colors"
                >
                  <Edit3 size={13} />
                  Chỉnh sửa
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <X size={13} />
                    Hủy
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#1B2A4A] hover:bg-[#162240] disabled:opacity-60 transition-colors"
                  >
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    Lưu
                  </button>
                </div>
              )}
            </div>

            {/* Save message */}
            {saveMsg && (
              <div className={`flex items-center gap-2 rounded-xl px-4 py-3 mb-4 text-sm font-medium
                ${saveMsg.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
                }`}
              >
                {saveMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                {saveMsg.text}
              </div>
            )}

            <div className="space-y-4">
              {/* Họ tên */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-400 flex-shrink-0 mt-0.5">
                  <User size={16} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                    Họ và tên
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={editProfile.ho_ten}
                      onChange={(e) => setEditProfile({ ...editProfile, ho_ten: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d4a7a] focus:border-transparent"
                      placeholder="Nhập họ và tên"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-800">{profile.ho_ten || '—'}</p>
                  )}
                </div>
              </div>

              {/* Email (read-only) */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-400 flex-shrink-0 mt-0.5">
                  <Mail size={16} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                    Email
                  </label>
                  <p className="text-sm font-medium text-gray-800">{profile.email}</p>
                </div>
              </div>

              {/* Chức vụ */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-400 flex-shrink-0 mt-0.5">
                  <Briefcase size={16} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                    Chức vụ
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={editProfile.chuc_vu}
                      onChange={(e) => setEditProfile({ ...editProfile, chuc_vu: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d4a7a] focus:border-transparent"
                      placeholder="VD: Thủ kho, Quản lý..."
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-800">{profile.chuc_vu || '—'}</p>
                  )}
                </div>
              </div>

              {/* Số điện thoại */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-400 flex-shrink-0 mt-0.5">
                  <Phone size={16} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                    Số điện thoại
                  </label>
                  {editing ? (
                    <input
                      type="tel"
                      value={editProfile.so_dien_thoai}
                      onChange={(e) => setEditProfile({ ...editProfile, so_dien_thoai: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d4a7a] focus:border-transparent"
                      placeholder="0xxx xxx xxx"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-800">{profile.so_dien_thoai || '—'}</p>
                  )}
                </div>
              </div>

              {/* Phòng ban */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-400 flex-shrink-0 mt-0.5">
                  <Building2 size={16} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                    Phòng ban
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={editProfile.phong_ban}
                      onChange={(e) => setEditProfile({ ...editProfile, phong_ban: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d4a7a] focus:border-transparent"
                      placeholder="VD: Kho vận, Kinh doanh..."
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-800">{profile.phong_ban || '—'}</p>
                  )}
                </div>
              </div>

              {/* Ghi chú */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-400 flex-shrink-0 mt-0.5">
                  <FileText size={16} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                    Ghi chú
                  </label>
                  {editing ? (
                    <textarea
                      value={editProfile.ghi_chu}
                      onChange={(e) => setEditProfile({ ...editProfile, ghi_chu: e.target.value })}
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d4a7a] focus:border-transparent resize-none"
                      placeholder="Ghi chú thêm..."
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-800">{profile.ghi_chu || '—'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Export History ───────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                  <Truck size={20} className="text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Lịch sử xuất hàng</h2>
                  <p className="text-xs text-gray-400">Tổng cộng {totalExports} đơn hàng đã xuất</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-bold">
                <Package size={14} />
                {totalExports}
              </span>
            </div>
          </div>

          {exports.length === 0 ? (
            <div className="p-8 text-center">
              <Package size={36} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-400">Chưa có đơn hàng nào được xuất</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {exports.map((exp, i) => (
                <div key={exp.stt || i} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef1f7] text-[#2d4a7a] flex-shrink-0 mt-0.5">
                        <Hash size={16} />
                      </div>
                      <div>
                        <Link
                          href={`/product/${encodeURIComponent(exp.ma_san_pham)}`}
                          className="text-sm font-bold text-[#1B2A4A] hover:text-[#111a33] transition-colors"
                        >
                          {exp.ma_san_pham}
                        </Link>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={11} />
                            {formatDate(exp.ngay_xuat)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock size={11} />
                            {formatTime(exp.thoi_gian_xuat)}
                          </span>
                        </div>
                        {exp.ghi_chu && (
                          <p className="text-xs text-gray-500 mt-1">
                            <FileText size={10} className="inline mr-1" />
                            {exp.ghi_chu}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-300 bg-gray-50 px-2 py-1 rounded-lg">
                      #{exp.stt}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
