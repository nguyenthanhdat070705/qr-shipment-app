'use client';

import { useState, useEffect } from 'react';
import {
  Users, Shield, Mail, Key, Eye, EyeOff,
  CheckCircle, AlertCircle, Loader2, Lock,
  Edit3, X, Save, UserCheck, Building2, RefreshCw,
  Crown, Warehouse, ShoppingBag, Wrench
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { getUserRole, isVIPAdmin } from '@/config/roles.config';
import { useRouter } from 'next/navigation';

/* ═══════════════════════════════════════════════════════
   Account definitions — 6 system accounts
═══════════════════════════════════════════════════════ */
const SYSTEM_ACCOUNTS = [
  {
    id: 'vip-admin',
    email: 'quantri@blackstone.com.vn',
    displayName: 'Quản trị viên VIP',
    department: 'Ban Giám đốc',
    role: 'admin' as const,
    roleLabel: 'VIP Admin',
    description: 'Toàn quyền quản trị hệ thống — tài khoản cấp cao nhất',
    icon: Crown,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    gradientFrom: 'from-amber-500',
    gradientTo: 'to-yellow-600',
  },
  {
    id: 'admin',
    email: 'admin@blackstone.com.vn',
    displayName: 'Quản trị viên',
    department: 'Ban Quản trị',
    role: 'admin' as const,
    roleLabel: 'Quản trị',
    description: 'Toàn quyền quản trị hệ thống, xem tất cả dữ liệu',
    icon: Crown,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-700',
    gradientFrom: 'from-red-500',
    gradientTo: 'to-rose-600',
  },
  {
    id: 'kho1',
    email: 'kho1@blackstone.com.vn',
    displayName: 'Kho 1',
    department: 'Bộ phận Kho vận',
    role: 'warehouse' as const,
    roleLabel: 'Kho vận',
    description: 'Quản lý nhập/xuất kho tại Kho 1, quét QR sản phẩm',
    icon: Warehouse,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-teal-600',
  },
  {
    id: 'kho2',
    email: 'kho2@blackstone.com.vn',
    displayName: 'Kho 2',
    department: 'Bộ phận Kho vận',
    role: 'warehouse' as const,
    roleLabel: 'Kho vận',
    description: 'Quản lý nhập/xuất kho tại Kho 2, quét QR sản phẩm',
    icon: Warehouse,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-teal-600',
  },
  {
    id: 'kho3',
    email: 'kho3@blackstone.com.vn',
    displayName: 'Kho 3',
    department: 'Bộ phận Kho vận',
    role: 'warehouse' as const,
    roleLabel: 'Kho vận',
    description: 'Quản lý nhập/xuất kho tại Kho 3, quét QR sản phẩm',
    icon: Warehouse,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-teal-600',
  },
  {
    id: 'procurement',
    email: 'bophanthumua@blackstone.com.vn',
    displayName: 'Bộ phận Thu mua',
    department: 'Phòng Thu mua',
    role: 'procurement' as const,
    roleLabel: 'Thu mua',
    description: 'Tạo và quản lý đơn mua hàng, đối chiếu nhập hàng',
    icon: ShoppingBag,
    color: 'text-violet-500',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    badgeBg: 'bg-violet-100',
    badgeText: 'text-violet-700',
    gradientFrom: 'from-violet-500',
    gradientTo: 'to-purple-600',
  },
  {
    id: 'operations',
    email: 'bophanvanhanh@blackstone.com.vn',
    displayName: 'Bộ phận Vận hành',
    department: 'Phòng Vận hành',
    role: 'operations' as const,
    roleLabel: 'Vận hành',
    description: 'Quản lý xuất hàng, giao hàng và vận hành tang lễ',
    icon: Wrench,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-700',
    gradientFrom: 'from-orange-500',
    gradientTo: 'to-amber-600',
  },
];

/* ═══════════════════════════════════════════════════════
   Permission info
═══════════════════════════════════════════════════════ */
const PERMISSIONS_META = [
  { key: 'canAdmin',          label: 'Quản trị hệ thống' },
  { key: 'canCreatePO',       label: 'Tạo đơn mua hàng' },
  { key: 'canManageReceipt',  label: 'Quản lý nhập hàng' },
  { key: 'canReceiveGoods',   label: 'Nhập kho (GRPO)' },
  { key: 'canExport',         label: 'Xuất hàng' },
  { key: 'canManageDelivery', label: 'Quản lý giao hàng' },
  { key: 'canHold',           label: 'Giữ hàng' },
  { key: 'canViewInventory',  label: 'Xem tồn kho' },
  { key: 'canViewProducts',   label: 'Xem sản phẩm' },
];

const ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  admin:       { canAdmin: true,  canCreatePO: true,  canManageReceipt: true,  canReceiveGoods: true,  canExport: true,  canManageDelivery: true,  canHold: true,  canViewInventory: true,  canViewProducts: true },
  procurement: { canAdmin: false, canCreatePO: true,  canManageReceipt: true,  canReceiveGoods: false, canExport: false, canManageDelivery: false, canHold: false, canViewInventory: true,  canViewProducts: true },
  warehouse:   { canAdmin: false, canCreatePO: false, canManageReceipt: false, canReceiveGoods: true,  canExport: true,  canManageDelivery: false, canHold: false, canViewInventory: true,  canViewProducts: true },
  operations:  { canAdmin: false, canCreatePO: false, canManageReceipt: false, canReceiveGoods: false, canExport: true,  canManageDelivery: true,  canHold: false, canViewInventory: true,  canViewProducts: true },
  sales:       { canAdmin: false, canCreatePO: false, canManageReceipt: false, canReceiveGoods: false, canExport: false, canManageDelivery: false, canHold: true,  canViewInventory: true,  canViewProducts: true },
};

