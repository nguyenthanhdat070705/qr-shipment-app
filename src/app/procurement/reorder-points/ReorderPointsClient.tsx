'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  AlertCircle, BellRing, CheckCircle2, Clock3, FileSpreadsheet,
  History, Package, RefreshCw, ShoppingCart, Upload, XCircle,
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { DEMO_ALERTS, DEMO_EVALUATION, DEMO_REORDER_SET, DEMO_SETS } from '@/lib/reorder/demo';

interface ValidationIssue {
  row: number;
  sku?: string;
  code: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  total_rows: number;
  valid_rows: number;
  duplicate_skus: string[];
  unknown_skus: string[];
  coverage_warnings: string[];
  issues: ValidationIssue[];
  rows: unknown[];
  source_file_name?: string;
  effective_month?: string;
}

interface ReorderSet {
  id: string;
  effective_month: string;
  source_file_name: string;
  uploaded_by: string;
  status: string;
  row_count: number;
  created_at: string;
  activated_at?: string | null;
  source_rows?: unknown[] | null;
}

interface ReorderAlert {
  id: string;
  sku: string;
  product_name: string;
  physical_quantity: number;
  available_quantity: number;
  reorder_point: number;
  status: 'open' | 'po_pending' | 'resolved' | 'superseded';
  last_reminder_date?: string | null;
  linked_po_id?: string | null;
  po_code?: string | null;
  po_status?: string | null;
}

interface EvaluationSummary {
  below_threshold: number;
  newly_alerted: number;
  reminders_sent: number;
  po_pending: number;
  resolved: number;
}

function currentMonth(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit' }).format(new Date());
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('vi-VN');
}

function statusLabel(status: string): string {
  return ({
    open: 'Đang cảnh báo',
    po_pending: 'Đang có PO',
    resolved: 'Đã xử lý',
    superseded: 'Bộ cũ',
  } as Record<string, string>)[status] || status;
}

function statusClass(status: string): string {
  return ({
    open: 'bg-red-50 text-red-700 border-red-200',
    po_pending: 'bg-amber-50 text-amber-700 border-amber-200',
    resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    superseded: 'bg-gray-50 text-gray-500 border-gray-200',
  } as Record<string, string>)[status] || 'bg-gray-50 text-gray-600 border-gray-200';
}

function parseWorkbook(file: File): Promise<{
  rows: { ma_hom: string; safety_stock: string | number; movement: string | number; reorder_point: string | number; description: string; source_row: number }[];
  sheetName: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const workbook = XLSX.read(new Uint8Array(event.target?.result as ArrayBuffer), { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error('File không có sheet.');
        const sheet = workbook.Sheets[sheetName];
        const matrix = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1, defval: '', raw: true });
        const firstDataRow = matrix.findIndex(row => row.some(cell => String(cell ?? '').trim() !== ''));
        if (firstDataRow < 0) throw new Error('File Excel không có dữ liệu.');

        const dataRows = matrix.slice(firstDataRow + 1)
          .map((row, index) => ({ row, source_row: firstDataRow + index + 2 }))
          .filter(({ row }) => row.slice(0, 5).some(cell => String(cell ?? '').trim() !== ''));

        resolve({
          sheetName,
          rows: dataRows.map(({ row, source_row }) => ({
            ma_hom: String(row[0] ?? '').trim(),
            safety_stock: row[1] ?? '',
            movement: row[2] ?? '',
            reorder_point: row[3] ?? '',
            description: String(row[4] ?? '').trim(),
            source_row,
          })),
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Không thể đọc file Excel.'));
      }
    };
    reader.onerror = () => reject(new Error('Không thể đọc file Excel.'));
    reader.readAsArrayBuffer(file);
  });
}

