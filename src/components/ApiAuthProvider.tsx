'use client';

// Install before child effects run, so existing same-origin API calls carry the
// current session without sending it to third-party services.
if (typeof window !== 'undefined') {
  const marker = Symbol.for('blackstones.api-auth-fetch');
  const current = window.fetch as typeof fetch & { [marker]?: boolean };
  if (!current[marker]) {
    const original = current.bind(window);
    const authenticatedFetch: typeof fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
      if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) {
        return original(input, init);
      }
      let token = window.localStorage.getItem('auth_token');
      if (!token) return original(input, init);
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      const authorization = headers.get('Authorization');
      if (!url.pathname.startsWith('/api/auth/') && (!authorization || authorization === `Bearer ${token}`)) {
        try {
          const payload = token.split('.')[1];
          if (payload) {
            const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
            if (typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now() + 60_000) {
              const { refreshSession } = await import('@/lib/clientSession');
              const refreshed = await refreshSession();
              if (!refreshed) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
              token = refreshed;
              if (authorization) headers.set('Authorization', `Bearer ${token}`);
            }
          }
        } catch (error) {
          // A JWT with an expiry must not be sent after refresh failed. Local
          // preview tokens have no JWT payload and do not enter this branch.
          if (token.split('.').length === 3) throw error;
        }
      }
      if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
      return original(input, { ...init, headers });
    };
    Object.defineProperty(authenticatedFetch, marker, { value: true });
    window.fetch = authenticatedFetch;
  }
}

export default function ApiAuthProvider({ children }: { children: React.ReactNode }) {
  return children;
}
