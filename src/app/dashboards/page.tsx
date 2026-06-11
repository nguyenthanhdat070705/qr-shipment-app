'use client';

import { useState, useEffect } from 'react';
import { LayoutDashboard, BarChart3, Warehouse, ShoppingCart, BookOpen, Truck, Crown, Package, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import { PageHeader, Card } from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import { getUserRole, isMarketDevelopmentUser, UserRole } from '@/config/roles.config';

type Tone = 'primary' | 'accent' | 'success' | 'info' | 'rose' | 'teal' | 'amber';

const TONE_TILE: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary dark:bg-primary/25',
  accent: 'bg-brand-100 text-brand-700 dark:bg-brand-400/15 dark:text-brand-300',
  success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  info: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
  rose: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
};

export default function DashboardsHubPage() {
  const [userRole, setUserRole] = useState<UserRole>('sales');
  const [userEmail, setUserEmail] = useState('');
  const [roleReady, setRoleReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem('auth_user');
        if (raw) {
          const u = JSON.parse(raw);
          const email = u.email || '';
          setUserEmail(email);
          setUserRole(getUserRole(email));
        }
      } catch { /* ignore */ }
      setRoleReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const isMarketDevelopment = isMarketDevelopmentUser(userEmail);
  const canViewMembershipDashboard = userEmail.toLowerCase().trim() === 'admin@blackstone.com.vn';

  const dashboards: { id: string; title: string; icon: React.ReactNode; desc: string; href: string; tone: Tone }[] = roleReady
    ? [
        ...(userRole === 'admin' || userRole === 'warehouse'
          ? [{ id: 'warehouse', title: 'Dashboard Kho', icon: <Warehouse size={24} />, desc: 'Theo dõi tồn kho, xuất nhập, giá trị hàng hóa hiện tại.', href: '/warehouse', tone: 'success' as Tone }]
          : []),
        ...(canViewMembershipDashboard
          ? [{ id: 'membership', title: 'Dashboard Membership', icon: <Crown size={24} />, desc: 'Phân tích hội viên, hợp đồng GetFly, doanh thu, công nợ, thời hạn.', href: '/dashboards/membership', tone: 'accent' as Tone }]
          : []),
        ...(userRole === 'admin' || userRole === 'sales' || userRole === 'operations'
          ? [{ id: 'funerals', title: 'Dashboard Đám', icon: <BookOpen size={24} />, desc: 'Tiến độ thực hiện đám, biểu đồ Gantt, phân bổ nhân sự.', href: '/funerals/dashboard', tone: 'rose' as Tone }]
          : []),
        ...(userRole === 'admin'
          ? [{ id: 'admin', title: 'Admin Dashboard', icon: <BarChart3 size={24} />, desc: 'Tổng quan toàn hệ thống kinh doanh, kho vận, tài chính.', href: '/admin', tone: 'primary' as Tone }]
          : []),
        ...(userRole === 'admin' || (userRole === 'sales' && !isMarketDevelopment)
          ? [{ id: 'sales', title: 'Dashboard Bán Hàng', icon: <ShoppingCart size={24} />, desc: 'Hiệu suất bán hàng, đơn giá trị, trạng thái vận chuyển.', href: '/sales', tone: 'info' as Tone }]
          : []),
        ...(userRole === 'admin' || userRole === 'sales'
          ? [{ id: 'catalog', title: 'Catalog Hòm Sản phẩm', icon: <Package size={24} />, desc: 'Bộ sưu tập hòm theo gỗ, màu sắc, tôn giáo — phục vụ tư vấn.', href: '/sales/catalog', tone: 'amber' as Tone }]
          : []),
        ...(userRole === 'admin' || userRole === 'operations'
          ? [{ id: 'operations', title: 'Dashboard điều phối', icon: <Truck size={24} />, desc: 'Quản lý và điều phối phương tiện giao nhận.', href: '/operations', tone: 'teal' as Tone }]
          : []),
      ]
    : [];

  return (
    <PageLayout title="Trung Tâm Dashboards" icon={<LayoutDashboard size={15} className="text-primary" />}>
      <div className="max-w-5xl mx-auto">
        <PageHeader
          icon={<LayoutDashboard size={20} />}
          title="Trung tâm Dashboard Quản trị"
          subtitle="Chọn một báo cáo để tra cứu số liệu hoạt động của từng bộ phận."
        />

        {!roleReady ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-44 rounded-2xl bg-surface border border-border-subtle animate-pulse" />
            ))}
          </div>
        ) : dashboards.length === 0 ? (
          <Card>
            <div className="p-8 text-center text-sm text-text-muted">
              Tài khoản của bạn chưa được phân quyền xem Dashboard nào.
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {dashboards.map((card) => (
              <Link key={card.id} href={card.href} className="group block">
                <Card className="h-full p-5 sm:p-6 transition-all hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5">
                  <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center mb-4', TONE_TILE[card.tone])}>
                    {card.icon}
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-text-strong mb-1.5">{card.title}</h2>
                  <p className="text-xs sm:text-sm text-text-muted leading-relaxed mb-5">{card.desc}</p>
                  <div className="flex items-center gap-1 text-sm font-semibold text-text-muted group-hover:text-primary transition-colors">
                    <span className="flex-1">Xem chi tiết</span>
                    <span className="w-8 h-8 rounded-full flex items-center justify-center bg-surface-sunken text-text-muted group-hover:bg-primary group-hover:text-primary-fg transition-all">
                      <ArrowRight size={16} />
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
