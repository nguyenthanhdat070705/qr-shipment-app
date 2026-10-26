'use client';

import AuthGuard from '@/components/AuthGuard';
import RoleGuard from '@/components/RoleGuard';

/** Product sheets include warehouse placement and are not part of the Sales catalogue. */
export default function ProductSheetLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <RoleGuard allowedRoles={['admin', 'procurement', 'warehouse']}>{children}</RoleGuard>
    </AuthGuard>
  );
}
