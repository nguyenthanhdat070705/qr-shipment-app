'use client';

import { useState } from 'react';
import { PRODUCT_CONFIG } from '@/config/product.config';
import ShipmentConfirmationForm from './ShipmentConfirmationForm';

interface Props {
  qrCode: string;
  productName: string;
  currentStatus: string;
}

export default function ShipmentConfirmationFormWrapper({ qrCode, productName, currentStatus }: Props) {
  const [status, setStatus] = useState<string>(currentStatus);

  function handleConfirmed() {
    setStatus(PRODUCT_CONFIG.EXPORTED_STATUS_VALUE as string);
  }

  return (
    <ShipmentConfirmationForm
      qrCode={qrCode}
      productName={productName}
      currentStatus={status}
      onConfirmed={handleConfirmed}
    />
  );
}
