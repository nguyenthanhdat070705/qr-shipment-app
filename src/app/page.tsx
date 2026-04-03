'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, ScanLine, Package, CheckCircle } from 'lucide-react';
import { Search } from 'lucide-react';
import QuickLookupForm from '@/components/QuickLookupForm';
import PageLayout from '@/components/PageLayout';
import { getUserRole } from '@/config/roles.config';

/* ═══════════════════════════════════════════════════════════
   Main Page — Tìm kiếm hàng (role-based redirect)
   ═══════════════════════════════════════════════════════════ */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        const role = getUserRole(u.email || '');
        if (role === 'procurement') {
          router.replace('/procurement');
          return;
        }
        if (role === 'operations') {
          router.replace('/operations');
          return;
        }
        if (role === 'warehouse') {
          router.replace('/warehouse');
          return;
        }
        if (role === 'sales') {
          router.replace('/sales');
          return;
        }
      }
    } catch { /* ignore */ }
  }, [router]);

  return (
    <PageLayout title="Tìm kiếm hàng" icon={<Search size={16} className="text-blue-500" />}>
      {/* ── Hero ─────────────────────────────────────── */}
      <div className="mx-auto max-w-lg px-5 pt-10 pb-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1B2A4A] shadow-lg shadow-[#1B2A4A4D]">
          <QrCode size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 mb-2">
          Tìm sản phẩm
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">
          Quét mã QR hoặc nhập mã sản phẩm vào ô bên dưới để xem đầy đủ thông tin chi tiết của sản phẩm.
        </p>
      </div>

      {/* ── Form tra cứu chính ───────────────────────── */}
      <div className="mx-auto max-w-lg px-5 pb-8">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <ScanLine size={18} className="text-[#2d4a7a]" />
            <h2 className="font-semibold text-gray-900">Quét mã QR / Nhập mã sản phẩm</h2>
          </div>
          <QuickLookupForm />
          <p className="mt-4 text-xs text-gray-400 text-center">
            Mã QR được in trên nhãn sản phẩm là <strong>mã sản phẩm</strong>.
          </p>
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
                icon: <ScanLine size={16} className="text-[#2d4a7a]" />,
                title: 'Quét mã QR hoặc nhập mã sản phẩm',
                desc: 'Dùng camera điện thoại quét QR trên nhãn, hoặc nhập thủ công mã sản phẩm.',
              },
              {
                icon: <Package size={16} className="text-[#2d4a7a]" />,
                title: 'Kiểm tra thông tin & tình trạng hàng',
                desc: 'Xem đầy đủ thông tin sản phẩm và kiểm tra xem hàng còn sẵn sàng xuất không.',
              },
              {
                icon: <CheckCircle size={16} className="text-[#2d4a7a]" />,
                title: 'Xem và In thông tin',
                desc: 'Xem phiếu thông tin sản phẩm và có thể kết nối máy in để in tem nhãn.',
              },
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#eef1f7] mt-0.5">
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
          © {new Date().getFullYear()} Blackstones. Hệ thống quản lý SCM.
        </p>
      </div>
    </PageLayout>
  );
}
