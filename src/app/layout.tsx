import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

/* Inter — tải thật qua next/font (self-host, không layout-shift), kèm subset tiếng Việt */
const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Blackstones — Hệ thống Quản trị',
    template: '%s · Blackstones',
  },
  description:
    'Hệ thống quản trị nội bộ Blackstones — chuỗi cung ứng, bán hàng, hội viên & chăm sóc khách hàng.',
  robots: { index: false, follow: false }, // Công cụ nội bộ — không cho search index
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1B2A4A',
  // Cho phép phóng to (bỏ userScalable:false / maximumScale:1 — vi phạm WCAG)
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={inter.variable}>
      <body className="antialiased bg-gray-50 text-gray-900 font-sans">
        {children}
      </body>
    </html>
  );
}
