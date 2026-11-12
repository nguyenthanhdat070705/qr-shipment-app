'use client';

import AuthGuard from '@/components/AuthGuard';

export default function InOutManagementLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
