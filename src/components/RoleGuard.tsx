'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getUserRole, type UserRole } from '@/config/roles.config';

export default function RoleGuard({
  allowedRoles,
  children,
  fallback = 'Bạn không có quyền truy cập chức năng này.',
}: {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      const user = raw ? JSON.parse(raw) : null;
      const role = getUserRole(user?.email || '');
      if (allowedRoles.includes(role)) {
        setAllowed(true);
      } else {
        router.replace(role === 'sales' ? '/sales-hub' : '/');
      }
    } catch {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    } finally {
      setReady(true);
    }
  }, [allowedRoles, pathname, router]);

  if (!ready) {
    return <div className="min-h-[40vh] flex items-center justify-center text-sm text-gray-400">Đang kiểm tra quyền truy cập...</div>;
  }

  if (!allowed) {
    return <div className="min-h-[40vh] flex items-center justify-center text-sm text-gray-500">{fallback}</div>;
  }

  return <>{children}</>;
}

