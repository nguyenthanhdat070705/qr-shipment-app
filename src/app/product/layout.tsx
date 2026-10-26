'use client';

import AuthGuard from '@/components/AuthGuard';
import RoleGuard from '@/components/RoleGuard';

/**
 * Layout bảo vệ cho toàn bộ route /product/*
 * Chỉ các role vận hành/kho được xem route này vì trang có số lượng và phân bố kho.
 * Flow: Scan QR → /product/XXX → AuthGuard/RoleGuard → chuyển về màn hình phù hợp.
 */
export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <RoleGuard allowedRoles={['admin', 'procurement', 'warehouse', 'operations']}>{children}</RoleGuard>
    </AuthGuard>
  );
}
