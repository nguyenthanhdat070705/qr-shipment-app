'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { refreshSession } from '@/lib/clientSession';

/**
 * Auth-guard wrapper — renders children only when authenticated.
 * Redirects to /login?redirect=<currentPath> if no auth_token found.
 * After login, user is redirected back to the original page.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const refreshUser = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        let response = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (response.status === 401) {
          const renewedToken = await refreshSession();
          if (renewedToken) response = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${renewedToken}` }, cache: 'no-store',
          });
        }
        if (response.status === 401) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_refresh_token');
          localStorage.removeItem('auth_user');
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
          if (!cancelled) setIsAuthenticated(false);
          return;
        }
        if (!response.ok) throw new Error('Không thể kiểm tra quyền tài khoản.');
        const data = await response.json();
        if (!data.user || !data.user.permissions) throw new Error('Không thể kiểm tra quyền tài khoản.');
        if (cancelled) return;
        let previous = {};
        try { previous = JSON.parse(localStorage.getItem('auth_user') || '{}'); } catch { /* ignore invalid cache */ }
        localStorage.setItem('auth_user', JSON.stringify({ ...previous, ...data.user }));
        window.dispatchEvent(new Event('auth-user-updated'));
        setError('');
        setIsAuthenticated(true);
      } catch {
        if (!cancelled) {
          setIsAuthenticated(false);
          setError('Không thể kiểm tra quyền tài khoản. Vui lòng thử lại.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void refreshUser();
    const onFocus = () => { void refreshUser(); };
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, [router, pathname, retry]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8f9fc 0%, #eef1f8 100%)',
      }}>
        <div style={{
          width: 32,
          height: 32,
          border: '3px solid #e5e7eb',
          borderTopColor: '#1B2A4A',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    );
  }

  if (error) {
    return <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <p>{error}</p>
      <button className="rounded-lg bg-blue-700 px-4 py-2 text-white" onClick={() => { setIsLoading(true); setRetry(value => value + 1); }}>Thử lại</button>
    </div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
