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
  canMembership: boolean;    // Sales — đăng ký & quản lý hội viên
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
  { pattern: 'bophanpttt', role: 'sales' },
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
      canMembership: true,
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
      canMembership: false,
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
      canMembership: false,
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
      canMembership: false,
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
      canMembership: true,
    },
  },
};

/**
 * Determine user role from email address.
 * Defaults to 'sales' (read-only) for unknown accounts.
 */
export function getUserRole(email: string): UserRole {
  if (!email) return 'sales';
  const lower = email.toLowerCase().trim();
  const username = lower.split('@')[0];

  for (const mapping of EMAIL_ROLE_MAP) {
    if (mapping.pattern.includes('@')) {
      if (lower === mapping.pattern) {
        return mapping.role;
      }
    } else {
      if (username === mapping.pattern) {
        return mapping.role;
      }
    }
  }

  // Default: sales (limited permissions)
  return 'sales';
}

/** Bộ phận phát triển thị trường dùng quyền sales nhưng cần ẩn một số báo cáo nội bộ. */
export function isMarketDevelopmentUser(email: string): boolean {
  const username = (email || '').toLowerCase().trim().split('@')[0];
  return username === 'bophanpttt' || username === 'pttt';
}

/**
 * Get full role config from email.
 */
export function getRoleConfig(email: string): RoleConfig {
  return ROLE_CONFIGS[getUserRole(email)];
}

/**
 * Get specific warehouse data filter for the given email or name.
 * If it returns null, the user is allowed to see data from ALL warehouses.
 */
export function getWarehouseFilter(email: string, name?: string): string | null {
  const role = getUserRole(email);
  
  // Admin, procurement, operations, và sales được xem tất cả kho
  if (['admin', 'procurement', 'operations', 'sales'].includes(role)) {
    return null;
  }

  // Các tài khoản role warehouse bắt buộc phải được gán cứng vào một kho
  const lowerEmail = (email || '').toLowerCase().trim();
  const username = lowerEmail.split('@')[0];
  const lowerName = (name || '').toLowerCase().trim();

  if (username === 'kho1' || lowerName === 'kho 1') return 'Kho Hàm Long';
  if (username === 'kho2' || lowerName === 'kho 2') return 'Kho Kha Vạn Cân';
  if (username === 'kho3' || lowerName === 'kho 3') return 'Kho Kinh Dương Vương';

  // Nếu thuộc bộ phận kho nhưng chưa được gán mã kho hợp lệ, chặn truy cập kho
  return 'UNASSIGNED_WAREHOUSE';
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

/**
 * VIP Admin — tài khoản ẩn, cấp cao nhất.
 * Hoàn toàn vô hình với mọi user khác trong hệ thống.
 */
export const VIP_ADMIN_EMAIL = 'quantri@blackstone.com.vn';

/** Check if an email belongs to the VIP admin */
export function isVIPAdmin(email: string): boolean {
  return email?.toLowerCase().trim() === VIP_ADMIN_EMAIL;
}
