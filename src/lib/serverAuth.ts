import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getEffectivePermissions, getUserRole, isSystemAdminEmail, ROLE_CONFIGS } from '@/config/roles.config';

/** Validate against the Auth server rather than trusting a client-provided email or JWT claims. */
export async function authenticateRequest(request: NextRequest, adminOnly = false) {
  const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') || '');
  if (!match) return { error: NextResponse.json({ error: 'Vui lòng đăng nhập lại.' }, { status: 401 }) };

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(match[1]);
  if (error || !data.user?.email) {
    return { error: NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' }, { status: 401 }) };
  }

  const email = data.user.email.toLowerCase().trim();
  const { data: account, error: accountError } = await supabase.from('dim_account')
    .select('is_active').eq('email', email).maybeSingle();
  if (accountError) return { error: NextResponse.json({ error: 'Không kiểm tra được trạng thái tài khoản.' }, { status: 503 }) };
  if (account?.is_active === false) return { error: NextResponse.json({ error: 'Tài khoản đã được lưu trữ.' }, { status: 403 }) };
  if (adminOnly && !isSystemAdminEmail(email)) {
    return { error: NextResponse.json({ error: 'Chỉ quản trị viên được thực hiện thao tác này.' }, { status: 403 }) };
  }
  return { user: data.user };
}

export function publicUser(user: { id: string; email?: string; app_metadata: Record<string, unknown> }) {
  const email = (user.email || '').toLowerCase().trim();
  const role = getUserRole(email);
  return { id: user.id, email, role, roleLabel: ROLE_CONFIGS[role].label,
    permissionsConfigured: !!user.app_metadata.permissions && typeof user.app_metadata.permissions === 'object',
    permissions: getEffectivePermissions(email, user.app_metadata.permissions) };
}
