import { Metadata } from 'next';
import { Building2 } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import CRMClient from './CRMClient';

export const metadata: Metadata = {
  title: '1Office CRM | BlackStone Order SCM',
  description: 'Quản lý khách hàng, cơ hội kinh doanh và công việc từ 1Office',
};

export default function CRMPage() {
  return (
    <PageLayout title="1Office CRM" icon={<Building2 size={20} className="text-violet-500" />}>
      <CRMClient />
    </PageLayout>
  );
}
