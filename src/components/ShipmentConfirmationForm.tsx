'use client';

import { useState, FormEvent } from 'react';
import type { ConfirmShipmentResponse } from '@/types';
import { PRODUCT_CONFIG } from '@/config/product.config';
import {
  User, Mail, FileText, Send, CheckCircle, AlertCircle, Loader2, Lock,
  Calendar, Clock, Hash, Briefcase, Key
} from 'lucide-react';

interface ShipmentConfirmationFormProps {
  /** Mã QR / mã sản phẩm đã quét */
  qrCode: string;
  /** Tên sản phẩm để hiển thị trong form */
  productName: string;
  /** Giá trị hiện tại của cột trạng thái */
  currentStatus: string;
  /** Callback khi xác nhận thành công */
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

/** Định dạng ngày dạng DD/MM/YYYY */
function formatDate(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch { return iso; }
}

/** Định dạng giờ dạng HH:MM */
function formatTime(timeStr: string): string {
  return timeStr?.slice(0, 5) ?? timeStr;
}

export default function ShipmentConfirmationForm({
  qrCode,
  productName,
  currentStatus,
  onConfirmed,
}: ShipmentConfirmationFormProps) {
  const [hoTen, setHoTen] = useState('');
  const [email, setEmail] = useState('');
  const [chucVu, setChucVu] = useState('');
  const [maSanPhamXacNhan, setMaSanPhamXacNhan] = useState('');
  const [note, setNote] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  // Nếu sản phẩm đã được xuất kho → khoá form
  const isAlreadyExported = currentStatus === PRODUCT_CONFIG.EXPORTED_STATUS_VALUE;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedHoTen = hoTen.trim();
    const trimmedEmail = email.trim();
    const trimmedChucVu = chucVu.trim();
    const trimmedMaSanPhamXacNhan = maSanPhamXacNhan.trim();

    if (!trimmedMaSanPhamXacNhan) {
      setErrorMsg('Vui lòng nhập lại mã sản phẩm để xác nhận.');
      setFormState('error');
      return;
    }
    if (!trimmedHoTen) {
      setErrorMsg('Vui lòng nhập họ và tên của bạn.');
      setFormState('error');
      return;
    }
    if (!trimmedEmail) {
      setErrorMsg('Vui lòng nhập địa chỉ email của bạn.');
      setFormState('error');
      return;
    }
    if (!trimmedChucVu) {
      setErrorMsg('Vui lòng nhập chức vụ của bạn.');
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
          hoTen: trimmedHoTen,
          email: trimmedEmail,
          chucVu: trimmedChucVu,
          maSanPhamXacNhan: trimmedMaSanPhamXacNhan,
          note: note.trim() || undefined,
        }),
      });

      const data: ConfirmShipmentResponse = await res.json();

      if (!data.success) {
        const viMessages: Record<string, string> = {
          VALIDATION_ERROR:  data.error,
          PRODUCT_NOT_FOUND: 'Không tìm thấy sản phẩm với mã này.',
          ALREADY_EXPORTED:  'Sản phẩm này đã được xác nhận xuất kho trước đó.',
          DATABASE_ERROR:    'Lỗi cơ sở dữ liệu. Vui lòng thử lại sau.',
          INTERNAL_ERROR:    'Lỗi hệ thống. Vui lòng liên hệ quản trị viên.',
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
      onConfirmed?.(trimmedHoTen, trimmedEmail);
    } catch {
      setErrorMsg('Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.');
      setFormState('error');
    }
  }

  // ── Đã xuất kho trước đó ─────────────────────────────────
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

  // ── Xác nhận thành công ───────────────────────────────────
  if (formState === 'success' && successData) {
    return (
      <div className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100">
            <CheckCircle size={24} className="text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-green-800 text-base">Xác nhận xuất hàng thành công!</h3>
            <p className="text-xs text-green-600">Đã lưu vào hệ thống</p>
          </div>
        </div>

        <div className="bg-white/70 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Hash size={14} className="text-green-500 flex-shrink-0" />
            <span className="text-gray-500 font-medium w-32">STT:</span>
            <span className="font-bold text-gray-800">#{successData.stt}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User size={14} className="text-green-500 flex-shrink-0" />
            <span className="text-gray-500 font-medium w-32">Họ tên:</span>
            <span className="font-medium text-gray-800">{successData.hoTen}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail size={14} className="text-green-500 flex-shrink-0" />
            <span className="text-gray-500 font-medium w-32">Email:</span>
            <span className="font-medium text-gray-800 break-all">{successData.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={14} className="text-green-500 flex-shrink-0" />
            <span className="text-gray-500 font-medium w-32">Ngày xuất:</span>
            <span className="font-medium text-gray-800">{formatDate(successData.ngayXuat)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock size={14} className="text-green-500 flex-shrink-0" />
            <span className="text-gray-500 font-medium w-32">Thời gian xuất:</span>
            <span className="font-medium text-gray-800">{formatTime(successData.thoiGianXuat)}</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Form nhập liệu ────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
      {/* Tiêu đề */}
      <div className="mb-5">
        <h3 className="text-base font-bold text-gray-900">Xác nhận xuất hàng</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          Điền thông tin bên dưới để xác nhận xuất kho sản phẩm{' '}
          <strong>{productName}</strong>.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Mã sản phẩm đối chiếu */}
        <div>
          <label htmlFor="ma-san-pham" className="block text-sm font-medium text-gray-700 mb-1">
            Mã sản phẩm <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              id="ma-san-pham"
              type="text"
              placeholder="Nhập lại mã sản phẩm để xác nhận"
              value={maSanPhamXacNhan}
              onChange={(e) => setMaSanPhamXacNhan(e.target.value)}
              disabled={formState === 'submitting'}
              required
              className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                         disabled:opacity-60 disabled:cursor-not-allowed transition uppercase"
            />
          </div>
        </div>

        {/* Họ tên */}
        <div>
          <label htmlFor="ho-ten" className="block text-sm font-medium text-gray-700 mb-1">
            Họ và tên <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              id="ho-ten"
              type="text"
              autoComplete="name"
              placeholder="Nguyễn Văn A"
              value={hoTen}
              onChange={(e) => setHoTen(e.target.value)}
              disabled={formState === 'submitting'}
              required
              className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                         disabled:opacity-60 disabled:cursor-not-allowed transition"
            />
          </div>
        </div>

        {/* Chức vụ */}
        <div>
          <label htmlFor="chuc-vu" className="block text-sm font-medium text-gray-700 mb-1">
            Chức vụ <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              id="chuc-vu"
              type="text"
              placeholder="VD: Thủ kho, Quản lý..."
              value={chucVu}
              onChange={(e) => setChucVu(e.target.value)}
              disabled={formState === 'submitting'}
              required
              className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                         disabled:opacity-60 disabled:cursor-not-allowed transition"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="email@congty.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={formState === 'submitting'}
              required
              className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                         disabled:opacity-60 disabled:cursor-not-allowed transition"
            />
          </div>
        </div>

        {/* Ghi chú */}
        <div>
          <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
            Ghi chú <span className="text-gray-400 font-normal">(không bắt buộc)</span>
          </label>
          <div className="relative">
            <FileText size={16} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
            <textarea
              id="note"
              rows={2}
              placeholder="Thêm ghi chú vận chuyển nếu có…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={formState === 'submitting'}
              className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                         disabled:opacity-60 disabled:cursor-not-allowed resize-none transition"
            />
          </div>
        </div>

        {/* Thông báo lỗi */}
        {formState === 'error' && errorMsg && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{errorMsg}</p>
          </div>
        )}

        {/* Nút xác nhận */}
        <button
          type="submit"
          disabled={formState === 'submitting'}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5
                     text-sm font-bold text-white shadow-sm
                     hover:bg-indigo-700 active:scale-95
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
