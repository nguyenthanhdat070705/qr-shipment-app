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
  const [maDonHang, setMaDonHang] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  // Auto-fill user info from login session
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        setUserEmail(u.email || '');
        // Extract name from email prefix (before @)
        const namePart = (u.email || '').split('@')[0] || '';
        setUserName(namePart);
      }
    } catch { /* ignore */ }
  }, []);

  const isAlreadyExported = currentStatus === 'exported';

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedMaDonHang = maDonHang.trim();

    if (!trimmedMaDonHang) {
      setErrorMsg('Vui lòng nhập mã đơn hàng.');
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
          chucVu: 'Nhân viên xuất kho',
          maSanPhamXacNhan: qrCode,
          maDonHang: trimmedMaDonHang,
          soLuong: 1,
          note: `Mã đơn: ${trimmedMaDonHang}`,
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

      setSuccessData({
        hoTen:         data.confirmation.ho_ten,
        email:         data.confirmation.email,
        ngayXuat:      data.confirmation.ngay_xuat,
        thoiGianXuat:  data.confirmation.thoi_gian_xuat,
        createdAt:     data.confirmation.created_at,
        stt:           data.confirmation.stt,
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
            <p className="text-xs text-green-600">Đã lưu vào hệ thống</p>
          </div>
        </div>

        <div className="bg-white/70 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-sm">
            <Hash size={14} className="text-green-500 flex-shrink-0" />
            <span className="text-gray-500 font-medium w-28">STT:</span>
            <span className="font-bold text-gray-800">#{successData.stt}</span>
          </div>
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

  // ── Form nhập liệu (đơn giản) ────────────────────────
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
      <div className="mb-4">
        <h3 className="text-base font-bold text-gray-900">Xác nhận xuất hàng</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          Nhập mã đơn hàng để xuất sản phẩm <strong>{productName}</strong>.
        </p>
      </div>

      {/* Auto-filled info display */}
      <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 mb-4 space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <User size={12} className="text-gray-400" />
          <span className="text-gray-400 w-24">Người xuất:</span>
          <span className="font-medium text-gray-700">{userEmail || 'Đang tải...'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Clock size={12} className="text-gray-400" />
          <span className="text-gray-400 w-24">Thời gian:</span>
          <span className="font-medium text-gray-700">Tự động ghi nhận</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Package size={12} className="text-gray-400" />
          <span className="text-gray-400 w-24">Số lượng:</span>
          <span className="font-medium text-gray-700">1</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Mã đơn hàng — the ONLY field the user needs to fill */}
        <div>
          <label htmlFor="ma-don-hang" className="block text-sm font-medium text-gray-700 mb-1">
            Mã đơn hàng <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              id="ma-don-hang"
              type="text"
              placeholder="Nhập mã đơn hàng (ví dụ: DH-001)"
              value={maDonHang}
              onChange={(e) => setMaDonHang(e.target.value)}
              disabled={formState === 'submitting'}
              required
              autoFocus
              className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-9 pr-4 py-3 text-sm text-gray-900 placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-[#2d4a7a] focus:border-transparent
                         disabled:opacity-60 disabled:cursor-not-allowed transition"
            />
          </div>
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
          disabled={formState === 'submitting'}
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