export default function ReorderPointsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [sets, setSets] = useState<ReorderSet[]>([]);
  const [activeSet, setActiveSet] = useState<ReorderSet | null>(null);
  const [alerts, setAlerts] = useState<ReorderAlert[]>([]);
  const [evaluation, setEvaluation] = useState<EvaluationSummary | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [effectiveMonth, setEffectiveMonth] = useState(currentMonth());
  const [parsedRows, setParsedRows] = useState<ValidationResult['rows']>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sourceSet, setSourceSet] = useState<ReorderSet | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('auth_user') || '{}');
      setEmail(user.email || '');
    } catch { /* RoleGuard handles invalid auth state. */ }
  }, []);

  const loadData = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      const query = `?email=${encodeURIComponent(email)}`;
      const [setsResponse, alertsResponse] = await Promise.all([
        fetch(`/api/reorder-points${query}`),
        fetch(`/api/reorder-points/alerts${query}`),
      ]);
      const setsJson = await setsResponse.json();
      const alertsJson = await alertsResponse.json();
      if (!setsResponse.ok) throw new Error(setsJson.error || 'Không tải được lịch sử reorder point.');
      if (!alertsResponse.ok) throw new Error(alertsJson.error || 'Không tải được cảnh báo reorder point.');
      const loadedSets = (setsJson.data || []) as ReorderSet[];
      setSets(loadedSets);
      setActiveSet((alertsJson.active_set || loadedSets.find(set => set.status === 'active') || null) as ReorderSet | null);
      setAlerts((alertsJson.data || []) as ReorderAlert[]);
      setEvaluation((alertsJson.evaluation || null) as EvaluationSummary | null);
      setIsDemoMode(false);
    } catch (loadError) {
      // Local review mode: the repository can run without Supabase credentials.
      // Keep this fallback explicitly labelled so it cannot be mistaken for live stock.
      setIsDemoMode(true);
      setSets(DEMO_SETS);
      setActiveSet(DEMO_REORDER_SET);
      setAlerts(DEMO_ALERTS);
      setEvaluation(DEMO_EVALUATION);
      setError('');
      setMessage('Đang hiển thị dữ liệu DEMO local để review. Đây không phải số tồn production.');
      console.warn('[reorder] Live API unavailable; showing local demo data.', loadError);
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const alertId = searchParams.get('alert');
    if (!alertId || !alerts.length) return;
    document.getElementById(`reorder-alert-${alertId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [alerts, searchParams]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setValidation(null);
    setError('');
    setMessage('');
    setValidating(true);
    try {
      const parsed = await parseWorkbook(file);
      const response = await fetch('/api/reorder-points/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate',
          email,
          source_file_name: file.name,
          effective_month: effectiveMonth,
          rows: parsed.rows,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Không thể validate file.');
      setParsedRows(parsed.rows as ValidationResult['rows']);
      setValidation(json as ValidationResult);
      setMessage(`Đã đọc sheet “${parsed.sheetName}” và hoàn tất kiểm tra dữ liệu.`);
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : 'Không thể xử lý file.');
    } finally {
      setValidating(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleActivate = async () => {
    if (!validation?.valid || parsedRows.length === 0) return;
    setActivating(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/reorder-points/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'activate',
          email,
          source_file_name: selectedFileName,
          effective_month: effectiveMonth,
          rows: parsedRows,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Không thể activate file.');
      setMessage(json.warning || `Đã activate bộ reorder point với ${validation.valid_rows} SKU.`);
      setValidation(null);
      setParsedRows([]);
      setSelectedFileName('');
      await loadData();
    } catch (activateError) {
      setError(activateError instanceof Error ? activateError.message : 'Không thể activate file.');
    } finally {
      setActivating(false);
    }
  };

  const openCount = useMemo(() => alerts.filter(alert => alert.status === 'open').length, [alerts]);
  const poPendingCount = useMemo(() => alerts.filter(alert => alert.status === 'po_pending').length, [alerts]);

  const runEvaluation = async () => {
    if (!email) return;
    if (isDemoMode) {
      setEvaluation(DEMO_EVALUATION);
      setMessage('Đã mô phỏng cập nhật cảnh báo trên bộ dữ liệu DEMO local.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/reorder-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-email': email },
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Không thể chạy đánh giá.');
      setMessage('Đã cập nhật lại trạng thái cảnh báo theo tồn kho hiện tại.');
      await loadData();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Không thể chạy đánh giá.');
      setLoading(false);
    }
  };

  return (
    <PageLayout title="Reorder Point" icon={<BellRing size={16} className="text-red-500" />}>
      <div className="space-y-5 pb-12">
        <div className="rounded-2xl bg-gradient-to-br from-[#1B2A4A] via-[#2d4a7a] to-[#3b5fa8] p-5 sm:p-7 text-white shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Bộ phận Thu mua</p>
              <h1 className="mt-1 text-2xl font-extrabold">Reorder Point và cảnh báo tồn thấp</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/70">Theo dõi tồn khả dụng so với ngưỡng reorder point, tồn vật lý và tình trạng PO theo từng mã hòm.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={runEvaluation} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20 disabled:opacity-50">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Cập nhật cảnh báo
              </button>
              <button onClick={() => fileInputRef.current?.click()} disabled={validating} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-extrabold text-[#1B2A4A] hover:bg-white/90 disabled:opacity-50">
                <Upload size={14} /> Upload file mới
              </button>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileSelect} />
            </div>
          </div>
        </div>

        {error && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle size={17} className="mt-0.5 flex-shrink-0" />{error}</div>}
        {message && <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 size={17} className="mt-0.5 flex-shrink-0" />{message}</div>}
        {isDemoMode && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">DEMO local: dữ liệu đang được dựng để review giao diện và logic cảnh báo. Chưa ghi vào database.</div>}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="Đang cảnh báo" value={openCount} icon={<AlertCircle size={18} />} color="red" />
          <MetricCard label="Có PO đang xử lý" value={poPendingCount} icon={<ShoppingCart size={18} />} color="amber" />
          <MetricCard label="SKU dưới ngưỡng" value={evaluation?.below_threshold ?? '—'} icon={<Package size={18} />} color="blue" />
          <MetricCard label="Reminder gần nhất" value={evaluation?.reminders_sent ?? '—'} icon={<Clock3 size={18} />} color="violet" />
        </div>

        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-extrabold text-gray-900"><FileSpreadsheet size={18} className="text-emerald-600" /> Bộ reorder point đang dùng</h2>
              <p className="mt-1 text-xs text-gray-500">Upload file chỉ tạo preview. Chỉ khi bấm Activate thì ngưỡng mới được áp dụng.</p>
            </div>
            {activeSet && <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"><CheckCircle2 size={13} /> Active</span>}
          </div>
          {activeSet ? (
            <div className="grid grid-cols-2 gap-4 pt-4 text-sm sm:grid-cols-5">
              <Info label="File" value={activeSet.source_file_name} />
              <Info label="Tháng hiệu lực" value={activeSet.effective_month?.slice(0, 7) || '—'} />
              <Info label="Số SKU" value={String(activeSet.row_count)} />
              <Info label="Kích hoạt" value={formatDate(activeSet.activated_at)} />
              <Info label="Người upload" value={activeSet.uploaded_by} />
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-gray-400">Chưa có bộ reorder point active.</div>
          )}
        </section>

        {(validation || validating) && (
          <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-base font-extrabold text-gray-900"><FileSpreadsheet size={18} className="text-blue-600" /> Preview file {selectedFileName && `· ${selectedFileName}`}</h2>
                <p className="mt-1 text-xs text-gray-500">Tháng hiệu lực: {effectiveMonth}</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="month" value={effectiveMonth} onChange={event => setEffectiveMonth(event.target.value)} className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs" />
                <button onClick={handleActivate} disabled={validating || activating || !validation?.valid} className="inline-flex items-center gap-2 rounded-xl bg-[#1B2A4A] px-3 py-2 text-xs font-bold text-white hover:bg-[#263d68] disabled:cursor-not-allowed disabled:opacity-40">
                  {activating ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Activate
                </button>
                <button onClick={() => { setValidation(null); setParsedRows([]); setSelectedFileName(''); }} className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-gray-700"><XCircle size={16} /></button>
              </div>
            </div>
            {validating ? <div className="py-6 text-center text-sm text-gray-500">Đang đọc và kiểm tra file...</div> : validation && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                  <Info label="Tổng dòng" value={String(validation.total_rows)} />
                  <Info label="Dòng hợp lệ" value={String(validation.valid_rows)} />
                  <Info label="SKU trùng" value={String(validation.duplicate_skus.length)} />
                  <Info label="SKU không tồn tại" value={String(validation.unknown_skus.length)} />
                </div>
                {validation.valid ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">Dữ liệu hợp lệ. Có thể Activate.</div> : (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    <p className="font-extrabold">Không thể Activate cho đến khi xử lý các lỗi sau:</p>
                    <div className="mt-2 space-y-1">
                      {validation.issues.slice(0, 12).map((issue, index) => <p key={`${issue.code}-${issue.row}-${index}`}>Dòng {issue.row}{issue.sku ? ` · ${issue.sku}` : ''}: {issue.message}</p>)}
                      {validation.issues.length > 12 && <p className="font-semibold">… và {validation.issues.length - 12} lỗi khác.</p>}
                    </div>
                  </div>
                )}
                {validation.coverage_warnings.length > 0 && <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">Cảnh báo coverage: {validation.coverage_warnings.length} SKU trong catalogue không có trong file. Các SKU này giữ nguyên, không tự đặt ngưỡng 0.</p>}
              </div>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 sm:px-5">
            <div>
              <h2 className="flex items-center gap-2 text-base font-extrabold text-gray-900"><BellRing size={18} className="text-red-500" /> Cảnh báo theo SKU</h2>
              <p className="mt-1 text-xs text-gray-500">Điều kiện cảnh báo: tồn khả dụng ≤ reorder point.</p>
            </div>
            <span className="text-xs font-semibold text-gray-400">{alerts.length} dòng</span>
          </div>
          {loading ? <div className="py-12 text-center text-sm text-gray-400">Đang tải...</div> : alerts.length === 0 ? <div className="py-12 text-center text-sm text-gray-400">Chưa có cảnh báo nào.</div> : (
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-left text-xs">
                <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
                  <tr><th className="px-4 py-3">SKU / Tên hòm</th><th className="px-4 py-3">Khả dụng</th><th className="px-4 py-3">Vật lý</th><th className="px-4 py-3">Reorder point</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">PO</th><th className="px-4 py-3">Reminder</th><th className="px-4 py-3"></th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {alerts.map(alert => (
                    <tr id={`reorder-alert-${alert.id}`} key={alert.id} className={alert.status === 'open' ? 'bg-red-50/30' : ''}>
                      <td className="px-4 py-3"><p className="font-mono font-bold text-gray-900">{alert.sku}</p><p className="mt-0.5 max-w-[260px] truncate text-gray-500">{alert.product_name}</p></td>
                      <td className="px-4 py-3 font-extrabold text-red-600">{alert.available_quantity}</td>
                      <td className="px-4 py-3 font-semibold text-gray-700">{alert.physical_quantity}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{alert.reorder_point}</td>
                      <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${statusClass(alert.status)}`}>{statusLabel(alert.status)}</span></td>
                      <td className="px-4 py-3">{alert.po_code ? <button onClick={() => router.push(`/purchase-orders/${alert.linked_po_id}`)} className="font-bold text-blue-600 hover:underline">{alert.po_code}</button> : <span className="text-gray-400">Chưa có PO</span>}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(alert.last_reminder_date)}</td>
                      <td className="px-4 py-3 text-right">{alert.status === 'open' && <button onClick={() => router.push(`/purchase-orders/create?ma_hom=${encodeURIComponent(alert.sku)}`)} className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2 py-1.5 text-[10px] font-bold text-violet-700 hover:bg-violet-100"><ShoppingCart size={12} /> Tạo PO</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-gray-900"><History size={18} className="text-gray-500" /> Lịch sử file</h2>
          <div className="mt-3 divide-y divide-gray-100">
            {sets.length === 0 ? <p className="py-4 text-sm text-gray-400">Chưa có lịch sử.</p> : sets.map(set => <div key={set.id} className="flex flex-col gap-1 py-3 text-xs sm:flex-row sm:items-center sm:justify-between"><div><span className="font-semibold text-gray-800">{set.source_file_name}</span><span className="ml-2 text-gray-400">{set.effective_month?.slice(0, 7)} · {set.row_count} SKU</span></div><div className="flex flex-wrap items-center gap-3 text-gray-400"><span>{set.uploaded_by}</span><span className={`font-bold ${set.status === 'active' ? 'text-emerald-600' : 'text-gray-500'}`}>{set.status}</span>{set.source_rows?.length ? <button onClick={() => setSourceSet(set)} className="font-bold text-blue-600 hover:underline">Xem dữ liệu gốc</button> : null}</div></div>)}
          </div>
        </section>

        {sourceSet && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSourceSet(null)}>
            <div className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <div><h2 className="font-extrabold text-gray-900">Dữ liệu gốc · {sourceSet.source_file_name}</h2><p className="mt-0.5 text-xs text-gray-500">{sourceSet.source_rows?.length || 0} dòng đã lưu khi import</p></div>
                <button onClick={() => setSourceSet(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><XCircle size={17} /></button>
              </div>
              <div className="max-h-[70vh] overflow-auto p-4"><pre className="whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-xs text-gray-700">{JSON.stringify(sourceSet.source_rows, null, 2)}</pre></div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

function MetricCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: 'red' | 'amber' | 'blue' | 'violet' }) {
  const colors = { red: 'bg-red-50 text-red-600', amber: 'bg-amber-50 text-amber-600', blue: 'bg-blue-50 text-blue-600', violet: 'bg-violet-50 text-violet-600' };
  return <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"><div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${colors[color]}`}>{icon}</div><p className="text-2xl font-extrabold text-gray-900">{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p><p className="mt-1 truncate font-semibold text-gray-800" title={value}>{value}</p></div>;
}

