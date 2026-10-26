'use client';

import AuthGuard from '@/components/AuthGuard';
import RoleGuard from '@/components/RoleGuard';

/** QR/inventory listing contains warehouse names and quantities. */
export default function FullProductListLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <RoleGuard allowedRoles={['admin', 'procurement', 'warehouse']}>{children}</RoleGuard>
    </AuthGuard>
  );
}
