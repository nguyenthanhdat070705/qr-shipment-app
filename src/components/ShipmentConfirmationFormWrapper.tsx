'use client';

import { useState, useEffect } from 'react';
import { PRODUCT_CONFIG } from '@/config/product.config';
import type { RolePermissions } from '@/config/roles.config';
import ShipmentConfirmationForm from './ShipmentConfirmationForm';
import HoldProductButton from './HoldProductButton';
import { Shield } from 'lucide-react';

import { useRouter } from 'next/navigation';

interface Props {
  qrCode: string;
  productName: string;
  currentStatus: string;
}

export default function ShipmentConfirmationFormWrapper({ qrCode, productName, currentStatus }: Props) {
  const [status, setStatus] = useState<string>(currentStatus);
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const readUser = () => {
      try {
        const raw = localStorage.getItem('auth_user');
        setPermissions(raw ? JSON.parse(raw).permissions || null : null);
      } catch { setPermissions(null); }
      setLoading(false);
    };
    readUser();
    window.addEventListener('auth-user-updated', readUser);
    return () => window.removeEventListener('auth-user-updated', readUser);
  }, []);

  function handleConfirmed() {
    setStatus(PRODUCT_CONFIG.EXPORTED_STATUS_VALUE as string);
    router.refresh(); // Refresh backend data (like fact_inventory) seamlessly
  }

  if (loading) return null;

  if (!permissions?.canExport && !permissions?.canHold) return null;
  return (
      <div className="space-y-4">
        {permissions.canExport && <ShipmentConfirmationForm
          qrCode={qrCode}
          productName={productName}
          currentStatus={status}
          onConfirmed={handleConfirmed}
        />}
        {permissions.canHold && <HoldProductButton productCode={qrCode} productName={productName} />}
        {permissions.canHold && !permissions.canExport && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
          <Shield size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-700">Quyền giữ hàng</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Bạn chỉ có quyền xem sản phẩm và giữ hàng. Để xuất hàng, vui lòng liên hệ bộ phận kho vận.
            </p>
          </div>
        </div>
        )}
      </div>
  );
}
