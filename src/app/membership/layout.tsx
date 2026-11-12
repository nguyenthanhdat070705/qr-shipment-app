'use client';

import AuthGuard from '@/components/AuthGuard';
import RoleGuard from '@/components/RoleGuard';

export default function MembershipLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard><RoleGuard allowedRoles={['admin']} requiredPermissions={['canMembership']}>{children}</RoleGuard></AuthGuard>;
}
