'use client';

import { QrCode, ScanLine, Package, CheckCircle, LogOut } from 'lucide-react';
import QuickLookupForm from '@/components/QuickLookupForm';
import AuthGuard from '@/components/AuthGuard';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

function LogoutButton() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    router.push('/login');
  };

  return (
    <button
      onClick={handleLogout}
      className="fixed top-3 right-4 z-50 flex items-center gap-1.5 px-3 py-2 rounded-xl 
                 bg-white/80 backdrop-blur border border-gray-200 shadow-sm
                 text-gray-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50
                 transition-all duration-200 text-xs font-medium"
    >
      <LogOut size={14} />
      <span>Đăng xuất</span>
    </button>
  );
}

export default function HomePage() {
  return (
    <AuthGuard>
      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50">
        <LogoutButton />

        {/* ── Top bar with logo (left) + logout (right) ── */}
        <div className="fixed top-0 left-0 right-0 z-40 px-4 py-3 flex items-center justify-between">
          <Image
            src="/blackstones-logo.webp"
            alt="Blackstones Logo"
            width={140}
            height={30}
            style={{ height: 'auto', filter: 'invert(1) brightness(0.2)' }}
          />
        </div>

        {/* ── Hero ─────────────────────────────────────── */}
        <div className="mx-auto max-w-lg px-5 pt-16 pb-8 text-center">
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
                  title: 'Nhập họ tên, email và xác nhận xuất hàng',
                  desc:  'Điền thông tin người xuất kho và nhấn "Xác nhận xuất hàng" để lưu vào hệ thống.',
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
      </main>
    </AuthGuard>
  );
}
