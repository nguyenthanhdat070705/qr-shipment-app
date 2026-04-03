'use client';

import PageLayout from '@/components/PageLayout';
import SuppliersManageClient from './SuppliersManageClient';
import { Truck } from 'lucide-react';

export default function SuppliersPage() {
  return (
    <PageLayout title="Quản lý NCC" icon={<Truck size={16} className="text-orange-500" />}>
      <SuppliersManageClient />
    </PageLayout>
  );
}
