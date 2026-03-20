'use client';

import { useState, useEffect } from 'react';
import { QrCode, ScanLine, Package, CheckCircle, LogOut, LayoutGrid, Truck, User, Menu, X, ChevronRight, Warehouse, Shield } from 'lucide-react';
import QuickLookupForm from '@/components/QuickLookupForm';
import AuthGuard from '@/components/AuthGuard';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUserRole, ROLE_CONFIGS, type UserRole } from '@/config/roles.config';

/* ═══════════════════════════════════════════════════════════
   Sidebar Navigation Component
   ═══════════════════════════════════════════════════════════ */
function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
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

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    router.push('/login');
  };

  const allMenuItems = [
    {
      icon: <Truck size={20} />,
      label: 'Xuất hàng',
      desc: 'Quét QR & xác nhận xuất',
      href: '/',
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
      active: true,
      requiresPermission: 'canExport' as const,
    },
    {
      icon: <Warehouse size={20} />,
      label: 'Kho hàng',
      desc: 'Xem tồn kho, giá, tìm kiếm',
      href: '/inventory',
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      requiresPermission: 'canViewInventory' as const,
    },
    {
      icon: <LayoutGrid size={20} />,
      label: 'Toàn bộ sản phẩm',
      desc: 'Xem danh sách & mã QR',
      href: '/product/fullproductlist',
      color: 'text-indigo-500',
      bg: 'bg-indigo-50',
      requiresPermission: 'canViewProducts' as const,
    },
    {
      icon: <User size={20} />,
      label: 'Thông tin người dùng',
      desc: userEmail || 'Xem thông tin tài khoản',
      href: '/profile',
      color: 'text-amber-500',
      bg: 'bg-amber-50',
    },
  ];

  // Filter menu items by permissions
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
        {/* Sidebar Header */}
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
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Role Badge */}
        <div className="px-5 pt-3 pb-1">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold
            ${userRole === 'inventory'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-blue-100 text-blue-700'
            }`}
          >
            <Shield size={11} />
            {roleConfig.label}
          </div>
        </div>

        {/* Menu Label */}
        <div className="px-5 pt-5 pb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Chức năng
          </p>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-3 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              className={`
                group flex items-center gap-3 px-3 py-3 rounded-xl
                transition-all duration-200
                ${item.active
                  ? 'bg-indigo-50 border border-indigo-100 shadow-sm'
                  : 'hover:bg-gray-50 border border-transparent'}
              `}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.bg} ${item.color} flex-shrink-0`}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${item.active ? 'text-indigo-700' : 'text-gray-800'}`}>
                  {item.label}
                </p>
                <p className="text-xs text-gray-400 truncate">{item.desc}</p>
              </div>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
            </Link>
          ))}
        </nav>

        {/* Sidebar Footer — User Info & Logout */}
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-bold flex-shrink-0">
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
   Main Page
   ═══════════════════════════════════════════════════════════ */
export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content area — shifted right on desktop */}
        <main className="lg:ml-72 min-h-screen transition-all duration-300">
          {/* ── Top bar (mobile) ─────────────────────────── */}
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
            <div className="w-9" /> {/* Spacer to center logo */}
          </div>

          {/* ── Desktop top bar ─────────────────────────── */}
          <div className="hidden lg:flex sticky top-0 z-40 px-6 py-3 items-center justify-between bg-white/80 backdrop-blur-md border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Truck size={16} className="text-emerald-500" />
              <span className="text-sm font-semibold text-gray-700">Xuất hàng</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Hệ thống đang hoạt động
            </div>
          </div>

          {/* ── Hero ─────────────────────────────────────── */}
          <div className="mx-auto max-w-lg px-5 pt-10 pb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-600/30">
              <QrCode size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 mb-2">
              Tìm sản phẩm
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">
              Quét mã QR hoặc nhập mã sản phẩm vào ô bên dưới để xem thông tin và xác nhận xuất kho.
            </p>
          </div>

          {/* ── Form tra cứu chính ───────────────────────── */}
          <div className="mx-auto max-w-lg px-5 pb-8">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <ScanLine size={18} className="text-indigo-500" />
                <h2 className="font-semibold text-gray-900">Quét mã QR / Nhập mã sản phẩm</h2>
              </div>
              <QuickLookupForm />
              <p className="mt-4 text-xs text-gray-400 text-center">
                Mã QR được in trên nhãn sản phẩm là <strong>mã sản phẩm</strong>.
              </p>
            </div>
          </div>

          {/* ── Quick Actions (mobile — replaces sidebar on small screens) ── */}
          <div className="mx-auto max-w-lg px-5 pb-6 lg:hidden">
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/inventory"
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-200 bg-white hover:border-blue-200 hover:shadow-md transition-all"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                  <Warehouse size={20} className="text-blue-500" />
                </div>
                <span className="text-xs font-semibold text-gray-700 text-center leading-tight">Kho hàng</span>
              </Link>
              <Link
                href="/product/fullproductlist"
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-200 bg-white hover:border-indigo-200 hover:shadow-md transition-all"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50">
                  <LayoutGrid size={20} className="text-indigo-500" />
                </div>
                <span className="text-xs font-semibold text-gray-700 text-center leading-tight">Toàn bộ SP</span>
              </Link>
            </div>
          </div>

          {/* ── Hướng dẫn sử dụng ────────────────────────── */}
          <div className="mx-auto max-w-lg px-5 pb-8">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
                Hướng dẫn sử dụng
              </h2>
              <ol className="space-y-4">
                {[
                  {
                    icon: <ScanLine size={16} className="text-indigo-500" />,
                    title: 'Quét mã QR hoặc nhập mã sản phẩm',
                    desc:  'Dùng camera điện thoại quét QR trên nhãn, hoặc nhập thủ công mã sản phẩm.',
                  },
                  {
                    icon: <Package size={16} className="text-indigo-500" />,
                    title: 'Kiểm tra thông tin & tình trạng hàng',
                    desc:  'Xem đầy đủ thông tin sản phẩm và kiểm tra xem hàng còn sẵn sàng xuất không.',
                  },
                  {
                    icon: <CheckCircle size={16} className="text-indigo-500" />,
                    title: 'Nhập mã đơn hàng và xác nhận xuất',
                    desc:  'Chỉ cần nhập mã đơn hàng — hệ thống tự động ghi nhận người xuất, thời gian và số lượng.',
                  },
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 mt-0.5">
                      {step.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                      <p className="text-sm text-gray-500">{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* ── Footer ─────────────────────────────────── */}
          <div className="mx-auto max-w-lg px-5 pb-8 text-center">
            <p className="text-xs text-gray-300">
              © {new Date().getFullYear()} Blackstones. Hệ thống quản lý xuất kho.
            </p>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
