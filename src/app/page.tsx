'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUserRole } from '@/config/roles.config';

/* ═══════════════════════════════════════════════════════════
   Main Page — Role-based redirect (Tìm kiếm hàng đã ẩn)
   ═══════════════════════════════════════════════════════════ */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        const role = getUserRole(u.email || '');
        switch (role) {
          case 'admin':
            router.replace('/admin');
            break;
          case 'sales':
            router.replace('/sales');
            break;
          case 'procurement':
            router.replace('/procurement');
            break;
          case 'operations':
            router.replace('/operations');
            break;
          case 'warehouse':
            router.replace('/warehouse');
            break;
          default:
            router.replace('/sales');
        }
      } else {
        router.replace('/login');
      }
    } catch {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B2A4A] mx-auto mb-3"></div>
        <p className="text-sm text-gray-400">Đang chuyển hướng...</p>
      </div>
    </div>
  );
}
