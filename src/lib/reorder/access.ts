import { NextRequest, NextResponse } from 'next/server';
import { getEffectivePermissions } from '@/config/roles.config';
import { authenticateRequest } from '@/lib/serverAuth';

/** Always authenticate rather than trusting an email supplied by the caller. */
export async function authorizeReorder(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return { error: auth.error };
  const user = auth.user!;
  if (!getEffectivePermissions(user.email || '', user.app_metadata.permissions).canCreatePO) {
    return { error: NextResponse.json({ error: 'Bạn không có quyền quản lý reorder point.' }, { status: 403 }) };
  }
  return { email: (user.email || '').trim().toLowerCase() };
}

