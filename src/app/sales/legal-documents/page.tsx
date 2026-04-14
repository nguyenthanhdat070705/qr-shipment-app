'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, ChevronRight, ChevronDown, Scale, Building2, CreditCard,
  Users, ClipboardList, AlertTriangle, ShieldCheck, BookOpen, Landmark,
  ArrowLeft, Search, Printer, ExternalLink, Hash, Calendar, Gavel,
  Wallet, HandCoins, FileCheck, UserCheck, Banknote, PiggyBank,
  CheckCircle2
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';

/* ─────────────────────────────────────
   Types
───────────────────────────────────── */
interface LegalArticle {
  id: string;
  number: string;
  title: string;
  content: string[];
  highlights?: string[];
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  important?: boolean;
}

interface LegalChapter {
  id: string;
  number: string;
  title: string;
  articles: LegalArticle[];
  icon: React.ReactNode;
  color: string;
}

/* ─────────────────────────────────────
   Data: Quy Chế Quản Lý Tài Chính
───────────────────────────────────── */
const LEGAL_DOCUMENT: {
  title: string;
  subtitle: string;
  docCode: string;
  issuedDate: string;
  effectiveDate: string;
  chapters: LegalChapter[];
} = {
  title: 'QUY CHẾ QUẢN LÝ TÀI CHÍNH',
  subtitle: 'Chương Trình Hội Viên Blackstones Lifecare',
  docCode: '9199300161480-QMS',
  issuedDate: '17/05/2025',
  effectiveDate: '(Ban hành theo quyết định....)',
  chapters: [
    {
      id: 'ch1',
      number: 'I',
      title: 'QUY ĐỊNH CHUNG',
      icon: <Scale size={18} />,
      color: 'text-blue-600',
      articles: [
        {
          id: 'art1',
          number: 'Điều 1',
          title: 'Định nghĩa',
          icon: <BookOpen size={16} />,
          color: 'text-blue-500',
          bgColor: 'bg-blue-50',
          content: [
            '**Công ty:** là Công ty cổ phần Dịch vụ tang lễ Blackstones.',
            '**Chương trình hội viên Blackstones Lifecare (CTHV):** là chương trình chăm sóc khách hàng đặc biệt do Công ty Cổ phần dịch vụ tang lễ Blackstones thiết lập và quản lý điều hành, nhằm cung cấp các đặc quyền ưu đãi về sản phẩm dịch vụ của Công ty cho các khách hàng tham gia Chương trình hội viên.',
          ],
        },
        {
          id: 'art2',
          number: 'Điều 2',
          title: 'Phạm vi áp dụng',
          icon: <ShieldCheck size={16} />,
          color: 'text-teal-500',
          bgColor: 'bg-teal-50',
          content: [
            'Quy chế này quy định các nội dung liên quan đến việc thu, quản lý và sử dụng các nguồn tiền từ việc cung cấp Chương trình hội viên Blackstones Lifecare của Công ty.',
          ],
        },
        {
          id: 'art3',
          number: 'Điều 3',
          title: 'Mục đích',
          icon: <ClipboardList size={16} />,
          color: 'text-indigo-500',
          bgColor: 'bg-indigo-50',
          content: [
            'Quy chế này nhằm xây dựng cơ chế quản lý số tiền Phí Hội viên để đảm bảo thực hiện nghĩa vụ với khách hàng và đảm bảo sự an toàn hiệu quả tài chính cho Công ty.',
          ],
        },
      ],
    },
    {
      id: 'ch2',
      number: 'II',
      title: 'TÀI KHOẢN QUẢN LÝ',
      icon: <CreditCard size={18} />,
      color: 'text-emerald-600',
      articles: [
        {
          id: 'art4',
          number: 'Điều 4',
          title: 'Tài khoản theo dõi thu chi',
          icon: <Landmark size={16} />,
          color: 'text-emerald-500',
          bgColor: 'bg-emerald-50',
          important: true,
          content: [
            'Công ty lập một tài khoản riêng để theo dõi các khoản thu chi liên quan đến CTHV, không theo dõi chung với các nội dung thu chi khác của Công ty.',
            'Tài khoản được sử dụng để quản lý dòng tiền của CTHV là tài khoản sau:',
          ],
          highlights: [
            'CÔNG TY CỔ PHẦN DỊCH VỤ TANG LỂ BLACKSTONES',
            'Tại Ngân hàng: Vietinbank',
          ],
        },
        {
          id: 'art5',
          number: 'Điều 5',
          title: 'Tài khoản đầu tư',
          icon: <PiggyBank size={16} />,
          color: 'text-amber-500',
          bgColor: 'bg-amber-50',
          content: [
            'Để đảm bảo hiệu quả sử dụng dòng tiền, Phòng Kế toán chịu trách nhiệm theo dõi số dư tiền tại tài khoản theo dõi thu chi và đề xuất với Ban Giám đốc phê duyệt việc gửi tiết kiệm khi số dư tài khoản vượt quá **200.000.000 VNĐ** (Hai trăm triệu đồng).',
            'Với mục tiêu an toàn trong quản lý tiền, quy chế này quy định việc đầu tư tiền như sau:',
          ],
          highlights: [
            'Hình thức đầu tư: gửi tiết kiệm, kỳ hạn từ 12 tháng trở xuống, không bị hạn chế việc rút tiền.',
            'Ngân hàng lựa chọn: Vietinbank.',
            'Đơn vị gửi tiền: Công ty Cổ phần DVTL Blackstones.',
            'Nguồn nộp và rút tiền từ tài khoản đầu tư: Số tài khoản được quy định ở Điều 4.',
          ],
        },
      ],
    },
    {
      id: 'ch3',
      number: 'III',
      title: 'NỘI DUNG THU – CHI',
      icon: <HandCoins size={18} />,
      color: 'text-violet-600',
      articles: [
        {
          id: 'art6',
          number: 'Điều 6',
          title: 'Nguồn thu gồm',
          icon: <Banknote size={16} />,
          color: 'text-green-500',
          bgColor: 'bg-green-50',
          content: [
            '1. Thu từ tiền đóng Phí hội viên của khách hàng.',
            '2. Thu lãi tiền gửi không kỳ hạn.',
            '3. Thu tiền gửi tiết kiệm như quy định tại Điều 5 quy chế này.',
          ],
        },
        {
          id: 'art7',
          number: 'Điều 7',
          title: 'Nội dung chi',
          icon: <Wallet size={16} />,
          color: 'text-red-500',
          bgColor: 'bg-red-50',
          important: true,
          content: [
            '**1.** Chi trả cho Đơn hàng dịch vụ tang lễ của Người thụ hưởng khi Hội viên yêu cầu sử dụng quyền lợi: **Chuyển phí hội viên 2.000.000đ** sang tài khoản ngân hàng khác (TK 1064616531 tại VCB) của Công ty khi đã hoàn tất dịch vụ tang lễ.',
            '**2.** Chi trả hoàn Phí hội viên trong trường hợp hội viên yêu cầu chấm dứt CTHV trong thời gian **7 ngày** sau khi đăng ký.',
            '**3.** Chi trả hoàn Phí hội viên trong trường hợp Công ty mất khả năng cung cấp dịch vụ hoặc dừng CTHV trước thời hạn.',
            '**4.** Chi gửi tiết kiệm tại Ngân hàng Vietinbank để đảm bảo hiệu quả quản lý tiền.',
            '**5.** Chi trả phí dịch vụ ngân hàng (ngân hàng tự động trừ hàng tháng).',
          ],
        },
      ],
    },
    {
      id: 'ch4',
      number: 'IV',
      title: 'KẾ TOÁN VÀ CHẾ ĐỘ BÁO CÁO',
      icon: <FileCheck size={18} />,
      color: 'text-orange-600',
      articles: [
        {
          id: 'art8',
          number: 'Điều 8',
          title: 'Kế toán theo dõi CTHV',
          icon: <FileText size={16} />,
          color: 'text-orange-500',
          bgColor: 'bg-orange-50',
          content: [
            '1. Phòng Kế toán có trách nhiệm mở sổ kế toán, hạch toán rõ ràng đầy đủ các khoản thu chi liên quan đến CTHV phát sinh theo quy định của pháp luật về kế toán và quy định tại quy chế này.',
            '2. Việc theo dõi, hạch toán kế toán dòng tiền liên quan đến CTHV đảm bảo tách biệt với các dòng thu chi khác của Công ty.',
            '3. Việc tổ chức lưu trữ hồ sơ, chứng từ của CTHV đảm bảo theo đúng quy định của pháp luật.',
          ],
        },
        {
          id: 'art9',
          number: 'Điều 9',
          title: 'Chế độ báo cáo',
          icon: <ClipboardList size={16} />,
          color: 'text-sky-500',
          bgColor: 'bg-sky-50',
          important: true,
          content: [
            '1. Phòng kế toán gửi thông tin về số tiền Phí hội viên nhận được liên quan đến CTHV cho Phòng tư vấn – CSKH để thông báo khách hàng **chậm nhất trong vòng 24h** kể từ khi nhận được tiền.',
            '2. Phòng kế toán lập báo cáo theo dõi thu chi dòng tiền liên quan đến CTHV, định kỳ hàng tháng đối chiếu danh sách khách hàng chưa sử dụng quyền lợi hội viên.',
          ],
          highlights: [
            'Bảng đối chiếu cần thể hiện: Tổng số Phí hội viên theo danh sách khách hàng đứng bằng ("=") số dư trên sổ kế toán đứng bằng ("=") số dư của tài khoản ngân hàng cộng/trừ lãi tiền gửi và phí dịch vụ ngân hàng (có số phụ ngân hàng đính kèm) nêu tại Điều 4 và Điều 5.',
            'Việc đối chiếu được ký xác nhận bởi Kế toán trưởng và Giám đốc Tài chính chậm nhất vào ngày 5 hàng tháng cho số dư tháng liền kề.',
          ],
        },
      ],
    },
    {
      id: 'ch5',
      number: 'V',
      title: 'TRÁCH NHIỆM CÁC BÊN LIÊN QUAN',
      icon: <Users size={18} />,
      color: 'text-pink-600',
      articles: [
        {
          id: 'art10',
          number: 'Điều 10',
          title: 'Trách nhiệm Phòng Tư Vấn – CSKH',
          icon: <UserCheck size={16} />,
          color: 'text-pink-500',
          bgColor: 'bg-pink-50',
          content: [
            '1. Phòng Tư Vấn – CSKH chịu trách nhiệm thông báo đúng số tài khoản như nêu tại Điều 4 tới khách hàng và hướng dẫn khách hàng chuyển tiền Phí hội viên.',
            '2. Trong trường hợp khách hàng nộp tiền mặt, Phòng Tư Vấn – CSKH cần nộp ngay về Phòng TCKT theo quy định.',
            '3. Phòng Tư Vấn – CSKH thu thập đầy đủ hồ sơ khách hàng mua Sản phẩm KHTT và gửi về Phòng TCKT lưu trữ theo quy định.',
            '4. Phòng Tư Vấn – CSKH kịp thời cập nhật khách hàng thông báo đã thu tiền của Công ty.',
          ],
        },
        {
          id: 'art11',
          number: 'Điều 11',
          title: 'Trách nhiệm Phòng Kế toán',
          icon: <FileCheck size={16} />,
          color: 'text-amber-500',
          bgColor: 'bg-amber-50',
          content: [
            '1. Theo dõi thu chi theo quy định tại Điều 6, 7 của Quy chế này. **Tuyệt đối không thu, chi các nội dung ngoài các khoản mục** đã quy định.',
            '2. Quản lý tài khoản theo quy định tại Điều 4, 5 của Quy chế này. Trong trường hợp phát hiện các khoản tiền chuyển nhầm tài khoản, Phòng Kế toán chịu trách nhiệm điều chỉnh cho đúng quy chế.',
            '3. Hạch toán kế toán và báo cáo theo Điều 8, 9 của Quy chế này.',
            '4. Chịu trách nhiệm lưu trữ hồ sơ khách hàng và sổ sách báo cáo theo đúng quy định của pháp luật và quy định tại Quy chế này.',
          ],
        },
        {
          id: 'art12',
          number: 'Điều 12',
          title: 'Trách nhiệm Ban Giám đốc',
          icon: <Building2 size={16} />,
          color: 'text-violet-500',
          bgColor: 'bg-violet-50',
          content: [
            '1. Giám đốc Tài chính chịu trách nhiệm giám sát tổng thể Quy chế này, đảm bảo thông tin rõ ràng, mạch lạc, minh bạch, đảm bảo việc thực hiện theo đúng quy định, công tác bàn giao đầy đủ, kể cả trong trường hợp thay đổi nhân sự.',
            '2. Tổng Giám đốc chịu trách nhiệm quản lý chung, phê duyệt sửa đổi, bổ sung Quy chế (nếu có) và có quy định khen thưởng, chế tài cho các cá nhân liên quan.',
          ],
        },
      ],
    },
    {
      id: 'ch6',
      number: 'VI',
      title: 'TỔ CHỨC THỰC HIỆN',
      icon: <Gavel size={18} />,
      color: 'text-gray-600',
      articles: [
        {
          id: 'art13',
          number: 'Điều 13',
          title: 'Điều khoản thi hành',
          icon: <CheckCircle2 size={16} />,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          content: [
            '1. Quy chế này có hiệu lực từ ngày ký. Trong quá trình triển khai thực hiện, nếu có vướng mắc đề nghị các bên liên quan liên hệ với phòng TCKT để được hướng dẫn, giải quyết.',
            '2. Việc sửa đổi, bổ sung Quy chế này phải được lập thành văn bản do Tổng Giám đốc Công ty CP DVTL Blackstones quyết định.',
          ],
        },
      ],
    },
  ],
};

