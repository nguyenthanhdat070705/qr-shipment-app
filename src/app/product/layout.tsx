'use client';

import AuthGuard from '@/components/AuthGuard';

/**
 * Layout bảo vệ cho toàn bộ route /product/*
 * Bất kỳ ai truy cập /product/... đều cần đăng nhập trước.
 * Flow: Scan QR → /product/XXX → AuthGuard → /login?redirect=/product/XXX → Login → Redirect back
 */
export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
