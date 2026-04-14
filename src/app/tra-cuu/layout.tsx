import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tra Cứu Hội Viên Trăm Tuổi | BlackStones',
  description: 'Tra cứu thông tin thành viên chương trình Hội Viên Trăm Tuổi bằng số điện thoại hoặc mã hội viên.',
};

export default function PublicLookupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