/* ═══════════════════════════════════════════════════════
   Change Password Modal
═══════════════════════════════════════════════════════ */
function ChangePasswordModal({
  account,
  onClose,
}: {
  account: typeof SYSTEM_ACCOUNTS[0];
  onClose: () => void;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (newPassword.length < 6) {
      setMsg({ type: 'error', text: 'Mật khẩu phải có ít nhất 6 ký tự.' });
      return;
    }
    if (newPassword !== confirmPass) {
      setMsg({ type: 'error', text: 'Xác nhận mật khẩu không khớp.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/accounts/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: account.email, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: 'Đổi mật khẩu thành công!' });
        setTimeout(() => onClose(), 1500);
      } else {
        setMsg({ type: 'error', text: data.error || 'Lỗi khi đổi mật khẩu.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Lỗi kết nối mạng.' });
    } finally {
      setLoading(false);
    }
  }

  const IconComp = account.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal header */}
        <div className={`bg-gradient-to-r ${account.gradientFrom} ${account.gradientTo} p-5`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <IconComp size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Đổi mật khẩu</h3>
                <p className="text-xs text-white/70">{account.email}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/20 text-white/70 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {msg && (
            <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
              msg.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {msg.text}
            </div>
          )}

          {/* New password */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Mật khẩu mới
            </label>
            <div className="relative">
              <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/20 focus:border-[#1B2A4A] focus:bg-white transition-all"
                placeholder="Nhập mật khẩu mới..."
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Xác nhận mật khẩu
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/20 focus:border-[#1B2A4A] focus:bg-white transition-all"
                placeholder="Nhập lại mật khẩu..."
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1B2A4A] text-white text-sm font-bold hover:bg-[#162240] disabled:opacity-60 transition-colors"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Account Card
═══════════════════════════════════════════════════════ */
function AccountCard({
  account,
  onChangePassword,
  isOnline,
}: {
  account: typeof SYSTEM_ACCOUNTS[0];
  onChangePassword: () => void;
  isOnline: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const permissions = ROLE_PERMISSIONS[account.role] || {};
  const IconComp = account.icon;
  const enabledPerms = PERMISSIONS_META.filter((p) => permissions[p.key]);
  const disabledPerms = PERMISSIONS_META.filter((p) => !permissions[p.key]);

  return (
    <div className={`rounded-2xl border ${account.borderColor} bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden`}>
      {/* Card top strip */}
      <div className={`h-1.5 bg-gradient-to-r ${account.gradientFrom} ${account.gradientTo}`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-4 mb-4">
          {/* Avatar */}
          <div className={`relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${account.gradientFrom} ${account.gradientTo} shadow-lg`}>
            <IconComp size={24} className="text-white" />
            {/* Online indicator */}
            <div className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-400' : 'bg-gray-300'}`} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-bold text-gray-900 truncate">
                {account.displayName}
              </h3>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${account.badgeBg} ${account.badgeText}`}>
                <Shield size={10} />
                {account.roleLabel}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <Mail size={11} />
              <span className="truncate font-mono">{account.email}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Building2 size={11} />
              <span>{account.department}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">{account.description}</p>

        {/* Active permissions summary */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {enabledPerms.slice(0, 3).map((p) => (
            <span key={p.key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${account.bgColor} ${account.color}`}>
              <CheckCircle size={9} />
              {p.label}
            </span>
          ))}
          {enabledPerms.length > 3 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-gray-100 text-gray-500 text-[10px] font-semibold">
              +{enabledPerms.length - 3} quyền khác
            </span>
          )}
        </div>

        {/* Expanded permissions */}
        {expanded && (
          <div className={`rounded-xl p-4 mb-4 ${account.bgColor} border ${account.borderColor}`}>
            <p className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wide">Chi tiết phân quyền</p>
            <div className="grid grid-cols-1 gap-1.5">
              {PERMISSIONS_META.map((perm) => {
                const allowed = permissions[perm.key];
                return (
                  <div key={perm.key} className="flex items-center gap-2">
                    {allowed ? (
                      <CheckCircle size={13} className={account.color} />
                    ) : (
                      <X size={13} className="text-gray-300" />
                    )}
                    <span className={`text-xs ${allowed ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                      {perm.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action row */}
        <div className="flex gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {expanded ? <X size={13} /> : <UserCheck size={13} />}
            {expanded ? 'Ẩn bớt' : 'Xem quyền'}
          </button>
          <button
            onClick={onChangePassword}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r ${account.gradientFrom} ${account.gradientTo} hover:opacity-90 transition-opacity shadow-sm`}
          >
            <Key size={13} />
            Đổi mật khẩu
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Main Page
═══════════════════════════════════════════════════════ */
export default function AccountsPage() {
  const router = useRouter();
  const [selectedAccount, setSelectedAccount] = useState<typeof SYSTEM_ACCOUNTS[0] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVIP, setIsVIP] = useState(false);
  const [checking, setChecking] = useState(true);
  const [onlineEmails, setOnlineEmails] = useState<string[]>([]);
  const [resetMsg, setResetMsg] = useState<string>('');

  // Check admin access
  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        const role = getUserRole(u.email || '');
        if (role !== 'admin') {
          router.replace('/');
          return;
        }
        setIsAdmin(true);
        setIsVIP(isVIPAdmin(u.email || ''));
        // Simulate online detection (in reality this would check session store)
        setOnlineEmails([u.email || '']);
      } else {
        router.replace('/login');
      }
    } catch {
      router.replace('/login');
    } finally {
      setChecking(false);
    }
  }, [router]);

  async function handleResetAllPasswords() {
    if (!confirm('Bạn có chắc muốn reset tất cả mật khẩu về mặc định không?')) return;
    setResetMsg('Đang xử lý...');
    try {
      const res = await fetch('/api/accounts/reset-defaults', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setResetMsg(`✅ ${data.message}`);
      } else {
        setResetMsg(`❌ ${data.error}`);
      }
    } catch {
      setResetMsg('❌ Lỗi kết nối.');
    }
    setTimeout(() => setResetMsg(''), 4000);
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={32} className="animate-spin text-[#2d4a7a]" />
      </div>
    );
  }

  if (!isAdmin) return null;

  // VIP account is completely hidden from non-VIP admins
  const visibleAccounts = isVIP
    ? SYSTEM_ACCOUNTS
    : SYSTEM_ACCOUNTS.filter(a => a.id !== 'vip-admin');

  const stats = [
    { label: 'Tổng tài khoản', value: visibleAccounts.length, color: 'text-[#1B2A4A]', bg: 'bg-blue-50' },
    { label: 'Tài khoản Kho', value: visibleAccounts.filter(a => a.role === 'warehouse').length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Bộ phận khác', value: visibleAccounts.filter(a => a.role !== 'warehouse' && a.role !== 'admin').length, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Quản trị viên', value: visibleAccounts.filter(a => a.role === 'admin').length, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <PageLayout title="Quản lý tài khoản" icon={<Users size={16} className="text-blue-500" />}>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Quản lý tài khoản hệ thống</h1>
            <p className="text-sm text-gray-500 mt-1">
              Xem thông tin và quản lý mật khẩu của {visibleAccounts.length} tài khoản trong hệ thống
            </p>
          </div>
          <button
            onClick={handleResetAllPasswords}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-orange-200 bg-orange-50 text-orange-700 text-sm font-semibold hover:bg-orange-100 transition-colors"
          >
            <RefreshCw size={14} />
            Reset mật khẩu mặc định
          </button>
        </div>

        {/* Reset message */}
        {resetMsg && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
            {resetMsg}
          </div>
        )}

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={i} className={`${s.bg} rounded-2xl p-4 border border-white`}>
              <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Default credentials info ── */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 flex-shrink-0">
              <Shield size={18} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-800 mb-2">Thông tin đăng nhập mặc định</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-xs font-mono">
                {/* VIP credentials — only visible to VIP admin */}
                {isVIP && (
                  <div className="flex items-center gap-2 text-amber-700">
                    <span className="text-amber-400">▸</span>
                    <span>quantri@blackstone.com.vn</span>
                    <span className="text-amber-400">•</span>
                    <span className="font-bold">123456@</span>
                    <span className="text-amber-500 font-bold">⭐ VIP</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-amber-700">
                  <span className="text-amber-400">▸</span>
                  <span>admin@blackstone.com.vn</span>
                  <span className="text-amber-400">•</span>
                  <span className="font-bold">admin123</span>
                </div>
                <div className="flex items-center gap-2 text-amber-700">
                  <span className="text-amber-400">▸</span>
                  <span>kho1@blackstone.com.vn</span>
                  <span className="text-amber-400">•</span>
                  <span className="font-bold">123456@</span>
                </div>
                <div className="flex items-center gap-2 text-amber-700">
                  <span className="text-amber-400">▸</span>
                  <span>kho2@blackstone.com.vn</span>
                  <span className="text-amber-400">•</span>
                  <span className="font-bold">123456@</span>
                </div>
                <div className="flex items-center gap-2 text-amber-700">
                  <span className="text-amber-400">▸</span>
                  <span>kho3@blackstone.com.vn</span>
                  <span className="text-amber-400">•</span>
                  <span className="font-bold">123456@</span>
                </div>
                <div className="flex items-center gap-2 text-amber-700">
                  <span className="text-amber-400">▸</span>
                  <span>bophanthumua@blackstone.com.vn</span>
                  <span className="text-amber-400">•</span>
                  <span className="font-bold">123456@</span>
                </div>
                <div className="flex items-center gap-2 text-amber-700">
                  <span className="text-amber-400">▸</span>
                  <span>bophanvanhanh@blackstone.com.vn</span>
                  <span className="text-amber-400">•</span>
                  <span className="font-bold">123456@</span>
                </div>
              </div>
              <p className="text-xs text-amber-600 mt-3 italic">
                ⚠️ Chỉ quản trị viên mới thấy thông tin này. Hãy đổi mật khẩu định kỳ để bảo mật.
              </p>
            </div>
          </div>
        </div>

        {/* ── Account grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {visibleAccounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onChangePassword={() => setSelectedAccount(account)}
              isOnline={onlineEmails.includes(account.email)}
            />
          ))}
        </div>

        {/* Footer note */}
        <p className="text-xs text-center text-gray-400 pb-4">
          Hệ thống có {visibleAccounts.length} tài khoản được cấu hình sẵn. Liên hệ quản trị viên để thêm tài khoản mới.
        </p>
      </div>

      {/* Change Password Modal */}
      {selectedAccount && (
        <ChangePasswordModal
          account={selectedAccount}
          onClose={() => setSelectedAccount(null)}
        />
      )}
    </PageLayout>
  );
}
