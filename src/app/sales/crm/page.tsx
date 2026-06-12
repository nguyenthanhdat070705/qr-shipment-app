'use client';

import { useState, useEffect, useCallback } from 'react';
import PageLayout from '@/components/PageLayout';
import ModuleTab from '@/components/crm/ModuleTab';
import { CRM_MODULES } from '@/config/crmModules';
import {
  BarChart3, Users, ShoppingCart, ShoppingBag, FileText, FileSignature, Receipt,
  Package, ClipboardList, TrendingUp, Megaphone, UserCog, Warehouse, Wallet, CreditCard,
  RefreshCw, ExternalLink, CheckCircle, AlertTriangle, Clock, Database,
} from 'lucide-react';

// ── Icon map (config lưu tên icon dạng string) ──
const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Users, ShoppingCart, ShoppingBag, FileText, FileSignature, Receipt,
  Package, ClipboardList, TrendingUp, Megaphone, UserCog, Warehouse, Wallet, CreditCard,
};
function ModuleIcon({ name, size = 15, className }: { name: string; size?: number; className?: string }) {
  const Cmp = ICONS[name] || FileText;
  return <Cmp size={size} className={className} />;
}

interface Overview { counts: Record<string, number>; last_sync: string | null }
interface SyncResult {
  success?: boolean; error?: string; total_records?: number; succeeded?: number; failed?: number;
  modules?: number; duration_ms?: number; results?: { label: string; current: number; error?: string }[];
}

export default function CRMPage() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      const r = await fetch('/api/crm/overview', { cache: 'no-store' });
      setOverview(await r.json());
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { loadOverview(); }, [loadOverview]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/crm/sync', { method: 'POST' });
      const data: SyncResult = await res.json();
      setSyncResult(data);
      await loadOverview();
    } catch (err) {
      setSyncResult({ success: false, error: String(err) });
    } finally {
      setSyncing(false);
    }
  }, [loadOverview]);

  const activeModule = CRM_MODULES.find((m) => m.key === activeTab);

  return (
    <PageLayout title="CRM GetFly" icon={<BarChart3 size={18} className="text-violet-500" />}>
      <div className="space-y-4">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-gray-100">CRM GetFly</h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              14 module đồng bộ từ Google Sheets (BLACKSTONES Data)
              {overview?.last_sync && (
                <span className="inline-flex items-center gap-1 ml-2 text-gray-400">
                  <Clock size={12} /> Sync gần nhất: {new Date(overview.last_sync).toLocaleString('vi-VN')}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-all min-h-[42px] shadow-sm"
            >
              <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Đang sync...' : 'Sync ngay'}
            </button>
            <a
              href="https://blackstonesdvtl.getflycrm.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-all min-h-[42px]"
            >
              <ExternalLink size={15} /> Mở GetFly
            </a>
          </div>
        </div>

        {/* ── Sync result banner ── */}
        {syncResult && (
          <div className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-2.5 ${
            syncResult.success
              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
              : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300'
          }`}>
            {syncResult.success ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
            <div className="min-w-0">
              {syncResult.error ? (
                <span>Lỗi sync: {syncResult.error}</span>
              ) : (
                <span>
                  Đã đồng bộ <b>{syncResult.total_records?.toLocaleString('vi-VN')}</b> bản ghi
                  {' · '}{syncResult.succeeded}/{syncResult.modules} module
                  {syncResult.failed ? <span className="text-amber-700"> · {syncResult.failed} lỗi</span> : null}
                  {syncResult.duration_ms ? ` · ${(syncResult.duration_ms / 1000).toFixed(1)}s` : ''}
                </span>
              )}
              {syncResult.results?.some((r) => r.error) && (
                <div className="mt-1 text-xs opacity-80">
                  {syncResult.results.filter((r) => r.error).map((r) => `${r.label}: ${r.error}`).join(' · ')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab bar ── */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<BarChart3 size={15} />} label="Tổng quan" />
          {CRM_MODULES.map((m) => (
            <TabButton
              key={m.key}
              active={activeTab === m.key}
              onClick={() => setActiveTab(m.key)}
              icon={<ModuleIcon name={m.icon} />}
              label={m.short}
              count={overview?.counts?.[m.key]}
            />
          ))}
        </div>

        {/* ── Content ── */}
        {activeTab === 'overview' ? (
          <Overview counts={overview?.counts} onOpen={setActiveTab} />
        ) : activeModule ? (
          <ModuleTab key={activeModule.key} module={activeModule} />
        ) : null}
      </div>
    </PageLayout>
  );
}

function TabButton({ active, onClick, icon, label, count }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
        active
          ? 'bg-[#1B2A4A] dark:bg-indigo-500 text-white shadow-sm'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
      }`}
    >
      {icon}
      {label}
      {count != null && count > 0 && (
        <span className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
          active ? 'bg-white/20' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
        }`}>
          {count.toLocaleString('vi-VN')}
        </span>
      )}
    </button>
  );
}

function Overview({ counts, onOpen }: { counts?: Record<string, number>; onOpen: (key: string) => void }) {
  const highlight = ['khach-hang', 'don-ban', 'hop-dong-ban', 'san-pham'];
  const c = counts || {};
  return (
    <div className="space-y-4">
      {/* Highlight KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {highlight.map((key) => {
          const m = CRM_MODULES.find((x) => x.key === key)!;
          return (
            <button
              key={key}
              onClick={() => onOpen(key)}
              className="text-left bg-white dark:bg-[#162240] rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-4 hover:border-violet-300 hover:shadow-md transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-500 flex items-center justify-center mb-2">
                <ModuleIcon name={m.icon} size={18} />
              </div>
              <div className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 tabular-nums">{(c[key] ?? 0).toLocaleString('vi-VN')}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{m.label}</div>
            </button>
          );
        })}
      </div>

      {/* All modules grid */}
      <div>
        <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
          <Database size={13} /> Tất cả module
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {CRM_MODULES.map((m) => (
            <button
              key={m.key}
              onClick={() => onOpen(m.key)}
              className="flex items-center gap-3 bg-white dark:bg-[#162240] rounded-xl border border-gray-100 dark:border-white/10 shadow-sm p-3 hover:border-violet-300 hover:shadow-md transition-all text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-300 flex items-center justify-center shrink-0">
                <ModuleIcon name={m.icon} size={17} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{m.label}</div>
                <div className="text-xs text-gray-400 tabular-nums">{(c[m.key] ?? 0).toLocaleString('vi-VN')} bản ghi</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
