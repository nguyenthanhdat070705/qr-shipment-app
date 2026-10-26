'use client';

import AuthGuard from '@/components/AuthGuard';
import RoleGuard from '@/components/RoleGuard';

export default function WarehouseSettingsLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard><RoleGuard allowedRoles={['admin', 'procurement']}>{children}</RoleGuard></AuthGuard>;
}
