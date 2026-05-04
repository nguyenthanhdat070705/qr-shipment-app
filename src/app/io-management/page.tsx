'use client';
// Force Turbopack to refresh the cache again

import { useState, useEffect } from 'react';
import { Database, PackageCheck, Truck, ClipboardList, FileText, PackageOpen } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import ImportTab from './components/ImportTab';
import ReviewTab from './components/ReviewTab';
import ExportTab from './components/ExportTab';
import ExportReviewTab from './components/ExportReviewTab';
import POReviewTab from './components/PurchaseOrderReviewTab';
import TempReceiptTab from './components/TempReceiptTab';

type TabId = 'import' | 'temp-receipt' | 'review' | 'export' | 'export-review' | 'po-review';

const TABS: { id: TabId; label: string; icon: React.ReactNode; activeColor: string }[] = [
  {
    id: 'import',
    label: 'Nhập hàng (GRPO)',
    icon: <PackageCheck size={17} />,
    activeColor: 'border-emerald-500 text-emerald-700 bg-emerald-50/60',
  },
  {
    id: 'temp-receipt',
    label: 'Quản lý nhập tạm',
    icon: <PackageOpen size={17} />,
    activeColor: 'border-orange-500 text-orange-700 bg-orange-50/60',
  },
  {
    id: 'export',
    label: 'Xuất hàng (IT)',
    icon: <Truck size={17} />,
    activeColor: 'border-amber-500 text-amber-700 bg-amber-50/60',
  },
  {
    id: 'review',
    label: 'Quản lý phiếu nhập',
    icon: <ClipboardList size={17} />,
    activeColor: 'border-indigo-600 text-indigo-700 bg-indigo-50/60',
  },
  {
    id: 'export-review',
    label: 'Quản lý phiếu xuất',
    icon: <FileText size={17} />,
    activeColor: 'border-violet-500 text-violet-700 bg-violet-50/60',
  },
  {
    id: 'po-review',
    label: 'Quản lý PO',
    icon: <ClipboardList size={17} />,
    activeColor: 'border-rose-500 text-rose-700 bg-rose-50/60',
  },
];

export default function IOManagementPage() {
  const [activeTab, setActiveTab] = useState<TabId>('import');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'export') setActiveTab('export');
      else if (tab === 'export-review') setActiveTab('export-review');
      else if (tab === 'review') setActiveTab('review');
      else if (tab === 'po-review') setActiveTab('po-review');
      else if (tab === 'temp-receipt') setActiveTab('temp-receipt');
    }
  }, []);

  return (
    <PageLayout title="Quản lý xuất nhập" icon={<Database size={15} className="text-indigo-500" />}>
      {/* ── Tabs Navigation ────────────────────── */}
      <div className="@container">
        <div className="mb-5 flex items-center gap-1 border-b border-gray-200 dark:border-slate-700 overflow-x-auto scrollbar-thin">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 @lg:px-5 py-2.5 @lg:py-3 text-xs @lg:text-sm font-bold border-b-[3px] transition-all whitespace-nowrap rounded-t-xl ${
                activeTab === tab.id
                  ? tab.activeColor
                  : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800 dark:hover:text-gray-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ────────────────────── */}
      <div className="min-h-[500px]">
        {activeTab === 'import' && <ImportTab />}
        {activeTab === 'temp-receipt' && <TempReceiptTab />}
        {activeTab === 'review' && <ReviewTab />}
        {activeTab === 'po-review' && <POReviewTab />}
        {activeTab === 'export' && <ExportTab />}
        {activeTab === 'export-review' && <ExportReviewTab />}
      </div>
    </PageLayout>
  );
}
