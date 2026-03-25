'use client';

import { useState, useEffect } from 'react';
import { Menu, X, ChevronRight, Shield, LogOut, Truck, Warehouse, LayoutGrid, User, ShoppingCart, PackageCheck, TruckIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { getUserRole, ROLE_CONFIGS, ROLE_COLORS, type UserRole } from '@/config/roles.config';
import AuthGuard from '@/components/AuthGuard';

/* ═══════════════════════════════════════════════════════════
   Sidebar Navigation Component — Dynamic by Role
   ═══════════════════════════════════════════════════════════ */

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  desc: string;
  href: string;
  color: string;
  bg: string;
  requiresPermission?: keyof typeof ROLE_CONFIGS.admin.permissions;
}

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('sales');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        setUserEmail(u.email || '');
        setUserRole(u.role || getUserRole(u.email || ''));
      }
    } catch { /* ignore */ }
  }, []);

  const roleConfig = ROLE_CONFIGS[userRole];
  const roleColor = ROLE_COLORS[userRole];

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    router.push('/login');
  };

  const allMenuItems: MenuItem[] = [
    {
      icon: <Truck size={20} />,
      label: 'Xuất hàng',
      desc: 'Quét QR & xác nhận xuất',
      href: '/goods-issue',
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
      requiresPermission: 'canExport',
    },
    {
      icon: <ShoppingCart size={20} />,
      label: 'Đơn mua hàng',
      desc: 'Tạo & quản lý PO',
      href: '/purchase-orders',
      color: 'text-purple-500',
      bg: 'bg-purple-50',
      requiresPermission: 'canCreatePO',
    },
    {
      icon: <PackageCheck size={20} />,
      label: 'Nhập kho',
      desc: 'Phiếu nhập hàng (GRPO)',
      href: '/goods-receipt',
      color: 'text-orange-500',
      bg: 'bg-orange-50',
      requiresPermission: 'canReceiveGoods',
    },
    {
      icon: <PackageCheck size={20} />,
      label: 'Quản lý nhập hàng',
      desc: 'Duyệt QR tồn kho',
      href: '/receipt-management',
      color: 'text-indigo-500',
      bg: 'bg-indigo-50',
      requiresPermission: 'canManageReceipt',
    },
    {
      icon: <Warehouse size={20} />,
      label: 'Kho hàng',
      desc: 'Xem tồn kho, giá, tìm kiếm',
      href: '/inventory',
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      requiresPermission: 'canViewInventory',
    },
    {
      icon: <TruckIcon size={20} />,
      label: 'Vận hành',
      desc: 'Quản lý giao hàng',
      href: '/operations',
      color: 'text-amber-500',
      bg: 'bg-amber-50',
      requiresPermission: 'canManageDelivery',
    },
    {
      icon: <LayoutGrid size={20} />,
      label: 'Toàn bộ sản phẩm',
      desc: 'Xem danh sách & mã QR',
      href: '/product/fullproductlist',
      color: 'text-[#2d4a7a]',
      bg: 'bg-[#eef1f7]',
      requiresPermission: 'canViewProducts',
    },
    {
      icon: <User size={20} />,
      label: 'Thông tin người dùng',
      desc: userEmail || 'Xem thông tin tài khoản',
      href: '/profile',
      color: 'text-gray-500',
      bg: 'bg-gray-50',
    },
  ];

  // Filter by permissions
  const menuItems = allMenuItems.filter((item) => {
    if (!item.requiresPermission) return true;
    return roleConfig.permissions[item.requiresPermission];
  });

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 bottom-0 z-[70] w-72
          bg-white border-r border-gray-200 shadow-xl
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:shadow-none lg:z-30
        `}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-xl">
              <Image
                src="/blackstones-logo.webp"
                alt="Blackstones"
                width={110}
                height={24}
                style={{ height: 'auto' }}
              />
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Role Badge */}
        <div className="px-5 pt-3 pb-1">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${roleColor.bg} ${roleColor.text}`}>
            <Shield size={11} />
            {roleConfig.label}
          </div>
        </div>

        {/* Menu Label */}
        <div className="px-5 pt-5 pb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Chức năng</p>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className={`
                  group flex items-center gap-3 px-3 py-3 rounded-xl
                  transition-all duration-200
                  ${isActive
                    ? 'bg-[#eef1f7] border border-[#d5dbe9] shadow-sm'
                    : 'hover:bg-gray-50 border border-transparent'}
                `}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.bg} ${item.color} flex-shrink-0`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${isActive ? 'text-[#162240]' : 'text-gray-800'}`}>
                    {item.label}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{item.desc}</p>
                </div>
                <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
              </Link>
            );
          })}
        </nav>

        {/* Footer — User Info & Logout */}
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#1B2A4A] to-teal-500 text-white text-sm font-bold flex-shrink-0">
              {userEmail ? userEmail[0].toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-800 truncate">
                {userEmail || 'Người dùng'}
              </p>
              <p className="text-[10px] text-gray-400">Đang hoạt động</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl
                       bg-gray-50 border border-gray-200
                       text-gray-500 hover:text-red-500 hover:bg-red-50 hover:border-red-200
                       transition-all duration-200 text-xs font-semibold"
          >
            <LogOut size={14} />
            Đăng xuất
          </button>
        </div>
      </aside>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   PageLayout — Shared wrapper with Sidebar + Topbar
   ═══════════════════════════════════════════════════════════ */

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  icon?: React.ReactNode;
}

export default function PageLayout({ children, title, icon }: PageLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-[#faf7f2] via-white to-slate-50">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="lg:ml-72 min-h-screen transition-all duration-300">
          {/* Mobile top bar */}
          <div className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-gray-100 lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <Menu size={20} />
            </button>
            <Image
              src="/blackstones-logo.webp"
              alt="Blackstones"
              width={120}
              height={26}
              style={{ height: 'auto', filter: 'invert(1) brightness(0.2)' }}
            />
            <div className="w-9" />
          </div>

          {/* Desktop top bar */}
          <div className="hidden lg:flex sticky top-0 z-40 px-6 py-3 items-center justify-between bg-white/80 backdrop-blur-md border-b border-gray-100">
            <div className="flex items-center gap-2">
              {icon}
              <span className="text-sm font-semibold text-gray-700">{title}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Hệ thống đang hoạt động
            </div>
          </div>

          {/* Page content */}
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
