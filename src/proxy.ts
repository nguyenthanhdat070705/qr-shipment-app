import { NextRequest, NextResponse } from 'next/server';
import { getEffectivePermissions, type RolePermissions } from '@/config/roles.config';
import { authenticateRequest } from '@/lib/serverAuth';

// Only APIs listed here are intercepted. Public lookups, webhooks and cron jobs
// keep their existing authentication model.
function requiredPermissions(path: string, method: string): (keyof RolePermissions)[] {
  const read = method === 'GET' || method === 'HEAD';
  if (path.startsWith('/api/confirm-shipment')) return ['canExport'];
  if (path.startsWith('/api/hold-product')) return read ? ['canHold', 'canViewProducts', 'canExport'] : ['canHold'];
  if (path.startsWith('/api/purchase-orders')) return read ? ['canCreatePO', 'canManageReceipt', 'canReceiveGoods'] : ['canCreatePO'];
  if (path.startsWith('/api/reorder-points')) return ['canCreatePO'];
  if (path.startsWith('/api/goods-receipt')) return read ? ['canManageReceipt', 'canReceiveGoods', 'canCreatePO'] : ['canManageReceipt', 'canReceiveGoods'];
  if (path.startsWith('/api/goods-issue')) return read ? ['canExport', 'canManageDelivery'] : ['canExport'];
  if (path.startsWith('/api/inventory/deduct')) return ['canExport'];
  if (path.startsWith('/api/inventory')) return ['canViewInventory'];
  if (path.startsWith('/api/suppliers')) return ['canViewSuppliers'];
  if (path.startsWith('/api/operations')) return ['canManageDelivery'];
  if (path.startsWith('/api/membership/lookup-sheet')) return [];
  if (path.startsWith('/api/membership')) return ['canMembership'];
  if (path.startsWith('/api/products')) return read ? [] : ['canViewProducts'];
  return [];
}

export async function proxy(request: NextRequest) {
  try {
    const required = requiredPermissions(request.nextUrl.pathname, request.method);
    if (!required.length) return NextResponse.next();
    const auth = await authenticateRequest(request);
    if (auth.error) return auth.error;
    const user = auth.user!;
    const email = user.email || '';
    const permissions = getEffectivePermissions(email, user.app_metadata.permissions);
    const supplierWriteDenied = request.nextUrl.pathname.startsWith('/api/suppliers') && request.method !== 'GET' && request.method !== 'HEAD' && !permissions.canCreatePO;
    const productWriteDenied = request.nextUrl.pathname.startsWith('/api/products') && !permissions.canCreatePO;
    if (supplierWriteDenied || productWriteDenied || !required.some(permission => permissions[permission])) {
      return NextResponse.json({ error: 'Tài khoản không có quyền thực hiện thao tác này.' }, { status: 403 });
    }
    // Replace any client-supplied value with the identity verified by Supabase.
    const headers = new Headers(request.headers);
    headers.set('x-authenticated-email', email.toLowerCase().trim());
    headers.set('x-authenticated-admin', String(permissions.canAdmin));
    headers.set('x-can-view-suppliers', String(permissions.canViewSuppliers));
    return NextResponse.next({ request: { headers } });
  } catch (error) {
    console.error('[permission proxy]', error);
    return NextResponse.json({ error: 'Không thể kiểm tra quyền tài khoản.' }, { status: 503 });
  }
}

export const config = {
  matcher: [
    '/api/confirm-shipment/:path*', '/api/hold-product/:path*',
    '/api/purchase-orders/:path*', '/api/goods-receipt/:path*',
    '/api/reorder-points/:path*',
    '/api/goods-issue/:path*', '/api/inventory/:path*', '/api/suppliers/:path*',
    '/api/operations/:path*', '/api/membership/:path*', '/api/products/:path*',
  ],
};
