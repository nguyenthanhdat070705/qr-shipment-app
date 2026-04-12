'use client';

import PageLayout from '@/components/PageLayout';
import WarehousesManageClient from './WarehousesManageClient';
import { Warehouse } from 'lucide-react';

export default function WarehousesPage() {
  return (
    <PageLayout title="Quản lý kho" icon={<Warehouse size={16} className="text-emerald-500" />}>
      <WarehousesManageClient />
    </PageLayout>
  );
}
