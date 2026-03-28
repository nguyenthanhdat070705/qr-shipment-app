import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'QR Shipment Tracker',
    template: '%s | QR Shipment Tracker',
  },
  description:
    'Scan a product QR code to view details and confirm shipment — powered by QR Shipment Tracker.',
  robots: { index: false, follow: false }, // Internal logistics tool — exclude from search
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents accidental pinch-zoom on form inputs on mobile
  themeColor: '#1B2A4A',
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
