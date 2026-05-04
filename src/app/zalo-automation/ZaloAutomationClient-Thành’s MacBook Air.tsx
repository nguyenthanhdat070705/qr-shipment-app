'use client';

import { useState, useEffect, useCallback } from 'react';
import PageLayout from '@/components/PageLayout';
import {
  MessageSquare, Gift, Bell, CheckCircle, XCircle, Clock,
  Phone, RefreshCw, Send, AlertCircle, Users, Zap, ChevronRight,
  Calendar, TrendingUp, Settings, Eye
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────
interface ZNSLog {
  id: string;
  member_code: string;
  phone: string;
  message_type: 'welcome' | 'birthday' | 'reminder' | 'custom';
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  message_id?: string;
  error_message?: string;
  sent_at: string;
}

interface ZNSSummary {
  total: number;
  welcome_sent: number;
  birthday_sent: number;
  failed: number;
}

interface BirthdayMember {
  id: string;
  member_code: string;
  full_name: string;
  phone: string;
  date_of_birth: string;
  consultant_name?: string;
  days_until?: number;
  birthday_this_year?: string;
}

const TYPE_LABEL: Record<string, string> = {
  welcome: '👋 Chào mừng',
  birthday: '🎂 Sinh nhật',
  reminder: '🔔 Nhắc nhở',
  custom: '✉️ Tùy chỉnh',
};

const STATUS_STYLE: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  sent: {
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    icon: <CheckCircle size={12} className="text-emerald-500" />,
  },
  failed: {
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-700',
    icon: <XCircle size={12} className="text-red-500" />,
  },
  pending: {
    bg: 'bg-yellow-50 border-yellow-200',
    text: 'text-yellow-700',
    icon: <Clock size={12} className="text-yellow-500" />,
  },
  skipped: {
    bg: 'bg-gray-50 border-gray-200',
    text: 'text-gray-500',
    icon: <AlertCircle size={12} className="text-gray-400" />,
  },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDOB(dateStr: string) {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ── Main Component ─────────────────────────────────────────
export default function ZaloAutomationClient() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'birthdays' | 'logs' | 'settings'>('dashboard');
  const [summary, setSummary] = useState<ZNSSummary | null>(null);
  const [logs, setLogs] = useState<ZNSLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilter, setLogFilter] = useState<string>('');

  const [birthdayToday, setBirthdayToday] = useState<BirthdayMember[]>([]);
  const [birthdayUpcoming, setBirthdayUpcoming] = useState<BirthdayMember[]>([]);
  const [bdLoading, setBdLoading] = useState(false);

  const [cronStatus, setCronStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [cronResult, setCronResult] = useState<Record<string, unknown> | null>(null);

  const [testPhone, setTestPhone] = useState('');
  const [testName, setTestName] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // ── Fetch logs ────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const url = logFilter ? `/api/zalo/logs?type=${logFilter}&limit=50` : '/api/zalo/logs?limit=50';
      const res = await fetch(url);
      const data = await res.json();
      setLogs(data.logs || []);
      setSummary(data.summary || null);
    } catch {
      console.error('Fetch logs error');
    } finally {
      setLogsLoading(false);
    }
  }, [logFilter]);

  // ── Fetch birthdays ────────────────────────────────────────
  const fetchBirthdays = useCallback(async () => {
    setBdLoading(true);
    try {
      const res = await fetch('/api/zalo/birthdays?days=30');
      const data = await res.json();
      setBirthdayToday(data.today || []);
      setBirthdayUpcoming(data.upcoming || []);
    } catch {
      console.error('Fetch birthdays error');
    } finally {
      setBdLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { if (activeTab === 'birthdays') fetchBirthdays(); }, [activeTab, fetchBirthdays]);

  // ── Trigger birthday cron manually ──────────────────────
  async function runBirthdayCron() {
    setCronStatus('running');
    setCronResult(null);
    try {
      const res = await fetch(
        `/api/cron/birthday-zns?secret=${process.env.NEXT_PUBLIC_CRON_SECRET || 'blackstone-cron-secret-2026'}`
      );
      const data = await res.json();
      setCronResult(data);
      setCronStatus(data.success ? 'done' : 'error');
      fetchLogs();
      fetchBirthdays();
    } catch (err) {
      setCronStatus('error');
      setCronResult({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  // ── Test send welcome ────────────────────────────────────
  async function handleTestSend() {
    if (!testPhone || !testName) return;
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/zalo/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          full_name: testName,
          member_code: 'TEST001',
        }),
      });
      const data = await res.json();
      setTestResult({ ok: data.success, msg: data.message || data.error || 'Xong' });
      if (data.success) fetchLogs();
    } catch (err) {
      setTestResult({ ok: false, msg: err instanceof Error ? err.message : 'Lỗi' });
    } finally {
      setTestSending(false);
    }
  }

  // ════════════════════════════════════════════════════════
  return (
    <PageLayout title="Zalo Automation" icon={<MessageSquare size={18} className="text-blue-500" />}>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Hero Header ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0068ff] via-[#0050cc] to-[#1a1a6e] p-6 text-white shadow-xl">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-blue-300 translate-y-1/2 -translate-x-1/4" />
          </div>
          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">💬</span>
                <h1 className="text-2xl font-extrabold tracking-tight">Zalo ZNS Automation</h1>
              </div>
              <p className="text-blue-100 text-sm max-w-lg">
                Hệ thống chăm sóc hội viên tự động — Gửi tin chào mừng ngay khi đăng ký &amp; thiệp sinh nhật tự động qua Zalo
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 text-xs font-semibold border border-white/20">
              <Zap size={14} className="text-yellow-300" />
              AI-Powered
            </div>
          </div>

          {/* Quick Stats */}
          {summary && (
            <div className="relative mt-5 grid grid-cols-4 gap-3">
              {[
                { label: 'Tổng đã gửi', value: summary.total, color: 'text-white' },
                { label: 'Chào mừng', value: summary.welcome_sent, color: 'text-blue-200' },
                { label: 'Sinh nhật', value: summary.birthday_sent, color: 'text-yellow-300' },
                { label: 'Thất bại', value: summary.failed, color: 'text-red-300' },
              ].map(s => (
                <div key={s.label} className="bg-white/10 rounded-xl p-3 border border-white/20">
                  <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-white/70 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Tab Nav ── */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <TrendingUp size={14} /> },
            { id: 'birthdays', label: 'Sinh Nhật', icon: <Gift size={14} /> },
            { id: 'logs', label: 'Lịch Sử Gửi', icon: <Bell size={14} /> },
            { id: 'settings', label: 'Cài Đặt & Test', icon: <Settings size={14} /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                activeTab === t.id
                  ? 'bg-white text-[#0068ff] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════
            TAB: Dashboard
        ════════════════════════════════════════════════════ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            {/* Flow diagram */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-800 mb-4">🔄 Luồng Tự Động Hóa</h2>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { icon: '📝', label: 'Đăng ký HV', sub: 'Form điền thông tin' },
                  { icon: '✅', label: 'Đăng ký thành công', sub: 'Lưu vào database' },
                  { icon: '💬', label: 'ZNS Welcome', sub: 'Bắn ngay tức thì' },
                  { icon: '📱', label: 'HV nhận Zalo', sub: 'Link hợp đồng điện tử' },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex flex-col items-center bg-blue-50 rounded-xl p-3 border border-blue-100 min-w-[100px]">
                      <span className="text-2xl">{step.icon}</span>
                      <span className="text-xs font-bold text-gray-800 mt-1 text-center">{step.label}</span>
                      <span className="text-[10px] text-gray-400 text-center">{step.sub}</span>
                    </div>
                    {i < 3 && <ChevronRight size={16} className="text-blue-400 flex-shrink-0" />}
                  </div>
                ))}
              </div>

              <hr className="my-4 border-gray-100" />

              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { icon: '⏰', label: 'Cron 8:00 SA', sub: 'Chạy mỗi ngày' },
                  { icon: '🎂', label: 'Quét sinh nhật', sub: 'Trong 3 ngày tới' },
                  { icon: '🔔', label: 'Nhắc Sales', sub: 'Gọi điện chúc mừng' },
                  { icon: '💌', label: 'ZNS Thiệp', sub: 'Đúng ngày sinh nhật' },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex flex-col items-center bg-yellow-50 rounded-xl p-3 border border-yellow-100 min-w-[100px]">
                      <span className="text-2xl">{step.icon}</span>
                      <span className="text-xs font-bold text-gray-800 mt-1 text-center">{step.label}</span>
                      <span className="text-[10px] text-gray-400 text-center">{step.sub}</span>
                    </div>
                    {i < 3 && <ChevronRight size={16} className="text-yellow-400 flex-shrink-0" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Recent logs preview */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-800">📋 Gửi Gần Đây</h2>
                <button
                  onClick={() => setActiveTab('logs')}
                  className="text-xs text-[#0068ff] font-semibold hover:underline flex items-center gap-1"
                >
                  Xem tất cả <ChevronRight size={12} />
                </button>
              </div>
              {logsLoading ? (
                <div className="text-sm text-gray-400 text-center py-4">Đang tải...</div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Chưa có lịch sử gửi nào</p>
                  <p className="text-xs mt-1">Đăng ký hội viên mới để kích hoạt tin nhắn welcome</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.slice(0, 5).map(log => {
                    const s = STATUS_STYLE[log.status] || STATUS_STYLE.pending;
                    return (
                      <div key={log.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${s.bg}`}>
                        <div className="flex-shrink-0">{s.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-800">{log.member_code}</span>
                            <span className="text-xs text-gray-500">{TYPE_LABEL[log.message_type]}</span>
                          </div>
                          <div className="text-[11px] text-gray-400">{log.phone} · {fmtDate(log.sent_at)}</div>
                        </div>
                        <span className={`text-[11px] font-bold ${s.text}`}>{log.status.toUpperCase()}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            TAB: Birthdays
        ════════════════════════════════════════════════════ */}
        {activeTab === 'birthdays' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-gray-800">🎂 Sinh Nhật Hội Viên (30 ngày tới)</h2>
              <div className="flex gap-2">
                <button
                  onClick={fetchBirthdays}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  <RefreshCw size={13} /> Làm mới
                </button>
                <button
                  onClick={runBirthdayCron}
                  disabled={cronStatus === 'running'}
                  className="flex items-center gap-1.5 px-4 py-2 bg-yellow-500 text-white rounded-xl text-sm font-bold hover:bg-yellow-600 transition-all disabled:opacity-50"
                >
                  <Zap size={13} />
                  {cronStatus === 'running' ? 'Đang chạy...' : 'Chạy ZNS Birthday Ngay'}
                </button>
              </div>
            </div>

            {cronResult && (
              <div className={`rounded-xl px-4 py-3 text-sm font-semibold border ${
                cronStatus === 'done' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {cronStatus === 'done' ? '✅' : '❌'}{' '}
                Kết quả: {cronResult.zns_sent as number || 0} gửi thành công ·{' '}
                {cronResult.birthday_today ? (cronResult.birthday_today as string[]).length : 0} sinh nhật hôm nay ·{' '}
                {cronResult.reminders_created as number || 0} nhắc nhở mới
              </div>
            )}

            {/* Today */}
            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl border border-yellow-200 p-5">
              <h3 className="font-bold text-yellow-800 mb-3 flex items-center gap-2">
                <Gift size={16} /> Sinh Nhật Hôm Nay
                {birthdayToday.length > 0 && (
                  <span className="px-2 py-0.5 bg-yellow-500 text-white rounded-full text-xs font-bold">
                    {birthdayToday.length}
                  </span>
                )}
              </h3>
              {bdLoading ? (
                <p className="text-sm text-yellow-600">Đang quét...</p>
              ) : birthdayToday.length === 0 ? (
                <p className="text-sm text-yellow-600 opacity-70">Không có sinh nhật hôm nay 🎉</p>
              ) : (
                <div className="space-y-2">
                  {birthdayToday.map(m => (
                    <div key={m.id} className="bg-white rounded-xl p-3 border border-yellow-200 flex items-center gap-3">
                      <span className="text-2xl">🎂</span>
                      <div className="flex-1">
                        <div className="font-bold text-gray-800 text-sm">{m.full_name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                          <Phone size={10} /> {m.phone}
                          {m.consultant_name && <span>· Sales: {m.consultant_name}</span>}
                        </div>
                      </div>
                      <a href={`tel:${m.phone}`}
                        className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-xs font-bold hover:bg-yellow-600 transition-all">
                        <Phone size={11} /> Gọi
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Calendar size={16} className="text-blue-500" /> Sắp Có Sinh Nhật
              </h3>
              {bdLoading ? (
                <p className="text-sm text-gray-400">Đang tải...</p>
              ) : birthdayUpcoming.length === 0 ? (
                <p className="text-sm text-gray-400">Không có sinh nhật trong 30 ngày tới</p>
              ) : (
                <div className="space-y-2">
                  {birthdayUpcoming.map(m => (
                    <div key={m.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
                      (m.days_until ?? 99) <= 3
                        ? 'bg-red-50 border-red-200'
                        : (m.days_until ?? 99) <= 7
                          ? 'bg-orange-50 border-orange-200'
                          : 'bg-gray-50 border-gray-100'
                    }`}>
                      <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center font-black text-sm ${
                        (m.days_until ?? 99) <= 3 ? 'bg-red-500 text-white' :
                        (m.days_until ?? 99) <= 7 ? 'bg-orange-400 text-white' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        <span className="text-lg leading-none">{m.days_until}</span>
                        <span className="text-[9px] leading-none opacity-80">ngày</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-gray-800">{m.full_name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                          <span>🎂 {fmtDOB(m.date_of_birth)}</span>
                          <span>·</span>
                          <Phone size={10} /> {m.phone}
                          {m.consultant_name && <span>· {m.consultant_name}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <a href={`tel:${m.phone}`}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-all">
                          <Phone size={10} /> Gọi
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            TAB: Logs
        ════════════════════════════════════════════════════ */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {[
                  { val: '', label: 'Tất cả' },
                  { val: 'welcome', label: '👋 Welcome' },
                  { val: 'birthday', label: '🎂 Birthday' },
                  { val: 'failed', label: '❌ Thất bại' },
                ].map(f => (
                  <button
                    key={f.val}
                    onClick={() => { setLogFilter(f.val); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      logFilter === f.val ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button
                onClick={fetchLogs}
                className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
              >
                <RefreshCw size={13} className={logsLoading ? 'animate-spin' : ''} /> Làm mới
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {logsLoading ? (
                <div className="text-center py-12 text-gray-400">Đang tải lịch sử...</div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12">
                  <Bell size={36} className="mx-auto mb-3 text-gray-200" />
                  <p className="text-sm text-gray-400 font-semibold">Chưa có lịch sử gửi</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">MÃ HV</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">SĐT</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">LOẠI</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">TRẠNG THÁI</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">THỜI GIAN</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">CHI TIẾT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {logs.map(log => {
                      const s = STATUS_STYLE[log.status] || STATUS_STYLE.pending;
                      return (
                        <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs font-bold text-gray-700">{log.member_code}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{log.phone}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs">{TYPE_LABEL[log.message_type] || log.message_type}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-bold ${s.bg} ${s.text}`}>
                              {s.icon} {log.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(log.sent_at)}</td>
                          <td className="px-4 py-3 text-xs text-gray-400 max-w-[180px] truncate">
                            {log.message_id
                              ? <span className="text-emerald-600 font-mono">ID: {log.message_id.slice(0, 12)}...</span>
                              : log.error_message
                                ? <span className="text-red-500">{log.error_message.slice(0, 40)}</span>
                                : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            TAB: Settings & Test
        ════════════════════════════════════════════════════ */}
        {activeTab === 'settings' && (
          <div className="space-y-5">
            {/* Config checklist */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-800 mb-4">⚙️ Cấu Hình Cần Thiết</h2>
              <div className="space-y-3">
                {[
                  {
                    key: 'ZALO_OA_ACCESS_TOKEN',
                    label: 'Zalo OA Access Token',
                    hint: 'Lấy từ Zalo Developer Portal → OA → Token Management (valid 1 giờ)',
                    required: true,
                  },
                  {
                    key: 'ZALO_OA_REFRESH_TOKEN',
                    label: 'Zalo OA Refresh Token',
                    hint: 'Dùng để tự động làm mới Access Token (valid 3 tháng)',
                    required: true,
                  },
                  {
                    key: 'ZALO_OA_APP_ID',
                    label: 'Zalo App ID',
                    hint: 'ID của ứng dụng Zalo OA trên developer portal',
                    required: true,
                  },
                  {
                    key: 'ZALO_OA_APP_SECRET',
                    label: 'Zalo App Secret',
                    hint: 'Secret key của Zalo App (bảo mật)',
                    required: true,
                  },
                  {
                    key: 'ZALO_ZNS_TEMPLATE_WELCOME',
                    label: 'Template ID: Welcome Message',
                    hint: 'ID của ZNS template chào mừng (cần được Zalo duyệt)',
                    required: true,
                  },
                  {
                    key: 'ZALO_ZNS_TEMPLATE_BIRTHDAY',
                    label: 'Template ID: Birthday Greeting',
                    hint: 'ID của ZNS template sinh nhật (cần được Zalo duyệt)',
                    required: false,
                  },
                ].map(item => (
                  <div key={item.key} className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
                    item.required ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'
                  }`}>
                    <div className={`w-5 h-5 rounded-full flex-shrink-0 mt-0.5 border-2 ${
                      item.required ? 'border-orange-400 bg-orange-100' : 'border-gray-300 bg-gray-100'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{item.key}</code>
                        {item.required && <span className="text-[10px] font-bold text-red-500">BẮT BUỘC</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5 italic">{item.hint}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                💡 <strong>Thêm vào file .env.local</strong> và Vercel Dashboard → Settings → Environment Variables.
                <br />Sau khi cấu hình xong, deploy lại để áp dụng.
              </div>
            </div>

            {/* Test send */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-800 mb-1">🧪 Gửi Test Welcome Message</h2>
              <p className="text-xs text-gray-500 mb-4">Gửi tin nhắn thử nghiệm để kiểm tra kết nối Zalo ZNS</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Số Điện Thoại</label>
                  <input
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                    placeholder="09xx xxx xxx"
                    type="tel"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tên Hội Viên</label>
                  <input
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    value={testName}
                    onChange={e => setTestName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                  />
                </div>
              </div>
              <button
                onClick={handleTestSend}
                disabled={testSending || !testPhone || !testName}
                className="mt-3 flex items-center gap-2 px-5 py-2.5 bg-[#0068ff] text-white rounded-xl font-bold text-sm shadow hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                <Send size={14} />
                {testSending ? 'Đang gửi...' : 'Gửi Test'}
              </button>

              {testResult && (
                <div className={`mt-3 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold ${
                  testResult.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {testResult.ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  {testResult.msg}
                </div>
              )}
            </div>

            {/* Quick links */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-800 mb-3">🔗 Links Hữu Ích</h2>
              <div className="space-y-2">
                {[
                  { label: 'Zalo Developer Portal', url: 'https://developers.zalo.me', desc: 'Tạo App, lấy Token' },
                  { label: 'ZNS Template Manager', url: 'https://oa.zalo.me/home', desc: 'Tạo và duyệt ZNS template' },
                  { label: 'Zalo OA Manager', url: 'https://oa.zalo.me', desc: 'Quản lý Official Account' },
                  { label: 'Birthday Cron (manual)', url: `/api/cron/birthday-zns?secret=blackstone-cron-secret-2026`, desc: 'Chạy thủ công cron' },
                ].map(link => (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 hover:border-blue-200 transition-all group"
                  >
                    <Eye size={14} className="text-blue-400 group-hover:text-blue-600 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-700 group-hover:text-blue-600">{link.label}</div>
                      <div className="text-xs text-gray-400">{link.desc}</div>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-400" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </PageLayout>
  );
}
