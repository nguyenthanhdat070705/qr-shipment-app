import { NextRequest, NextResponse } from 'next/server';
import { getEffectivePermissions, isSystemAdminEmail, isVIPAdmin, ROLE_CONFIGS, type RolePermissions } from '@/config/roles.config';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { authenticateRequest } from '@/lib/serverAuth';

const permissionKeys = Object.keys(ROLE_CONFIGS.admin.permissions) as (keyof RolePermissions)[];

async function listUsers() {
  const supabase = getSupabaseAdmin();
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 200) return users;
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, true);
    if (auth.error) return auth.error;
    const users = await listUsers();
    const permissionsByEmail: Record<string, RolePermissions> = {};
    for (const user of users) {
      const email = user.email?.toLowerCase().trim();
      if (email && (!isVIPAdmin(email) || isVIPAdmin(auth.user?.email || ''))) {
        permissionsByEmail[email] = getEffectivePermissions(email, user.app_metadata.permissions);
      }
    }
    return NextResponse.json({ permissionsByEmail }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[accounts/permissions GET]', error);
    return NextResponse.json({ error: 'Không thể tải danh sách phân quyền.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, true);
    if (auth.error) return auth.error;
    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
    }
    const { email: value, permissions } = body as Record<string, unknown>;
    if (typeof value !== 'string' || !value.trim() || !permissions || typeof permissions !== 'object' || Array.isArray(permissions)) {
      return NextResponse.json({ error: 'Email và danh sách quyền là bắt buộc.' }, { status: 400 });
    }
    const email = value.trim().toLowerCase();
    if (isSystemAdminEmail(email)) {
      return NextResponse.json({ error: 'Không thể thay đổi quyền của tài khoản quản trị.' }, { status: 403 });
    }
    const values = permissions as Record<string, unknown>;
    if (Object.keys(values).length !== permissionKeys.length || permissionKeys.some(key => typeof values[key] !== 'boolean') || values.canAdmin !== false) {
      return NextResponse.json({ error: 'Danh sách quyền không hợp lệ hoặc có quyền quản trị.' }, { status: 400 });
    }
    const user = (await listUsers()).find(candidate => candidate.email?.toLowerCase().trim() === email);
    if (!user) return NextResponse.json({ error: 'Không tìm thấy tài khoản.' }, { status: 404 });
    const assigned = Object.fromEntries(permissionKeys.map(key => [key, values[key]])) as unknown as RolePermissions;
    const { error } = await getSupabaseAdmin().auth.admin.updateUserById(user.id, {
      app_metadata: { ...user.app_metadata, permissions: assigned },
    });
    if (error) throw error;
    return NextResponse.json({ success: true, permissions: assigned });
  } catch (error) {
    console.error('[accounts/permissions PUT]', error);
    return NextResponse.json({ error: 'Không thể lưu phân quyền.' }, { status: 500 });
  }
}
