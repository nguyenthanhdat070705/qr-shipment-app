'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Menu, X, ChevronRight, Shield, LogOut,
  Truck, Warehouse, LayoutGrid, User,
  ShoppingCart, PackageCheck, TruckIcon,
  Bell, Search, BarChart3, Settings, BookOpen, Users,
  Package, Clock, ExternalLink, CheckCheck, Receipt,
  Crown, UserPlus, List, Scale, DollarSign, Building, HardDrive,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { getUserRole, ROLE_CONFIGS, ROLE_COLORS, isVIPAdmin, type UserRole } from '@/config/roles.config';
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

  const procurementRole = userRole === 'procurement';
  const operationsRole  = userRole === 'operations';
  const warehouseRole   = userRole === 'warehouse';
  const vipAdmin        = isVIPAdmin(userEmail);

  const allMenuItems: MenuItem[] = [
    /* ── Admin Dashboard (chỉ hiện với admin) ── */
    ...(userRole === 'admin' ? [{
      icon: <BarChart3 size={18} />,
      label: 'Admin Dashboard',
      desc: 'Tổng quan toàn hệ thống',
      href: '/admin',
      color: 'text-red-400',
      iconBg: 'bg-red-500/15',
      section: 'Quản trị',
    } as MenuItem] : []),
    /* ── Procurement Dashboard (ận hành) ── */
    ...(procurementRole ? [{
      icon: <BarChart3 size={18} />,
      label: 'Dashboard Thu mua',
      desc: 'Tổng quan bộ phận',
      href: '/procurement',
      color: 'text-violet-400',
      iconBg: 'bg-violet-500/15',
      section: 'Thu mua',
    } as MenuItem] : []),
    /* ── Operations Dashboard (chỉ hiện với operations) ── */
    ...(operationsRole ? [{
      icon: <BarChart3 size={18} />,
      label: 'Dashboard Vận hành',
      desc: 'Tổng quan bộ phận vận hành',
      href: '/operations',
      color: 'text-orange-400',
      iconBg: 'bg-orange-500/15',
      section: 'Vận hành',
    } as MenuItem] : []),
    /* ── Warehouse Dashboard ── */
    ...(warehouseRole || userRole === 'admin' ? [{
      icon: <BarChart3 size={18} />,
      label: 'Dashboard Kho',
      desc: 'Tổng quan nghiệp vụ kho',
      href: '/warehouse',
      color: 'text-emerald-400',
      iconBg: 'bg-emerald-500/15',
      section: 'Kho vận',
    } as MenuItem] : []),
    /* ── Sales Dashboard ── */
    ...(userRole === 'sales' || userRole === 'admin' ? [{
      icon: <BarChart3 size={18} />,
      label: 'Dashboard Bán hàng',
      desc: 'Tổng quan bộ phận bán hàng',
      href: '/sales',
      color: 'text-blue-400',
      iconBg: 'bg-blue-500/15',
      section: 'Bán hàng',
    } as MenuItem] : []),
    ...(userRole === 'sales' || userRole === 'admin' ? [{
      icon: <ShoppingCart size={18} />,
      label: 'Tạo đơn hàng mới',
      desc: 'Lên đơn bán vật tư lẻ',
      href: '/sales/orders',
      color: 'text-amber-400',
      iconBg: 'bg-amber-500/15',
      section: 'Bán hàng',
    } as MenuItem] : []),
    ...(userRole === 'sales' || userRole === 'admin' ? [{
      icon: <Receipt size={18} />,
      label: 'Bán gói sản phẩm',
      desc: 'Lên đơn & đăng ký thành viên',
      href: '/sales/packages',
      color: 'text-rose-400',
      iconBg: 'bg-rose-500/15',
      section: 'Bán hàng',
    } as MenuItem] : []),
    ...(userRole === 'sales' || userRole === 'admin' ? [{
      icon: <Scale size={18} />,
      label: 'Văn bản pháp lý',
      desc: 'Quy chế tài chính & nội bộ',
      href: '/sales/legal-documents',
      color: 'text-amber-400',
      iconBg: 'bg-amber-500/15',
      section: 'Bán hàng',
    } as MenuItem] : []),
    ...(userRole === 'sales' || userRole === 'admin' ? [{
      icon: <Building size={18} />,
      label: 'CRM GetFly',
      desc: 'KH, deals & công việc',
      href: '/sales/crm',
      color: 'text-violet-400',
      iconBg: 'bg-violet-500/15',
      section: 'Bán hàng',
    } as MenuItem] : []),
    /* ── Membership (chỉ sales + admin) ── */
    {
      icon: <Crown size={18} />,
      label: 'Hội viên',
      desc: 'Dashboard hội viên',
      href: '/membership',
      color: 'text-yellow-400',
      iconBg: 'bg-yellow-500/15',
      requiresPermission: 'canMembership',
      section: 'Hội viên',
    },
    {
      icon: <UserPlus size={18} />,
      label: 'Đăng ký HV mới',
      desc: 'Thêm hội viên mới',
      href: '/membership/register',
      color: 'text-lime-400',
      iconBg: 'bg-lime-500/15',
      requiresPermission: 'canMembership',
    },
    {
      icon: <List size={18} />,
      label: 'Danh sách HV',
      desc: 'Tra cứu hội viên',
      href: '/membership/list',
      color: 'text-cyan-400',
      iconBg: 'bg-cyan-500/15',
      requiresPermission: 'canMembership',
    },
    {
      icon: <Search size={18} />,
      label: 'Tra Cứu HV',
      desc: 'Tìm theo SĐT / Mã HV',
      href: '/membership/lookup',
      color: 'text-teal-400',
      iconBg: 'bg-teal-500/15',
      requiresPermission: 'canMembership',
    },
    {
      icon: <HardDrive size={18} />,
      label: 'DS Hợp đồng',
      desc: 'Kho hợp đồng (Drive)',
      href: '/membership/contracts',
      color: 'text-indigo-400',
      iconBg: 'bg-indigo-500/15',
      requiresPermission: 'canMembership',
    },
    {
      icon: <DollarSign size={18} />,
      label: 'Đối soát hoa hồng',
      desc: 'Thanh toán & báo cáo HH',
      href: '/membership/commission',
      color: 'text-emerald-400',
      iconBg: 'bg-emerald-500/15',
      requiresPermission: 'canMembership',
    },
    {
      icon: <MessageSquare size={18} />,
      label: 'Zalo Automation',
      desc: 'ZNS & chăm sóc tự động',
      href: '/zalo-automation',
      color: 'text-blue-400',
      iconBg: 'bg-blue-500/15',
      requiresPermission: 'canMembership',
    },
    /* ── Core SCM Flow ── */
    {
      icon: <Search size={18} />,
      label: 'Tìm kiếm hàng',
      desc: 'Tra cứu',
      href: '/',
      color: 'text-blue-400',
      iconBg: 'bg-blue-500/15',
      section: (procurementRole || warehouseRole) ? undefined : 'Nghiệp vụ',
    },
    {
      icon: <ShoppingCart size={18} />,
      label: 'Đặt hàng',
      desc: 'Tạo & quản lý PO',
      href: '/purchase-orders',
      color: 'text-violet-400',
      iconBg: 'bg-violet-500/15',
      requiresPermission: 'canCreatePO',
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
      desc: 'IT & GRIT',
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
    {
      icon: <BookOpen size={18} />,
      label: 'Đám',
      desc: 'Thông tin tổ chức',
      href: '/funerals',
      color: 'text-pink-400',
      iconBg: 'bg-pink-500/15',
      requiresPermission: 'canViewProducts',
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
    /* ── Quản lý sản phẩm (admin + procurement) ── */
    ...((userRole === 'admin' || userRole === 'procurement') ? [{
      icon: <Package size={18} />,
      label: 'Quản lý hòm',
      desc: 'Tạo mã & thêm sản phẩm hòm',
      href: '/products-manage',
      color: 'text-purple-400',
      iconBg: 'bg-purple-500/15',
    } as MenuItem] : []),
    /* ── Quản lý NCC (admin + procurement) ── */
    ...((userRole === 'admin' || userRole === 'procurement') ? [{
      icon: <Truck size={18} />,
      label: 'Quản lý NCC',
      desc: 'Nhà cung cấp',
      href: '/suppliers-manage',
      color: 'text-orange-400',
      iconBg: 'bg-orange-500/15',
    } as MenuItem] : []),
    /* ── Quản lý kho (admin only) ── */
    ...(userRole === 'admin' ? [{
      icon: <Warehouse size={18} />,
      label: 'Quản lý kho',
      desc: 'Tạo & quản lý kho hàng',
      href: '/warehouses-manage',
      color: 'text-emerald-400',
      iconBg: 'bg-emerald-500/15',
    } as MenuItem] : []),
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
    /* ── Chỉ admin mới thấy quản lý tài khoản ── */
    ...(userRole === 'admin' ? [{
      icon: <Users size={18} />,
      label: 'Quản lý tài khoản',
      desc: vipAdmin ? '7 tài khoản hệ thống' : '6 tài khoản hệ thống',
      href: '/accounts',
      color: 'text-red-400',
      iconBg: 'bg-red-500/15',
    } as MenuItem] : []),
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
        <div className="py-6 border-b border-white/[0.07] flex items-center justify-center relative">
          <div className="flex items-center justify-center">
            <div className="p-2">
              <Image
                src="/blackstones-logo.webp"
                alt="Blackstones"
                width={130}
                height={28}
                style={{ height: 'auto', filter: 'brightness(0) invert(1)' }}
              />
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-white/10 text-white/50 transition-colors">
            <X size={18} />
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
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('sales');
  const [searchVal, setSearchVal] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    try {
      const authRaw = localStorage.getItem('auth_user');
      if (authRaw) {
        const u = JSON.parse(authRaw);
        setUserEmail(u.email || '');
        setUserName(u.ho_ten || '');
        setUserRole(getUserRole(u.email || ''));
      }
      const avatarRaw = localStorage.getItem('avatar_url');
      if (avatarRaw) {
        setAvatarUrl(avatarRaw);
      }
    } catch { /* ignore */ }
  }, []);

  const roleColor = ROLE_COLORS[userRole];
  const roleConfig = ROLE_CONFIGS[userRole];
  const initial = userEmail ? userEmail[0].toUpperCase() : 'U';

  /* ── Notification State ── */
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; title: string; message: string; type: string; reference_id?: string; is_read: boolean; created_at: string }[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    if (!userRole) return;
    try {
      const res = await fetch(`/api/notifications?role=${userRole}&unread=false`);
      const json = await res.json();
      setNotifications(json.data || []);
      setUnreadCount(json.unread_count || 0);
    } catch { /* ignore */ }
  }, [userRole]);

  // Poll every 30s
  useEffect(() => {
    if (!userRole) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [userRole, fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleDismiss = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'dismiss' }),
    });
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'read_all', role: userRole }),
    });
    fetchNotifications();
  };

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
          {/* ── Live Notification Bell ── */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {notifOpen && (
              <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <h3 className="text-sm font-extrabold text-gray-800">Thông báo</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <CheckCheck size={12} /> Đọc tất cả
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-400">
                      <Bell size={24} className="mx-auto mb-2 text-gray-300" />
                      Không có thông báo
                    </div>
                  ) : (
                    notifications.slice(0, 15).map((n) => (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${
                          !n.is_read ? 'bg-blue-50/50' : ''
                        }`}
                        onClick={() => {
                          if (n.reference_id) {
                            router.push(`/goods-receipt/${n.reference_id}`);
                            setNotifOpen(false);
                          }
                        }}
                      >
                        {/* Icon */}
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0 ${
                          n.type === 'temporary_receipt' ? 'bg-amber-100' : 'bg-blue-100'
                        }`}>
                          {n.type === 'temporary_receipt' 
                            ? <Package size={16} className="text-amber-600" />
                            : <PackageCheck size={16} className="text-blue-600" />
                          }
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate">
                            {!n.is_read && <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5" />}
                            {n.title}
                          </p>
                          <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{n.message}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-gray-400">
                              <Clock size={10} className="inline mr-0.5" />
                              {new Date(n.created_at).toLocaleDateString('vi-VN')} {new Date(n.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {n.type === 'temporary_receipt' && (userRole === 'admin' || userRole === 'procurement') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push('/purchase-orders/create');
                                  setNotifOpen(false);
                                }}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold hover:bg-amber-200 transition-colors"
                              >
                                <ExternalLink size={9} /> Tạo PO
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Dismiss */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDismiss(n.id); }}
                          className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                          title="Xóa"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors hidden sm:flex">
            <Settings size={18} />
          </button>

          <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />

          {/* User pill */}
          <Link href="/profile" className="flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
            {avatarUrl ? (
              <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0 border border-gray-200">
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#1B2A4A] to-indigo-600 text-white text-xs font-bold flex-shrink-0">
                {initial}
              </div>
            )}
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-gray-800 leading-none truncate max-w-[100px]">
                {userName || userEmail.split('@')[0] || 'User'}
              </p>
              <div className={`inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${roleColor.bg} ${roleColor.text}`}>
                {roleConfig.label}
              </div>
            </div>
          </Link>
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
