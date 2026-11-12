'use client';

// Nested guards can ask to refresh the same session at once. Share one request.
let pendingRefresh: Promise<string | null> | null = null;

function newerTokenForSameUser(oldAccessToken: string | null, oldRefreshToken: string): string | null {
  if (localStorage.getItem('auth_refresh_token') === oldRefreshToken) return null;
  const nextToken = localStorage.getItem('auth_token');
  if (!oldAccessToken || !nextToken) return null;
  try {
    const claims = (token: string) => JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const oldUser = claims(oldAccessToken);
    const nextUser = claims(nextToken);
    return typeof oldUser.sub === 'string' && oldUser.sub === nextUser.sub &&
      typeof nextUser.exp === 'number' && nextUser.exp * 1000 > Date.now() ? nextToken : null;
  } catch { return null; }
}

export function refreshSession(): Promise<string | null> {
  if (pendingRefresh) return pendingRefresh;
  const refreshToken = localStorage.getItem('auth_refresh_token');
  const accessToken = localStorage.getItem('auth_token');
  if (!refreshToken) return Promise.resolve(null);
  pendingRefresh = (async () => {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (response.status === 401) return newerTokenForSameUser(accessToken, refreshToken);
    if (!response.ok) throw new Error('Không thể làm mới phiên đăng nhập.');
    const data = await response.json();
    if (!data.token || !data.refreshToken) throw new Error('Phiên đăng nhập không hợp lệ.');
    // Another tab may have rotated the session, or the user may have logged out.
    // Never replace the newer session with this late response.
    if (localStorage.getItem('auth_refresh_token') !== refreshToken) {
      return newerTokenForSameUser(accessToken, refreshToken);
    }
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_refresh_token', data.refreshToken);
    return data.token as string;
  })().finally(() => { pendingRefresh = null; });
  return pendingRefresh;
}
