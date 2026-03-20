'use client';

import { useState, useEffect } from 'react';
import { Lock, Unlock, Loader2, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { getUserRole } from '@/config/roles.config';

interface HoldProductButtonProps {
  productCode: string;
  productName: string;
}

export default function HoldProductButton({ productCode, productName }: HoldProductButtonProps) {
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  const [holdStatus, setHoldStatus] = useState<{
    isHeld: boolean;
    heldByEmail?: string;
    expiresAt?: string;
  }>({ isHeld: false });
  const [loading, setLoading] = useState(true);
  const [holding, setHolding] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        setUserEmail(u.email || '');
        setUserRole(u.role || getUserRole(u.email || ''));
      }
    } catch { /* ignore */ }
  }, []);

  // Check hold status
  useEffect(() => {
    async function checkHold() {
      try {
        const res = await fetch(`/api/hold-product?productCode=${encodeURIComponent(productCode)}`);
        const data = await res.json();
        if (data.isHeld) {
          setHoldStatus({
            isHeld: true,
            heldByEmail: data.hold?.held_by_email,
            expiresAt: data.hold?.expires_at,
          });
        } else {
          setHoldStatus({ isHeld: false });
        }
      } catch {
        // Ignore errors
      } finally {
        setLoading(false);
      }
    }
    if (productCode) checkHold();
  }, [productCode]);

  // Only show for sales role
  const isSales = userRole === 'sales';
  if (!isSales) return null;

  async function handleHold() {
    setHolding(true);
    setMsg(null);

    try {
      const res = await fetch('/api/hold-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productCode, email: userEmail }),
      });

      const data = await res.json();

      if (data.success) {
        setHoldStatus({
          isHeld: true,
          heldByEmail: userEmail,
          expiresAt: data.expiresAt,
        });
        setMsg({ type: 'success', text: 'Đã giữ hàng thành công! (Hết hạn sau 24 giờ)' });
        setTimeout(() => setMsg(null), 5000);
      } else {
        setMsg({ type: 'error', text: data.error || 'Không thể giữ hàng.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Lỗi kết nối.' });
    } finally {
      setHolding(false);
    }
  }

  async function handleRelease() {
    setHolding(true);
    setMsg(null);

    try {
      const res = await fetch('/api/hold-product', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productCode }),
      });

      const data = await res.json();
      if (data.success) {
        setHoldStatus({ isHeld: false });
        setMsg({ type: 'success', text: 'Đã hủy giữ hàng.' });
        setTimeout(() => setMsg(null), 3000);
      } else {
        setMsg({ type: 'error', text: data.error || 'Không thể hủy giữ.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Lỗi kết nối.' });
    } finally {
      setHolding(false);
    }
  }

  function formatExpiry(iso: string): string {
    try {
      return new Date(iso).toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
        <div className="flex items-center justify-center gap-2 text-gray-400">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Đang kiểm tra...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <Lock size={18} className="text-blue-500" />
          <h3 className="font-bold text-gray-900">Giữ hàng</h3>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Giữ sản phẩm <strong>{productName}</strong> trong 24 giờ. Nếu không ai xuất hàng trong thời gian này, sản phẩm sẽ được mở lại tự động.
        </p>

        {/* Status message */}
        {msg && (
          <div className={`flex items-center gap-2 rounded-xl px-4 py-3 mb-4 text-sm font-medium
            ${msg.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {msg.text}
          </div>
        )}

        {holdStatus.isHeld ? (
          <div>
            {/* Currently held */}
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 mb-4">
              <Clock size={16} className="text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-700">Đang được giữ</p>
                <p className="text-xs text-amber-600">
                  Bởi: {holdStatus.heldByEmail}
                </p>
                {holdStatus.expiresAt && (
                  <p className="text-xs text-amber-500">
                    Hết hạn: {formatExpiry(holdStatus.expiresAt)}
                  </p>
                )}
              </div>
            </div>

            {/* Only the holder can release */}
            {holdStatus.heldByEmail === userEmail && (
              <button
                onClick={handleRelease}
                disabled={holding}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                           bg-gray-100 border border-gray-200 text-gray-600
                           hover:bg-red-50 hover:border-red-200 hover:text-red-600
                           disabled:opacity-50 transition-all font-semibold text-sm"
              >
                {holding ? <Loader2 size={16} className="animate-spin" /> : <Unlock size={16} />}
                Hủy giữ hàng
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={handleHold}
            disabled={holding}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                       bg-gradient-to-r from-blue-600 to-indigo-600 text-white
                       hover:from-blue-700 hover:to-indigo-700
                       disabled:opacity-50 transition-all font-bold text-sm shadow-sm"
          >
            {holding ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
            Giữ hàng (24 giờ)
          </button>
        )}
      </div>
    </div>
  );
}
