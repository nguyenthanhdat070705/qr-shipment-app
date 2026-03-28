'use client';

import { useState, useEffect } from 'react';
import { PRODUCT_CONFIG } from '@/config/product.config';
import { getUserRole, ROLE_CONFIGS } from '@/config/roles.config';
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
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        const role = getUserRole(u.email || '');
        setUserRole(role);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  function handleConfirmed() {
    setStatus(PRODUCT_CONFIG.EXPORTED_STATUS_VALUE as string);
    router.refresh(); // Refresh backend data (like fact_inventory) seamlessly
  }

  if (loading) return null;

  const roleConfig = ROLE_CONFIGS[userRole as keyof typeof ROLE_CONFIGS];

  // Inventory role → Show export form
  if (roleConfig?.permissions.canExport) {
    return (
      <ShipmentConfirmationForm
        qrCode={qrCode}
        productName={productName}
        currentStatus={status}
        onConfirmed={handleConfirmed}
      />
    );
  }

  // Sales role → Show hold button + no-export notice
  if (roleConfig?.permissions.canHold) {
    return (
      <div className="space-y-4">
        <HoldProductButton productCode={qrCode} productName={productName} />

        {/* Info notice */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
          <Shield size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-700">Tài khoản bán hàng</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Bạn chỉ có quyền xem sản phẩm và giữ hàng. Để xuất hàng, vui lòng liên hệ bộ phận kho vận.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
