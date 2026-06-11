'use client';

import PageLayout from '@/components/PageLayout';
import {
  Button, Card, CardHeader, CardBody, Badge, StatCard,
  Skeleton, SkeletonText, SkeletonStat, EmptyState, PageHeader,
} from '@/components/ui';
import {
  Palette, Package, TrendingUp, Users, Wallet, AlertTriangle,
  Plus, Download, Trash2, Search, Inbox,
} from 'lucide-react';

/**
 * Trang showcase Design System (GĐ2). Mở /design-system để xem & duyệt
 * tông Navy + Gold mới trước khi áp dụng cho toàn hệ thống. Bật/tắt Sáng–Tối
 * ở thanh trên để kiểm tra cả 2 chế độ.
 */
export default function DesignSystemPage() {
  return (
    <PageLayout title="Design System" icon={<Palette size={16} className="text-accent" />}>
      <div className="max-w-6xl mx-auto space-y-8">
        <PageHeader
          icon={<Palette size={20} />}
          title="Hệ thống thiết kế Blackstones"
          subtitle="Tông Navy + Gold · token tự đổi Sáng/Tối · bộ component dùng chung"
          actions={<Button icon={<Plus size={16} />}>Hành động chính</Button>}
        />

        {/* Bảng màu */}
        <Card>
          <CardHeader><h2 className="font-bold text-text-strong">Bảng màu thương hiệu</h2></CardHeader>
          <CardBody className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-2">
            {(['navy', 'brand', 'teal'] as const).map((fam) =>
              [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((s) => (
                <div key={`${fam}-${s}`} className="text-center">
                  <div
                    className="h-12 rounded-lg border border-border-subtle"
                    style={{ backgroundColor: `var(--color-${fam}-${s})` }}
                  />
                  <p className="text-[9px] text-text-muted mt-1">{fam}-{s}</p>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* KPI Stat cards */}
        <section>
          <h2 className="font-bold text-text-strong mb-3">Thẻ KPI</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Tồn kho" value="1.248" sub="+12% so với tháng trước" icon={<Package size={20} />} tone="primary" />
            <StatCard label="Doanh thu" value="₫2,1 tỷ" sub="Quý này" icon={<TrendingUp size={20} />} tone="success" />
            <StatCard label="Hội viên" value="376" sub="8 sắp hết hạn" icon={<Users size={20} />} tone="accent" />
            <StatCard label="Công nợ" value="₫184tr" sub="Cần đối soát" icon={<Wallet size={20} />} tone="warning" onClick={() => {}} />
          </div>
        </section>

        {/* Buttons */}
        <Card>
          <CardHeader><h2 className="font-bold text-text-strong">Nút bấm</h2></CardHeader>
          <CardBody className="flex flex-wrap items-center gap-3">
            <Button variant="primary" icon={<Plus size={16} />}>Primary</Button>
            <Button variant="accent" icon={<Download size={16} />}>Accent</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost" icon={<Search size={16} />}>Ghost</Button>
            <Button variant="danger" icon={<Trash2 size={16} />}>Danger</Button>
            <Button loading>Đang lưu</Button>
            <Button size="sm">Nhỏ</Button>
            <Button size="lg">Lớn</Button>
          </CardBody>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader><h2 className="font-bold text-text-strong">Nhãn trạng thái</h2></CardHeader>
          <CardBody className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral" dot>Nháp</Badge>
            <Badge tone="primary" dot>Đã phân công</Badge>
            <Badge tone="info" dot>Đang giao</Badge>
            <Badge tone="success" dot>Đã giao</Badge>
            <Badge tone="warning" dot>Chờ xử lý</Badge>
            <Badge tone="danger" dot>Đã hủy</Badge>
            <Badge tone="accent">VIP</Badge>
          </CardBody>
        </Card>

        {/* Loading & Empty */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><h2 className="font-bold text-text-strong">Trạng thái tải (Skeleton)</h2></CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <SkeletonStat /><SkeletonStat />
              </div>
              <SkeletonText lines={3} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader><h2 className="font-bold text-text-strong">Trạng thái trống</h2></CardHeader>
            <CardBody>
              <EmptyState
                icon={<Inbox size={24} />}
                title="Chưa có dữ liệu"
                description="Khi có đơn hàng hoặc phiếu mới, chúng sẽ hiển thị ở đây."
                action={<Button size="sm" icon={<Plus size={14} />}>Tạo mới</Button>}
              />
            </CardBody>
          </Card>
        </div>

        <div className="flex items-center gap-2 text-xs text-text-muted">
          <AlertTriangle size={14} className="text-amber-500" />
          Trang xem trước nội bộ — sẽ gỡ sau khi áp design system xong toàn hệ thống.
        </div>
      </div>
    </PageLayout>
  );
}
