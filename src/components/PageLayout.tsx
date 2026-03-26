'use client';

import { useState, useEffect } from 'react';
import {
  Menu, X, ChevronRight, Shield, LogOut,
  Truck, Warehouse, LayoutGrid, User,
  ShoppingCart, PackageCheck, TruckIcon,
  Bell, Search, BarChart3, Settings,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { getUserRole, ROLE_CONFIGS, ROLE_COLORS, type UserRole } from '@/config/roles.config';
import AuthGuard from '@/components/AuthGuard';

/* ═══════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════ */
interface MenuItem {
  icon: React.ReactNode;
  label: string;
  desc: string;
  href: string;
  color: string;        // icon fg color (text-*)
  iconBg: string;       // icon bg (bg-*)
  requiresPermission?: keyof typeof ROLE_CONFIGS.admin.permissions;
  section?: string;
}

/* ═══════════════════════════════════════════════════
   Sidebar
═══════════════════════════════════════════════════ */
function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState('');
  const [userRole,  setUserRole]  = useState<UserRole>('sales');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        setUserEmail(u.email || '');
        // Luôn gán lại role từ email thay vì dùng cache u.role, 
        // để khi config thay đổi, Admin sẽ thấy quyền mới ngay.
        setUserRole(getUserRole(u.email || ''));
      }
    } catch { /* ignore */ }
  }, []);

  const roleConfig = ROLE_CONFIGS[userRole];
  const roleColor  = ROLE_COLORS[userRole];

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    router.push('/login');
  };

  const allMenuItems: MenuItem[] = [
    /* ── Core SCM Flow ── */
    {
      icon: <ShoppingCart size={18} />,
      label: 'Đặt hàng',
      desc: 'Tạo & quản lý PO',
      href: '/purchase-orders',
      color: 'text-violet-400',
      iconBg: 'bg-violet-500/15',
      requiresPermission: 'canCreatePO',
      section: 'Nghiệp vụ',
    },
    {
      icon: <PackageCheck size={18} />,
      label: 'Nhập hàng',
      desc: 'Phiếu nhập (GRPO)',
      href: '/goods-receipt',
      color: 'text-orange-400',
      iconBg: 'bg-orange-500/15',
      requiresPermission: 'canReceiveGoods',
    },
    {
      icon: <PackageCheck size={18} />,
      label: 'Quản lý nhập hàng',
      desc: 'Đối chiếu PO & kho',
      href: '/receipt-management',
      color: 'text-indigo-400',
      iconBg: 'bg-indigo-500/15',
      requiresPermission: 'canManageReceipt',
    },
    {
      icon: <Truck size={18} />,
      label: 'Xuất hàng',
      desc: 'Quét QR & xác nhận xuất',
      href: '/goods-issue',
      color: 'text-emerald-400',
      iconBg: 'bg-emerald-500/15',
      requiresPermission: 'canExport',
    },
    {
      icon: <TruckIcon size={18} />,
      label: 'Điều phối',
      desc: 'Quản lý giao hàng',
      href: '/operations',
      color: 'text-amber-400',
      iconBg: 'bg-amber-500/15',
      requiresPermission: 'canManageDelivery',
    },
    /* ── Tồn kho ── */
    {
      icon: <Warehouse size={18} />,
      label: 'Kho hàng',
      desc: 'Xem tồn kho, QR lô',
      href: '/inventory',
      color: 'text-sky-400',
      iconBg: 'bg-sky-500/15',
      requiresPermission: 'canViewInventory',
      section: 'Kho',
    },
    {
      icon: <LayoutGrid size={18} />,
      label: 'Toàn bộ sản phẩm',
      desc: 'Danh sách & mã QR',
      href: '/product/fullproductlist',
      color: 'text-teal-400',
      iconBg: 'bg-teal-500/15',
      requiresPermission: 'canViewProducts',
    },
    /* ── Hệ thống ── */
    {
      icon: <User size={18} />,
      label: 'Hồ sơ cá nhân',
      desc: userEmail || 'Tài khoản',
      href: '/profile',
      color: 'text-slate-400',
      iconBg: 'bg-slate-500/15',
      section: 'Hệ thống',
    },
  ];

  // Filter by permissions
  const menuItems = allMenuItems.filter((item) => {
    if (!item.requiresPermission) return true;
    return roleConfig.permissions[item.requiresPermission];
  });

  // Group by section
  const sections: { label: string; items: MenuItem[] }[] = [];
  let currentSection = '';
  menuItems.forEach((item) => {
    if (item.section && item.section !== currentSection) {
      currentSection = item.section;
      sections.push({ label: item.section, items: [] });
    }
    if (sections.length === 0) sections.push({ label: '', items: [] });
    sections[sections.length - 1].items.push(item);
  });

  const initial = userEmail ? userEmail[0].toUpperCase() : 'U';

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar — dark navy */}
      <aside
        className={`
          fixed top-0 left-0 bottom-0 z-[70] w-64
          bg-[#0f1629] border-r border-white/[0.06]
          flex flex-col shadow-2xl
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:z-30
        `}
      >
        {/* ── Logo ── */}
        <div className="px-5 py-5 border-b border-white/[0.07] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-white/10 rounded-xl">
              <Image
                src="/blackstones-logo.webp"
                alt="Blackstones"
                width={100}
                height={22}
                style={{ height: 'auto', filter: 'brightness(0) invert(1)' }}
              />
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-white/50 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* ── Role badge ── */}
        <div className="px-5 pt-4 pb-1">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border
            ${userRole === 'admin'       ? 'bg-red-500/15 text-red-300 border-red-500/20' :
              userRole === 'procurement' ? 'bg-violet-500/15 text-violet-300 border-violet-500/20' :
              userRole === 'warehouse'   ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' :
              userRole === 'operations'  ? 'bg-amber-500/15 text-amber-300 border-amber-500/20' :
                                          'bg-sky-500/15 text-sky-300 border-sky-500/20'}`}>
            <Shield size={10} />
            {roleConfig.label}
          </div>
        </div>

        {/* ── Menu ── */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-5 scrollbar-thin">
          {sections.map((section) => (
            <div key={section.label}>
              {section.label && (
                <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/25">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`
                        group flex items-center gap-3 px-3 py-2.5 rounded-xl
                        transition-all duration-150
                        ${isActive
                          ? 'bg-white/[0.12] text-white'
                          : 'text-white/60 hover:bg-white/[0.07] hover:text-white/90'
                        }
                      `}
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 transition-colors
                        ${isActive ? item.iconBg + ' ' + item.color : 'bg-white/5 ' + item.color}`}>
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate transition-colors ${isActive ? 'text-white' : 'text-white/75 group-hover:text-white'}`}>
                          {item.label}
                        </p>
                        <p className="text-[11px] text-white/35 truncate">{item.desc}</p>
                      </div>
                      {isActive && <div className="w-1 h-5 rounded-full bg-white/40 flex-shrink-0" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Footer ── */}
        <div className="border-t border-white/[0.07] p-4">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-sm font-bold flex-shrink-0 shadow-lg">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white/80 truncate">{userEmail || 'Người dùng'}</p>
              <p className="text-[10px] text-white/30 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Đang hoạt động
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl
                       bg-white/5 border border-white/10
                       text-white/50 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20
                       transition-all duration-200 text-xs font-semibold"
          >
            <LogOut size={13} />
            Đăng xuất
          </button>
        </div>
      </aside>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   Top Bar
═══════════════════════════════════════════════════ */
function TopBar({
  onMenuOpen,
  title,
  icon,
}: {
  onMenuOpen: () => void;
  title: string;
  icon?: React.ReactNode;
}) {
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('sales');
  const [searchVal, setSearchVal] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        setUserEmail(u.email || '');
        setUserRole(getUserRole(u.email || ''));
      }
    } catch { /* ignore */ }
  }, []);

  const roleColor = ROLE_COLORS[userRole];
  const roleConfig = ROLE_CONFIGS[userRole];
  const initial = userEmail ? userEmail[0].toUpperCase() : 'U';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">

        {/* Left: hamburger (mobile) + breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuOpen}
            className="lg:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2">
            {icon && <span className="hidden sm:flex">{icon}</span>}
            <span className="text-sm font-bold text-gray-800 hidden sm:block">{title}</span>
          </div>
        </div>

        {/* Center: Search */}
        <div className="flex-1 max-w-xs mx-4 hidden md:block">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/20 focus:border-[#1B2A4A] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Right: notifications + user */}
        <div className="flex items-center gap-2">
          <button className="relative p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-400 rounded-full" />
          </button>
          <button className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors hidden sm:flex">
            <Settings size={18} />
          </button>

          <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />

          {/* User pill */}
          <div className="flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#1B2A4A] to-indigo-600 text-white text-xs font-bold flex-shrink-0">
              {initial}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-gray-800 leading-none truncate max-w-[100px]">
                {userEmail.split('@')[0] || 'User'}
              </p>
              <div className={`inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${roleColor.bg} ${roleColor.text}`}>
                {roleConfig.label}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════════════
   PageLayout — main export
═══════════════════════════════════════════════════ */
interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  icon?: React.ReactNode;
}

export default function PageLayout({ children, title, icon }: PageLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthGuard>
      {/* Background */}
      <div className="min-h-screen bg-[#f5f6fa]">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content shifted right on desktop */}
        <div className="lg:ml-64 flex flex-col min-h-screen">
          {/* Top bar */}
          <TopBar
            onMenuOpen={() => setSidebarOpen(true)}
            title={title}
            icon={icon}
          />

          {/* Page content */}
          <main className="flex-1 p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
