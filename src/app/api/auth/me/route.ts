import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, publicUser } from '@/lib/serverAuth';

export async function GET(request: NextRequest) {
  try {
    // The existing local preview uses unsigned tokens. They are recognized only here,
    // never by privileged endpoints, and only when local auth is explicitly in use.
    if (process.env.NODE_ENV !== 'production' && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
      const match = /^Bearer local-dev-token:([^\s]+)$/i.exec(request.headers.get('authorization') || '');
      const email = match?.[1].toLowerCase();
      const localAccounts = ['quantri', 'admin', 'kho1', 'kho2', 'kho3', 'bophanthumua', 'bophanvanhanh', 'bophanbanhang', 'bophanpttt']
        .map(name => `${name}@blackstone.com.vn`);
      if (email && localAccounts.includes(email)) {
        return NextResponse.json({ user: publicUser({ id: `local:${email}`, email, app_metadata: {} }) }, { headers: { 'Cache-Control': 'no-store' } });
      }
    }
    const auth = await authenticateRequest(request);
    if (auth.error) return auth.error;
    return NextResponse.json({ user: publicUser(auth.user!) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[auth/me]', error);
    return NextResponse.json({ error: 'Không thể xác minh phiên đăng nhập.' }, { status: 503 });
  }
}
