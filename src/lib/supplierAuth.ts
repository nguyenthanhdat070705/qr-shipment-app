import { NextRequest, NextResponse } from 'next/server';
import { getEffectivePermissions } from '@/config/roles.config';
import { authenticateRequest } from '@/lib/serverAuth';

/** Supplier routes enforce the same policy as the proxy, even if called directly. */
export async function authorizeSupplierRequest(request: NextRequest, write = false) {
  const auth = await authenticateRequest(request);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const permissions = getEffectivePermissions(user.email || '', user.app_metadata.permissions);
  if (!permissions.canViewSuppliers || (write && !permissions.canCreatePO)) {
    return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác với nhà cung cấp.' }, { status: 403 });
  }
  return null;
}
