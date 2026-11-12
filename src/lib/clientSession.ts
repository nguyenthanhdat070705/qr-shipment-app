'use client';

// Nested guards can ask to refresh the same session at once. Share one request.
let pendingRefresh: Promise<string | null> | null = null;

export function refreshSession(): Promise<string | null> {
  if (pendingRefresh) return pendingRefresh;
  const refreshToken = localStorage.getItem('auth_refresh_token');
  if (!refreshToken) return Promise.resolve(null);
  pendingRefresh = (async () => {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (response.status === 401) return null;
    if (!response.ok) throw new Error('Không thể làm mới phiên đăng nhập.');
    const data = await response.json();
    if (!data.token || !data.refreshToken) throw new Error('Phiên đăng nhập không hợp lệ.');
    // Ignore a late refresh after a user has logged out or signed into another account.
    if (localStorage.getItem('auth_refresh_token') !== refreshToken) return null;
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_refresh_token', data.refreshToken);
    return data.token as string;
  })().finally(() => { pendingRefresh = null; });
  return pendingRefresh;
}
