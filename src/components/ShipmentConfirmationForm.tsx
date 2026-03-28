'use client';

import { useState, useEffect, FormEvent } from 'react';
import type { ConfirmShipmentResponse } from '@/types';
import {
  Send, CheckCircle, AlertCircle, Loader2, Lock,
  Calendar, Clock, Hash, User, Mail, Package, FileText
} from 'lucide-react';

interface ShipmentConfirmationFormProps {
  qrCode: string;
  productName: string;
  currentStatus: string;
  onConfirmed?: (hoTen: string, email: string) => void;
}

type FormState = 'idle' | 'submitting' | 'success' | 'error';

interface SuccessData {
  hoTen: string;
  email: string;
  ngayXuat: string;
  thoiGianXuat: string;
  createdAt: string;
  stt: number;
  maDam?: string;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch { return iso; }
}

function formatTime(timeStr: string): string {
  return timeStr?.slice(0, 5) ?? timeStr;
}

export default function ShipmentConfirmationForm({
  qrCode,
  productName,
  currentStatus,
  onConfirmed,
}: ShipmentConfirmationFormProps) {
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userDepartment, setUserDepartment] = useState('');

  // Mã đám — bắt buộc nhập
  const [maDam, setMaDam] = useState('');

  // Live clock
  const [nowStr, setNowStr] = useState('');
  useEffect(() => {
    const fmt = () => {
      const now = new Date();
      const time = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const date = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      setNowStr(`${time} — ${date}`);
    };
    fmt();
    const id = setInterval(fmt, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        setUserEmail(u.email || '');
        setUserName(u.ho_ten || (u.email || '').split('@')[0] || '');
        setUserDepartment(u.phong_ban || 'Bộ phận xuất kho');
      }
    } catch { /* ignore */ }
  }, []);

  const isAlreadyExported = currentStatus === 'exported';

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!maDam.trim()) {
      setErrorMsg('Vui lòng nhập Mã Đám trước khi xác nhận xuất hàng.');
      setFormState('error');
      return;
    }

    setFormState('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('/api/confirm-shipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrCode,
          hoTen: userName || userEmail.split('@')[0] || 'Nhân viên',
          email: userEmail,
          chucVu: userDepartment || 'Nhân viên xuất kho',
          maSanPhamXacNhan: qrCode,
          maDonHang: maDam.trim(),
          soLuong: 1,
          note: `Xuất kho SP: ${productName} — Đám: ${maDam.trim()}`,
        }),
      });

      const data: ConfirmShipmentResponse = await res.json();

      if (!data.success) {
        const viMessages: Record<string, string> = {
          VALIDATION_ERROR:  data.error,
          PRODUCT_NOT_FOUND: 'Không tìm thấy sản phẩm với mã này.',
          ALREADY_EXPORTED:  'Sản phẩm này đã được xuất kho trước đó.',
          DATABASE_ERROR:    data.error || 'Lỗi cơ sở dữ liệu.',
          INTERNAL_ERROR:    'Lỗi hệ thống.',
        };
        setErrorMsg(viMessages[data.code] ?? data.error);
        setFormState('error');
        return;
      }

      // ── Trừ tồn kho ngay lập tức ──────────────────────────────────
      try {
        await fetch('/api/inventory/deduct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ma_hom: qrCode, quantity: 1 }),
        });
      } catch (deductErr) {
        // Không block UI nếu deduct lỗi — đã được log server-side
        console.warn('Inventory deduct call failed (non-blocking):', deductErr);
      }

      setSuccessData({
        hoTen:        data.confirmation.ho_ten,
        email:        data.confirmation.email,
        ngayXuat:     data.confirmation.ngay_xuat,
        thoiGianXuat: data.confirmation.thoi_gian_xuat,
        createdAt:    data.confirmation.created_at,
        stt:          data.confirmation.stt,
        maDam:        maDam.trim(),
      });
      setFormState('success');
      onConfirmed?.(userName, userEmail);
    } catch {
      setErrorMsg('Lỗi kết nối mạng. Vui lòng thử lại.');
      setFormState('error');
    }
  }

  // ── Đã xuất kho ─────────────────────────────────────
  if (isAlreadyExported) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
        <div className="flex items-center gap-3 mb-2">
          <Lock size={20} className="text-green-600 flex-shrink-0" />
          <h3 className="font-semibold text-green-800 text-base">Đã xuất kho</h3>
        </div>
        <p className="text-sm text-green-700">
          Sản phẩm <strong>{productName}</strong> đã được xác nhận xuất kho.
          Không thể xác nhận thêm lần nữa.
        </p>
      </div>
    );
  }

  // ── Thành công ───────────────────────────────────────
  if (formState === 'success' && successData) {
    return (
      <div className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100">
            <CheckCircle size={24} className="text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-green-800 text-base">Xuất hàng thành công!</h3>
            <p className="text-xs text-green-600">Đã lưu vào hệ thống — Tồn kho đã được cập nhật</p>
          </div>
        </div>

        <div className="bg-white/70 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-sm">
            <Hash size={14} className="text-green-500 flex-shrink-0" />
            <span className="text-gray-500 font-medium w-28">STT:</span>
            <span className="font-bold text-gray-800">#{successData.stt}</span>
          </div>
          {successData.maDam && (
            <div className="flex items-center gap-2 text-sm">
              <FileText size={14} className="text-green-500 flex-shrink-0" />
              <span className="text-gray-500 font-medium w-28">Mã Đám:</span>
              <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-mono">{successData.maDam}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <User size={14} className="text-green-500 flex-shrink-0" />
            <span className="text-gray-500 font-medium w-28">Người xuất:</span>
            <span className="font-medium text-gray-800">{successData.hoTen}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail size={14} className="text-green-500 flex-shrink-0" />
            <span className="text-gray-500 font-medium w-28">Email:</span>
            <span className="font-medium text-gray-800 break-all">{successData.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={14} className="text-green-500 flex-shrink-0" />
            <span className="text-gray-500 font-medium w-28">Ngày xuất:</span>
            <span className="font-medium text-gray-800">{formatDate(successData.ngayXuat)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock size={14} className="text-green-500 flex-shrink-0" />
            <span className="text-gray-500 font-medium w-28">Thời gian:</span>
            <span className="font-medium text-gray-800">{formatTime(successData.thoiGianXuat)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Package size={14} className="text-green-500 flex-shrink-0" />
            <span className="text-gray-500 font-medium w-28">Số lượng:</span>
            <span className="font-medium text-gray-800">1</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Form nhập liệu ────────────────────────
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
      <div className="mb-4">
        <h3 className="text-base font-bold text-gray-900">Xác nhận xuất hàng</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          Vui lòng kiểm tra lại thông tin và xác nhận xuất khẩu cho sản phẩm <strong>{productName}</strong>.
        </p>
      </div>

      {/* Auto-filled info */}
      <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 mb-4 space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <User size={12} className="text-gray-400" />
          <span className="text-gray-400 w-24">Người xuất:</span>
          <span className="font-medium text-gray-700">
            {userName ? `${userName} (${userDepartment})` : 'Đang tải...'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Clock size={12} className="text-gray-400" />
          <span className="text-gray-400 w-24">Thời gian:</span>
          <span className="font-mono font-bold text-indigo-700 tabular-nums">{nowStr}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Package size={12} className="text-gray-400" />
          <span className="text-gray-400 w-24">Số lượng:</span>
          <span className="font-medium text-gray-700">1</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">

        {/* ── Mã Đám — bắt buộc ── */}
        <div>
          <label htmlFor="ma-dam-input" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
            Mã Đám <span className="text-red-500">*</span>
          </label>
          <input
            id="ma-dam-input"
            type="text"
            value={maDam}
            onChange={(e) => { setMaDam(e.target.value); if (formState === 'error') setFormState('idle'); }}
            placeholder="Nhập mã đám (vd: 260108, 260334...)"
            required
            className={`w-full rounded-xl border px-4 py-3 text-sm font-medium
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
              transition-all placeholder:text-gray-300
              ${formState === 'error' && !maDam.trim()
                ? 'border-red-300 bg-red-50'
                : 'border-gray-200 bg-gray-50 focus:bg-white'
              }`}
          />
          <p className="text-[10px] text-gray-400 mt-1">Nhập mã đám tang tương ứng với sản phẩm này</p>
        </div>

        {/* Error */}
        {formState === 'error' && errorMsg && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{errorMsg}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={formState === 'submitting' || !maDam.trim()}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#1B2A4A] px-6 py-3.5
                     text-sm font-bold text-white shadow-sm
                     hover:bg-[#162240] active:scale-95
                     disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100
                     transition-all duration-150"
        >
          {formState === 'submitting' ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Đang xác nhận…
            </>
          ) : (
            <>
              <Send size={16} />
              Xác nhận xuất hàng
            </>
          )}
        </button>
      </form>
    </div>
  );
}
