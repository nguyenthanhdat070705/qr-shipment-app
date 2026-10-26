import { getUserRole, type UserRole } from '@/config/roles.config';

export const REORDER_MANAGER_ROLES: UserRole[] = ['admin', 'procurement'];

export function getRequestEmail(req: Request, providedEmail?: unknown): string {
  if (typeof providedEmail === 'string' && providedEmail.trim()) return providedEmail.trim().toLowerCase();
  const headerEmail = req.headers.get('x-user-email');
  return headerEmail?.trim().toLowerCase() || '';
}

export function canManageReorder(email: string): boolean {
  return REORDER_MANAGER_ROLES.includes(getUserRole(email));
}

export function roleFromEmail(email: string): UserRole {
  return getUserRole(email);
}

