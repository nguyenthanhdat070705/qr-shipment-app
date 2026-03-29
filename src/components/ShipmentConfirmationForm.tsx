'use client';

import { useState, useEffect, FormEvent } from 'react';
import type { ConfirmShipmentResponse } from '@/types';
import {
  Send, CheckCircle, AlertCircle, Loader2, Lock,
  Calendar, Clock, Hash, User, Mail, Package, FileText,
  Warehouse, Printer, ChevronDown
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
  maDam: string;
  nguoiMat: string;
  khoXuat: string;
  productName: string;
  productCode: string;
}

interface DamOption {
  ma_dam: string;
  nguoi_mat: string | null;
  ngay_liem: string | null;
  loai: string | null;
  chi_nhanh: string | null;
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

  // Mã đám
  const [maDam, setMaDam] = useState('');
  const [damList, setDamList] = useState<DamOption[]>([]);
  const [damLoading, setDamLoading] = useState(true);

  // Warehouse selector
  const [warehouses, setWarehouses] = useState<{ id: string; ten_kho: string; ma_kho: string }[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');

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

  // Load user info
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

  // Load dam list + warehouses
  useEffect(() => {
    Promise.all([
      fetch('/api/dam').then(r => r.json()).catch(() => ({ data: [] })),
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/dim_kho?select=id,ma_kho,ten_kho&order=ten_kho.asc`, {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
        },
      }).then(r => r.json()).catch(() => []),
    ]).then(([damRes, khoData]) => {
      setDamList(damRes.data || []);
      setWarehouses(Array.isArray(khoData) ? khoData : []);
      setDamLoading(false);
    });
  }, []);

  const selectedDam = damList.find(d => d.ma_dam === maDam);
  const isAlreadyExported = currentStatus === 'exported';

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!maDam.trim()) {
      setErrorMsg('Vui lòng chọn Mã Đám trước khi xác nhận xuất hàng.');
      setFormState('error');
      return;
    }

    if (!selectedWarehouse) {
      setErrorMsg('Vui lòng chọn kho xuất hàng.');
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
          note: `Xuất kho SP: ${productName} — Đám: ${maDam.trim()} — Kho: ${warehouses.find(w => w.id === selectedWarehouse)?.ten_kho || ''}`,
        }),
      });

      const data: ConfirmShipmentResponse = await res.json();

      if (!data.success) {
        const viMessages: Record<string, string> = {
          VALIDATION_ERROR: data.error,
          PRODUCT_NOT_FOUND: 'Không tìm thấy sản phẩm với mã này.',
          ALREADY_EXPORTED: 'Sản phẩm này đã được xuất kho trước đó.',
          DATABASE_ERROR: data.error || 'Lỗi cơ sở dữ liệu.',
          INTERNAL_ERROR: 'Lỗi hệ thống.',
        };
        setErrorMsg(viMessages[data.code] ?? data.error);
        setFormState('error');
        return;
      }

      // Deduct inventory
      try {
        await fetch('/api/inventory/deduct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ma_hom: qrCode, quantity: 1 }),
        });
      } catch (deductErr) {
        console.warn('Inventory deduct call failed (non-blocking):', deductErr);
      }

      const khoName = warehouses.find(w => w.id === selectedWarehouse)?.ten_kho || '';

      setSuccessData({
        hoTen: data.confirmation.ho_ten,
        email: data.confirmation.email,
        ngayXuat: data.confirmation.ngay_xuat,
        thoiGianXuat: data.confirmation.thoi_gian_xuat,
        createdAt: data.confirmation.created_at,
        stt: data.confirmation.stt,
        maDam: maDam.trim(),
        nguoiMat: selectedDam?.nguoi_mat || '',
        khoXuat: khoName,
        productName,
        productCode: qrCode,
      });
      setFormState('success');
      onConfirmed?.(userName, userEmail);
    } catch {
      setErrorMsg('Lỗi kết nối mạng. Vui lòng thử lại.');
      setFormState('error');
    }
  }

  // ── Already exported ──
  if (isAlreadyExported) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
        <div className="flex items-center gap-3 mb-2">
          <Lock size={20} className="text-green-600 flex-shrink-0" />
          <h3 className="font-semibold text-green-800 text-base">Đã xuất kho</h3>
        </div>
        <p className="text-sm text-green-700">
          Sản phẩm <strong>{productName}</strong> đã được xác nhận xuất kho.
        </p>
      </div>
    );
  }

  // ── SUCCESS / COMPLETION SCREEN ──
  if (formState === 'success' && successData) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-5 print:bg-white print:border-gray-300">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5 print:mb-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 print:bg-green-50">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-green-800 text-base">Yêu cầu chuyển hàng được hoàn thành</h3>
              <p className="text-xs text-green-600">Đã lưu vào hệ thống — Tồn kho đã được cập nhật</p>
            </div>
          </div>

          {/* Info card */}
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 print:border-gray-300">
            <InfoRow icon={<Hash size={14} />} label="STT" value={`#${successData.stt}`} />
            <InfoRow icon={<FileText size={14} />} label="Mã Đám" value={successData.maDam} highlight />
            {successData.nguoiMat && (
              <InfoRow icon={<User size={14} />} label="Người mất" value={successData.nguoiMat} />
            )}
            <InfoRow icon={<Package size={14} />} label="Sản phẩm" value={`${successData.productCode} — ${successData.productName}`} />
            <InfoRow icon={<Warehouse size={14} />} label="Kho xuất" value={successData.khoXuat} />
            <InfoRow icon={<User size={14} />} label="Người xuất" value={successData.hoTen} />
            <InfoRow icon={<Mail size={14} />} label="Email" value={successData.email} />
            <InfoRow icon={<Calendar size={14} />} label="Ngày xuất" value={formatDate(successData.ngayXuat)} />
            <InfoRow icon={<Clock size={14} />} label="Thời gian" value={formatTime(successData.thoiGianXuat)} />
            <InfoRow icon={<Package size={14} />} label="Số lượng" value="1" />
          </div>
        </div>

        {/* Print button */}
        <button
          onClick={() => window.print()}
          className="print:hidden w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#1B2A4A] text-white font-bold text-sm hover:bg-[#162240] shadow-lg shadow-[#1B2A4A]/20 transition-all active:scale-[0.98]"
        >
          <Printer size={16} />
          In phiếu chuyển hàng
        </button>

        {/* Print styles */}
        <style jsx global>{`
          @media print {
            header, nav, aside, .print\\:hidden, button:not(.print-keep) {
              display: none !important;
            }
            main { background: white !important; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        `}</style>
      </div>
    );
  }

  // ── FORM ──
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

        {/* ── Warehouse selector ── */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
            Kho xuất hàng <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={selectedWarehouse}
              onChange={(e) => { setSelectedWarehouse(e.target.value); if (formState === 'error') setFormState('idle'); }}
              required
              className={`w-full rounded-xl border px-4 py-3 text-sm font-medium appearance-none
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all
                ${formState === 'error' && !selectedWarehouse ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'}`}
            >
              <option value="">— Chọn kho xuất —</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.ten_kho} ({w.ma_kho})</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* ── Mã Đám selector ── */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
            Mã Đám <span className="text-red-500">*</span>
          </label>
          {damLoading ? (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-400">
              <Loader2 size={14} className="animate-spin" /> Đang tải danh sách đám...
            </div>
          ) : damList.length > 0 ? (
            <>
              <div className="relative">
                <select
                  value={maDam}
                  onChange={(e) => { setMaDam(e.target.value); if (formState === 'error') setFormState('idle'); }}
                  required
                  className={`w-full rounded-xl border px-4 py-3 text-sm font-medium appearance-none
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all
                    ${formState === 'error' && !maDam.trim() ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'}`}
                >
                  <option value="">— Chọn mã đám —</option>
                  {damList.map((d) => (
                    <option key={d.ma_dam} value={d.ma_dam}>
                      {d.ma_dam} — {d.nguoi_mat || 'N/A'} {d.ngay_liem ? `(Liệm: ${new Date(d.ngay_liem).toLocaleDateString('vi-VN')})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              {selectedDam && (
                <div className="mt-2 p-2.5 rounded-lg bg-indigo-50 border border-indigo-100 text-xs space-y-0.5">
                  <p className="font-bold text-indigo-800">{selectedDam.ma_dam} — {selectedDam.nguoi_mat || 'N/A'}</p>
                  {selectedDam.ngay_liem && <p className="text-indigo-600">📅 Ngày liệm: {new Date(selectedDam.ngay_liem).toLocaleDateString('vi-VN')}</p>}
                  {selectedDam.loai && <p className="text-indigo-600">📋 Loại: {selectedDam.loai}</p>}
                  {selectedDam.chi_nhanh && <p className="text-indigo-600">🏢 Chi nhánh: {selectedDam.chi_nhanh}</p>}
                </div>
              )}
            </>
          ) : (
            /* Fallback to text input if no dam data */
            <input
              type="text"
              value={maDam}
              onChange={(e) => { setMaDam(e.target.value); if (formState === 'error') setFormState('idle'); }}
              placeholder="Nhập mã đám (vd: 260108, 260334...)"
              required
              className={`w-full rounded-xl border px-4 py-3 text-sm font-medium
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all
                ${formState === 'error' && !maDam.trim() ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'}`}
            />
          )}
          <p className="text-[10px] text-gray-400 mt-1">Chỉ hiển thị đám có ngày liệm chưa diễn ra</p>
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
          disabled={formState === 'submitting' || !maDam.trim() || !selectedWarehouse}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#1B2A4A] px-6 py-3.5
                     text-sm font-bold text-white shadow-sm
                     hover:bg-[#162240] active:scale-95
                     disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100
                     transition-all duration-150"
        >
          {formState === 'submitting' ? (
            <><Loader2 size={16} className="animate-spin" /> Đang xác nhận…</>
          ) : (
            <><Send size={16} /> Xác nhận xuất hàng</>
          )}
        </button>
      </form>
    </div>
  );
}

/* ── Helper: Info row for completion screen ── */
function InfoRow({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-2 px-4 py-2.5 text-sm">
      <span className="text-green-500 flex-shrink-0 mt-0.5">{icon}</span>
      <span className="text-gray-500 font-medium w-24 flex-shrink-0">{label}</span>
      <span className={`font-medium break-words ${highlight ? 'font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-mono' : 'text-gray-800'}`}>
        {value}
      </span>
    </div>
  );
}
