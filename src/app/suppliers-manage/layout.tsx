'use client';

import AuthGuard from '@/components/AuthGuard';
import RoleGuard from '@/components/RoleGuard';

export default function SuppliersManageLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <RoleGuard allowedRoles={['admin', 'procurement']} requiredPermissions={['canViewSuppliers']}>{children}</RoleGuard>
    </AuthGuard>
  );
}
