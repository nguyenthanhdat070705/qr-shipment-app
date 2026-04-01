/**
 * ============================================================
 * roles.config.ts — Cấu hình phân quyền người dùng
 * ============================================================
 *
 * Phase 3 — 5 roles:
 * - admin:       Quản trị toàn quyền
 * - procurement: Thu mua — tạo/quản lý PO
 * - warehouse:   Kho — nhập/xuất hàng, inventory
 * - operations:  Vận hành — quản lý giao hàng
 * - sales:       Bán hàng — xem + giữ hàng
 */

export type UserRole = 'admin' | 'procurement' | 'warehouse' | 'operations' | 'sales';

export interface RolePermissions {
  canAdmin: boolean;
  canCreatePO: boolean;
  canManageReceipt: boolean; // Thu mua duyệt nhập hàng
  canReceiveGoods: boolean;  // Kho quét mã nhập hàng
  canExport: boolean;
  canManageDelivery: boolean;
  canHold: boolean;
  canViewInventory: boolean;
  canViewProducts: boolean;
}

export interface RoleConfig {
  role: UserRole;
  label: string;
  description: string;
  permissions: RolePermissions;
}

/** map email patterns to roles */
const EMAIL_ROLE_MAP: { pattern: string; role: UserRole }[] = [
  // Admin
  { pattern: 'admin', role: 'admin' },
  { pattern: 'quantri', role: 'admin' },
  // Procurement (Thu mua)
  { pattern: 'bophanthumua', role: 'procurement' },
  { pattern: 'thuamua', role: 'procurement' },
  { pattern: 'muahang', role: 'procurement' },
  { pattern: 'procurement', role: 'procurement' },
  // Warehouse (Kho)
  { pattern: 'bophankho', role: 'warehouse' },
  { pattern: 'xuatkhobanhang', role: 'warehouse' },
  { pattern: 'xuatkho', role: 'warehouse' },
  { pattern: 'kho1', role: 'warehouse' },
  { pattern: 'kho2', role: 'warehouse' },
  { pattern: 'kho3', role: 'warehouse' },
  { pattern: 'nhapkho', role: 'warehouse' },
  // Operations (Vận hành)
  { pattern: 'bophanvanhanh', role: 'operations' },
  { pattern: 'vanhanh', role: 'operations' },
  { pattern: 'giaonhan', role: 'operations' },
  { pattern: 'operations', role: 'operations' },
  // Sales
  { pattern: 'bophanbanhang', role: 'sales' },
  { pattern: 'sales', role: 'sales' },
  { pattern: 'banhang', role: 'sales' },
];

/** Role configurations */
export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  admin: {
    role: 'admin',
    label: 'Quản trị',
    description: 'Quản trị toàn hệ thống',
    permissions: {
      canAdmin: true,
      canCreatePO: true,
      canManageReceipt: true,
      canReceiveGoods: true,
      canExport: true,
      canManageDelivery: true,
      canHold: true,
      canViewInventory: true,
      canViewProducts: true,
    },
  },
  procurement: {
    role: 'procurement',
    label: 'Thu mua',
    description: 'Tạo và quản lý đơn mua hàng',
    permissions: {
      canAdmin: false,
      canCreatePO: true,
      canManageReceipt: true,
      canReceiveGoods: false,
      canExport: false,
      canManageDelivery: false,
      canHold: false,
      canViewInventory: true,
      canViewProducts: true,
    },
  },
  warehouse: {
    role: 'warehouse',
    label: 'Kho vận',
    description: 'Quản lý nhập/xuất kho',
    permissions: {
      canAdmin: false,
      canCreatePO: false,
      canManageReceipt: false,
      canReceiveGoods: true,
      canExport: true,
      canManageDelivery: false,
      canHold: false,
      canViewInventory: true,
      canViewProducts: true,
    },
  },
  operations: {
    role: 'operations',
    label: 'Vận hành',
    description: 'Quản lý giao hàng, xuất hàng và vận hành tang lễ',
    permissions: {
      canAdmin: false,
      canCreatePO: false,
      canManageReceipt: false,
      canReceiveGoods: false,
      canExport: true,
      canManageDelivery: true,
      canHold: false,
      canViewInventory: true,
      canViewProducts: true,
    },
  },
  sales: {
    role: 'sales',
    label: 'Bán hàng',
    description: 'Xem hàng & giữ hàng',
    permissions: {
      canAdmin: false,
      canCreatePO: false,
      canManageReceipt: false,
      canReceiveGoods: false,
      canExport: false,
      canManageDelivery: false,
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

/**
 * Get specific warehouse data filter for the given email.
 * If it returns null, the user is allowed to see data from ALL warehouses.
 *
 * NOTE: Tên kho thực trong DB là 'Kho Hàm Long', 'Kho Kha Vạn Cân', 'Kho Kinh Dương Vương'
 * Các tài khoản kho1/kho2/kho3 được phép xem toàn bộ tồn kho.
 */
export function getWarehouseFilter(email: string): string | null {
  if (!email) return null;
  // Tất cả tài khoản kho (kho1, kho2, kho3) và admin đều xem được toàn bộ kho
  // Không filter theo kho cụ thể vì tên kho trong DB không khớp với pattern
  return null;
}

/** Hold duration in milliseconds (24 hours) */
export const HOLD_DURATION_MS = 24 * 60 * 60 * 1000;

/** Role badge colors */
export const ROLE_COLORS: Record<UserRole, { bg: string; text: string }> = {
  admin:       { bg: 'bg-red-100',     text: 'text-red-700' },
  procurement: { bg: 'bg-purple-100',  text: 'text-purple-700' },
  warehouse:   { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  operations:  { bg: 'bg-orange-100',  text: 'text-orange-700' },
  sales:       { bg: 'bg-blue-100',    text: 'text-blue-700' },
};
