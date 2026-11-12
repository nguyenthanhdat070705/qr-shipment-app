'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getUserRole, type UserRole, type RolePermissions } from '@/config/roles.config';

export default function RoleGuard({
  allowedRoles,
  requiredPermissions,
  children,
  fallback = 'Bạn không có quyền truy cập chức năng này.',
}: {
  allowedRoles: UserRole[];
  requiredPermissions?: (keyof RolePermissions)[];
  children: React.ReactNode;
  fallback?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const readUser = () => {
      try {
        const raw = localStorage.getItem('auth_user');
        const user = raw ? JSON.parse(raw) : null;
        const role = getUserRole(user?.email || '');
        const hasRequired = !requiredPermissions || requiredPermissions.every(key => user?.permissions?.[key] === true);
        // An explicit assignment may grant access beyond the legacy role list.
        // Existing accounts without an assignment retain their old visibility.
        setAllowed(Boolean(user && hasRequired && (allowedRoles.includes(role) || (requiredPermissions && user.permissionsConfigured))));
      } catch {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      } finally {
        setReady(true);
      }
    };
    readUser();
    window.addEventListener('auth-user-updated', readUser);
    return () => window.removeEventListener('auth-user-updated', readUser);
  }, [allowedRoles, requiredPermissions, pathname, router]);

  if (!ready) {
    return <div className="min-h-[40vh] flex items-center justify-center text-sm text-gray-400">Đang kiểm tra quyền truy cập...</div>;
  }

  if (!allowed) {
    return <div className="min-h-[40vh] flex items-center justify-center text-sm text-gray-500">{fallback}</div>;
  }

  return <>{children}</>;
}

