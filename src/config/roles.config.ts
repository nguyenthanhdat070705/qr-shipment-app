/**
 * ============================================================
 * roles.config.ts — Cấu hình phân quyền người dùng
 * ============================================================
 * 
 * Roles:
 * - inventory: Xuất kho bán hàng — được phép xuất hàng
 * - sales: Bộ phận bán hàng — chỉ xem + giữ hàng
 */

export type UserRole = 'inventory' | 'sales';

export interface RoleConfig {
  role: UserRole;
  label: string;
  description: string;
  permissions: {
    canExport: boolean;       // Được phép xuất hàng
    canHold: boolean;         // Được phép giữ hàng (hold)
    canViewInventory: boolean; // Được xem kho hàng
    canViewProducts: boolean;  // Được xem sản phẩm
  };
}

/** Map email patterns to roles */
const EMAIL_ROLE_MAP: { pattern: string; role: UserRole }[] = [
  { pattern: 'xuatkhobanhang', role: 'inventory' },
  { pattern: 'xuatkho', role: 'inventory' },
  { pattern: 'bophanbanhang', role: 'sales' },
  { pattern: 'sales', role: 'sales' },
  { pattern: 'banhang', role: 'sales' },
];

/** Role configurations */
export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  inventory: {
    role: 'inventory',
    label: 'Kho vận',
    description: 'Quản lý xuất kho — được phép xuất hàng',
    permissions: {
      canExport: true,
      canHold: false,
      canViewInventory: true,
      canViewProducts: true,
    },
  },
  sales: {
    role: 'sales',
    label: 'Bán hàng',
    description: 'Bộ phận bán hàng — xem hàng & giữ hàng',
    permissions: {
      canExport: false,
      canHold: true,
      canViewInventory: true,
      canViewProducts: true,
    },
  },
};

/**
 * Determine user role from email address.
 * Defaults to 'sales' (read-only) for unknown accounts.
 */
export function getUserRole(email: string): UserRole {
  if (!email) return 'sales';
  const lower = email.toLowerCase();

  for (const mapping of EMAIL_ROLE_MAP) {
    if (lower.includes(mapping.pattern)) {
      return mapping.role;
    }
  }

  // Default: sales (limited permissions)
  return 'sales';
}

/**
 * Get full role config from email.
 */
export function getRoleConfig(email: string): RoleConfig {
  return ROLE_CONFIGS[getUserRole(email)];
}

/** Hold duration in milliseconds (24 hours) */
export const HOLD_DURATION_MS = 24 * 60 * 60 * 1000;
