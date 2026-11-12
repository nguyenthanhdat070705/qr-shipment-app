'use client';

import AuthGuard from '@/components/AuthGuard';
import RoleGuard from '@/components/RoleGuard';

export default function CustomerSupportLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard><RoleGuard allowedRoles={['admin']} requiredPermissions={['canMembership']}>{children}</RoleGuard></AuthGuard>;
}
