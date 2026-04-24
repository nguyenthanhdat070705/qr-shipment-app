'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { ConfirmShipmentResponse } from '@/types';
import {
  Send, AlertCircle, Loader2, Lock,
  Clock, User, Package,
  ChevronDown, Hash
} from 'lucide-react';
import { getUserRole, getWarehouseFilter } from '@/config/roles.config';

interface ShipmentConfirmationFormProps {
  qrCode: string;
  productName: string;
  currentStatus: string;
  onConfirmed?: (hoTen: string, email: string) => void;
}

type FormState = 'idle' | 'submitting' | 'error';

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
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userDepartment, setUserDepartment] = useState('');

  // Mã đám — now a simple text input (optional)
  const [maDam, setMaDam] = useState('');

  // Số lượng xuất
  const [soLuong, setSoLuong] = useState(1);

  // Warehouse selector
  const [warehouses, setWarehouses] = useState<{ id: string; ten_kho: string; ma_kho: string }[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [warehouseLocked, setWarehouseLocked] = useState(false);

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

  // Load warehouses & auto-select based on user role
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/dim_kho?select=id,ma_kho,ten_kho&order=ten_kho.asc`, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
      },
    }).then(r => r.json()).then(khoData => {
      const list = Array.isArray(khoData) ? khoData : [];
      setWarehouses(list);

      // Auto-select warehouse based on user email
      if (userEmail && list.length > 0) {
        const warehouseFilter = getWarehouseFilter(userEmail);

        if (warehouseFilter) {
          // Warehouse account (kho1/kho2/kho3) — find and LOCK to their warehouse
          const matched = list.find((w: { ten_kho: string }) =>
            w.ten_kho.toLowerCase().includes(warehouseFilter.toLowerCase()) ||
            warehouseFilter.toLowerCase().includes(w.ten_kho.toLowerCase())
          );
          if (matched) {
            setSelectedWarehouse(matched.id);
            setWarehouseLocked(true);
          }
        } else {
          // Admin / other roles — can choose any warehouse, default to first
          setSelectedWarehouse(list[0]?.id || '');
          setWarehouseLocked(false);
        }
      }
    }).catch(() => {});
  }, [userEmail]);

  const isAlreadyExported = currentStatus === 'exported';

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Validate mã đám: bắt buộc, đúng 6 số
    const trimmedMaDam = maDam.trim();
    if (!trimmedMaDam) {
      setErrorMsg('Vui lòng nhập mã đám (bắt buộc).');
      setFormState('error');
      return;
    }
    if (!/^\d{6}$/.test(trimmedMaDam)) {
      setErrorMsg('Mã đám phải đúng 6 chữ số (vd: 260108).');
      setFormState('error');
      return;
    }

    if (!selectedWarehouse) {
      setErrorMsg('Vui lòng chọn kho xuất hàng.');
      setFormState('error');
      return;
    }

    if (soLuong < 1) {
      setErrorMsg('Số lượng xuất phải ít nhất là 1.');
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
          khoId: selectedWarehouse,
          maDonHang: maDam.trim() || undefined,
          soLuong: soLuong,
          note: `Xuất kho SP: ${productName}${maDam.trim() ? ` — Đám: ${maDam.trim()}` : ''} — Kho: ${warehouses.find(w => w.id === selectedWarehouse)?.ten_kho || ''} — SL: ${soLuong}`,
        }),
      });

      const data: ConfirmShipmentResponse = await res.json();

      if (!data.success) {
        const viMessages: Record<string, string> = {
          VALIDATION_ERROR: data.error,
          PRODUCT_NOT_FOUND: 'Không tìm thấy sản phẩm với mã này.',
          ALREADY_EXPORTED: data.error || 'Mã sản phẩm này đã được xuất kho trước đó. Không thể xuất lại.',
          DATABASE_ERROR: data.error || 'Lỗi cơ sở dữ liệu.',
          INTERNAL_ERROR: 'Lỗi hệ thống.',
        };
        setErrorMsg(viMessages[data.code] ?? data.error);
        setFormState('error');
        return;
      }

      // Inventory đã được trừ trong API confirm-shipment (bước 5.5)

      const khoName = warehouses.find(w => w.id === selectedWarehouse)?.ten_kho || '';

      onConfirmed?.(userName, userEmail);

      // Redirect to completion page with all info
      const completionParams = new URLSearchParams({
        stt: String(data.confirmation.stt || ''),
        ma_dam: maDam.trim(),
        product_code: qrCode,
        product_name: productName,
        kho_xuat: khoName,
        nguoi_xuat: data.confirmation.ho_ten || userName,
        email: data.confirmation.email || userEmail,
        ngay_xuat: data.confirmation.ngay_xuat ? formatDate(data.confirmation.ngay_xuat) : new Date().toLocaleDateString('vi-VN'),
        thoi_gian: data.confirmation.thoi_gian_xuat ? formatTime(data.confirmation.thoi_gian_xuat) : '',
        so_luong: String(soLuong),
      });
      router.push(`/transfer-complete?${completionParams.toString()}`);
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
          <span className="text-gray-400 w-24">Mã sản phẩm:</span>
          <span className="font-mono font-bold text-gray-900">{qrCode}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">

        {/* ── Warehouse selector ── */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
            Kho xuất hàng <span className="text-red-500">*</span>
            {warehouseLocked && <span className="ml-2 text-[10px] text-emerald-600 font-normal normal-case">🔒 Tự động theo tài khoản</span>}
          </label>
          <div className="relative">
            <select
              value={selectedWarehouse}
              onChange={(e) => { if (!warehouseLocked) { setSelectedWarehouse(e.target.value); if (formState === 'error') setFormState('idle'); } }}
              disabled={warehouseLocked}
              required
              className={`w-full rounded-xl border px-4 py-3 text-sm font-medium appearance-none
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all
                ${warehouseLocked ? 'bg-emerald-50 border-emerald-200 text-emerald-800 cursor-not-allowed font-bold' : ''}
                ${formState === 'error' && !selectedWarehouse ? 'border-red-300 bg-red-50' : !warehouseLocked ? 'border-gray-200 bg-gray-50 focus:bg-white' : ''}`}
            >
              <option value="">— Chọn kho xuất —</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.ten_kho} ({w.ma_kho})</option>
              ))}
            </select>
            {warehouseLocked ? (
              <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
            ) : (
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            )}
          </div>
        </div>

        {/* ── Số lượng xuất (locked to 1) ── */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
            Số lượng xuất <span className="text-red-500">*</span>
            <span className="ml-2 text-[10px] text-gray-400 font-normal normal-case">🔒 Mặc định 1</span>
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Hash size={16} />
            </div>
            <input
              type="number"
              min={1}
              max={1}
              value={1}
              readOnly
              className="w-full rounded-xl border border-gray-200 bg-gray-100 pl-10 pr-4 py-3 text-sm font-bold text-gray-700 cursor-not-allowed"
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Số lượng xuất mặc định là 1 cho mỗi sản phẩm</p>
        </div>

        {/* ── Mã Đám input (bắt buộc, 6 số) ── */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
            Mã Đám <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={maDam}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
              setMaDam(val);
              if (formState === 'error') setFormState('idle');
            }}
            placeholder="Nhập 6 số (vd: 260108)"
            className={`w-full rounded-xl border px-4 py-3 text-sm font-bold font-mono tracking-widest text-center text-lg
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all
              ${maDam.length === 6 ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 
                formState === 'error' && maDam.length < 6 ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'}`}
          />
          <div className="flex items-center justify-between mt-1">
            <p className={`text-[10px] ${maDam.length === 6 ? 'text-emerald-500 font-bold' : 'text-gray-400'}`}>
              {maDam.length === 6 ? '✓ Đã nhập đủ 6 số' : `${maDam.length}/6 số — Bắt buộc nhập đủ 6 chữ số`}
            </p>
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
          disabled={formState === 'submitting' || !selectedWarehouse || soLuong < 1 || maDam.trim().length !== 6}
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
