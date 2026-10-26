'use client';

import AuthGuard from '@/components/AuthGuard';
import RoleGuard from '@/components/RoleGuard';

export default function InOutManagementLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard><RoleGuard allowedRoles={['admin', 'procurement', 'warehouse', 'operations']}>{children}</RoleGuard></AuthGuard>;
}
