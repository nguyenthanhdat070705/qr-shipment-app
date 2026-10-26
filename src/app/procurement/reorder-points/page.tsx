'use client';

import AuthGuard from '@/components/AuthGuard';
import RoleGuard from '@/components/RoleGuard';
import ReorderPointsClient from './ReorderPointsClient';

export default function ReorderPointsPage() {
  return (
    <AuthGuard>
      <RoleGuard allowedRoles={['admin', 'procurement']}>
        <ReorderPointsClient />
      </RoleGuard>
    </AuthGuard>
  );
}