/* ─────────────────────────────────────
   ArticleCard Component
───────────────────────────────────── */
function ArticleCard({ article, isExpanded, onToggle }: {
  article: LegalArticle;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border transition-all duration-300 ${
        isExpanded 
          ? 'border-gray-200 shadow-lg bg-white' 
          : 'border-gray-100 shadow-sm bg-white hover:shadow-md hover:border-gray-200'
      } ${article.important ? 'ring-1 ring-amber-200/50' : ''}`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left group"
      >
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${article.bgColor} flex-shrink-0 group-hover:scale-105 transition-transform`}>
          <span className={article.color}>{article.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md ${article.bgColor} ${article.color}`}>
              {article.number}
            </span>
            {article.important && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                ⚡ Quan trọng
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-gray-900 mt-1">{article.title}</p>
        </div>
        <div className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-gray-100' : 'group-hover:bg-gray-100'}`}>
          {isExpanded ? (
            <ChevronDown size={16} className="text-gray-400" />
          ) : (
            <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0">
          <div className="ml-[52px] space-y-3">
            {article.content.map((para, i) => (
              <p
                key={i}
                className="text-sm text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: para
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>')
                }}
              />
            ))}

            {article.highlights && article.highlights.length > 0 && (
              <div className="mt-3 space-y-2">
                {article.highlights.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-100"
                  >
                    <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <p
                      className="text-xs font-medium text-amber-800 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: h.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────
   Main Page Component
───────────────────────────────────── */
export default function LegalDocumentsPage() {
  const router = useRouter();
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set(LEGAL_DOCUMENT.chapters.map(c => c.id))
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChapter, setActiveChapter] = useState<string | null>(null);

  const toggleArticle = (id: string) => {
    setExpandedArticles(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleChapter = (id: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const allIds = LEGAL_DOCUMENT.chapters.flatMap(c => c.articles.map(a => a.id));
    setExpandedArticles(new Set(allIds));
    setExpandedChapters(new Set(LEGAL_DOCUMENT.chapters.map(c => c.id)));
  };

  const collapseAll = () => {
    setExpandedArticles(new Set());
  };

  // Filter articles by search
  const filteredChapters = LEGAL_DOCUMENT.chapters.map(ch => ({
    ...ch,
    articles: ch.articles.filter(a => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.number.toLowerCase().includes(q) ||
        a.content.some(c => c.toLowerCase().includes(q)) ||
        (a.highlights && a.highlights.some(h => h.toLowerCase().includes(q)))
      );
    }),
  })).filter(ch => ch.articles.length > 0);

  const totalArticles = LEGAL_DOCUMENT.chapters.reduce((acc, ch) => acc + ch.articles.length, 0);

  return (
    <PageLayout title="Văn bản pháp lý" icon={<Scale size={16} className="text-amber-500" />}>

      {/* ── Back Button ── */}
      <button
        onClick={() => router.push('/sales')}
        className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 mb-4 transition-colors"
      >
        <ArrowLeft size={14} /> Quay lại Dashboard
      </button>

      {/* ── Document Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-6 mb-6 shadow-xl">
        {/* Decorative */}
        <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-20 w-36 h-36 rounded-full bg-amber-300/5 blur-2xl" />
        <div className="absolute top-4 right-16 w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
        <div className="absolute top-12 right-36 w-1.5 h-1.5 rounded-full bg-amber-200 animate-pulse delay-500" />

        <div className="relative">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
            <Scale size={13} className="text-amber-300" />
            <span className="text-xs text-white/70 font-semibold tracking-wide">Văn bản nội bộ — Tuyệt mật</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1">
            {LEGAL_DOCUMENT.title}
          </h1>
          <p className="text-amber-200/80 text-sm font-semibold mb-1">
            {LEGAL_DOCUMENT.subtitle}
          </p>
          <p className="text-white/40 text-xs italic">
            {LEGAL_DOCUMENT.effectiveDate}
          </p>

          {/* Metadata chips */}
          <div className="flex flex-wrap gap-2 mt-4">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white text-xs font-semibold">
              <Hash size={11} className="text-amber-300" />
              Mã số: {LEGAL_DOCUMENT.docCode}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white text-xs font-semibold">
              <Calendar size={11} className="text-amber-300" />
              Cấp ngày: {LEGAL_DOCUMENT.issuedDate}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white text-xs font-semibold">
              <FileText size={11} className="text-amber-300" />
              {LEGAL_DOCUMENT.chapters.length} chương · {totalArticles} điều
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-semibold">
              <ShieldCheck size={11} />
              ISO 9001:2015
            </div>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm trong văn bản... (ví dụ: Điều 7, phí hội viên)"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all shadow-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
          >
            Mở tất cả
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
          >
            Thu gọn
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1B2A4A] text-white text-xs font-bold hover:bg-[#243656] transition-colors shadow-sm"
          >
            <Printer size={13} /> In
          </button>
        </div>
      </div>

      {/* ── Quick Navigation ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <ExternalLink size={14} className="text-gray-400" />
          <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">Mục lục nhanh</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {LEGAL_DOCUMENT.chapters.map((ch) => (
            <button
              key={ch.id}
              onClick={() => {
                setActiveChapter(ch.id);
                if (!expandedChapters.has(ch.id)) toggleChapter(ch.id);
                document.getElementById(ch.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-left ${
                activeChapter === ch.id
                  ? 'bg-amber-50 border-amber-200 shadow-sm'
                  : 'bg-gray-50 border-gray-100 hover:bg-amber-50/50 hover:border-amber-100'
              }`}
            >
              <span className={`${ch.color} group-hover:scale-110 transition-transform`}>{ch.icon}</span>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Chương {ch.number}</p>
                <p className="text-xs font-bold text-gray-700 truncate leading-tight">{ch.title}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Chapters & Articles ── */}
      <div className="space-y-6">
        {filteredChapters.map((chapter) => (
          <div key={chapter.id} id={chapter.id} className="scroll-mt-20">
            {/* Chapter Header */}
            <button
              onClick={() => toggleChapter(chapter.id)}
              className="w-full flex items-center gap-3 mb-3 group"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${
                chapter.color.replace('text-', 'from-').replace('-600', '-500')
              } to-${chapter.color.split('-')[1]}-700 text-white shadow-lg flex-shrink-0 group-hover:scale-105 transition-transform`}>
                {chapter.icon}
              </div>
              <div className="flex-1 text-left">
                <p className={`text-[10px] font-extrabold uppercase tracking-widest ${chapter.color} opacity-60`}>
                  Chương {chapter.number}
                </p>
                <h2 className="text-base font-black text-gray-900">
                  {chapter.title}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-300 bg-gray-100 px-2 py-0.5 rounded-full">
                  {chapter.articles.length} điều
                </span>
                {expandedChapters.has(chapter.id) ? (
                  <ChevronDown size={16} className="text-gray-300" />
                ) : (
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500" />
                )}
              </div>
            </button>

            {/* Articles */}
            {expandedChapters.has(chapter.id) && (
              <div className="space-y-3 ml-0 sm:ml-3">
                {chapter.articles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    isExpanded={expandedArticles.has(article.id)}
                    onToggle={() => toggleArticle(article.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <div className="mt-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-200 flex-shrink-0">
            <Building2 size={18} className="text-gray-500" />
          </div>
          <div>
            <p className="text-sm font-black text-gray-800">CÔNG TY CP DVTL BLACKSTONES</p>
            <p className="text-xs text-gray-500 mt-1">
              Văn bản ban hành bởi Tổng Giám đốc · Mã ISO: {LEGAL_DOCUMENT.docCode} · Cấp ngày: {LEGAL_DOCUMENT.issuedDate}
            </p>
            <p className="text-[10px] text-gray-400 mt-2 italic">
              Tài liệu nội bộ — Không được phép chia sẻ ra bên ngoài tổ chức.
            </p>
          </div>
        </div>
      </div>

    </PageLayout>
  );
}
