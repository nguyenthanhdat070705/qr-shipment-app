import { getSupabaseAdmin } from '@/lib/supabase/server';
import { ACTIVE_PO_STATUSES, type ReorderAlertStatus } from './types';

type SupabaseLike = ReturnType<typeof getSupabaseAdmin>;

interface ReorderItem {
  id: string;
  set_id: string;
  hom_id: string;
  ma_hom: string;
  reorder_point: number;
}

interface ExistingAlertState {
  id: string;
  hom_id: string;
  ma_hom: string;
  physical_quantity: number;
  available_quantity: number;
  reorder_point: number;
  status: ReorderAlertStatus;
  first_alerted_at: string | null;
  last_notified_at: string | null;
  last_reminder_date: string | null;
  linked_po_id: string | null;
}

interface ActivePo {
  id: string;
  code: string;
  status: string;
}

export interface ReorderEvaluationSummary {
  set_id: string | null;
  evaluated: number;
  below_threshold: number;
  newly_alerted: number;
  reminders_sent: number;
  po_pending: number;
  resolved: number;
}

function numericQuantity(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value ?? '').trim().replace(/\s/g, '');
  if (!raw) return 0;
  const normalized = /^\d{1,3}(\.\d{3})+$/.test(raw) ? raw.replace(/\./g, '') : raw.replace(/,/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function ictDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function hasCrossedIntoThreshold(existing: ExistingAlertState | undefined, reorderPoint: number, available: number): boolean {
  if (!existing) return true;
  if (existing.status === 'resolved' || existing.status === 'superseded') return true;
  return numericQuantity(existing.available_quantity) > reorderPoint || available > reorderPoint;
}

export async function evaluateReorderAlerts(options: {
  supabase?: SupabaseLike;
  now?: Date;
  senderEmail?: string;
} = {}): Promise<ReorderEvaluationSummary> {
  const supabase = options.supabase || getSupabaseAdmin();
  const now = options.now || new Date();
  const nowIso = now.toISOString();
  const today = ictDateKey(now);

  const activeSetResult = await supabase
    .from('reorder_point_sets')
    .select('id')
    .eq('status', 'active')
    .order('activated_at', { ascending: false })
    .limit(1);

  if (activeSetResult.error) throw new Error(activeSetResult.error.message);
  const activeSet = activeSetResult.data?.[0] as { id: string } | undefined;
  if (!activeSet) {
    return { set_id: null, evaluated: 0, below_threshold: 0, newly_alerted: 0, reminders_sent: 0, po_pending: 0, resolved: 0 };
  }

  const [itemsResult, inventoryResult, poItemsResult, stateResult] = await Promise.all([
    supabase
      .from('reorder_point_items')
      .select('id, set_id, hom_id, ma_hom, reorder_point')
      .eq('set_id', activeSet.id),
    supabase.from('fact_inventory').select('"Tên hàng hóa", "Số lượng", "Ghi chú"'),
    supabase.from('fact_don_hang_items').select('don_hang_id, ma_hom'),
    supabase
      .from('reorder_alert_states')
      .select('id, hom_id, ma_hom, physical_quantity, available_quantity, reorder_point, status, first_alerted_at, last_notified_at, last_reminder_date, linked_po_id')
      .eq('set_id', activeSet.id),
  ]);

  for (const result of [itemsResult, inventoryResult, poItemsResult, stateResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const items = (itemsResult.data || []) as ReorderItem[];
  const inventoryByHom = new Map<string, { physical: number; available: number }>();
  for (const row of (inventoryResult.data || []) as Record<string, unknown>[]) {
    const homId = String(row['Tên hàng hóa'] || '');
    if (!homId) continue;
    const current = inventoryByHom.get(homId) || { physical: 0, available: 0 };
    current.physical += numericQuantity(row['Số lượng']);
    current.available += numericQuantity(row['Ghi chú']);
    inventoryByHom.set(homId, current);
  }

  const poItems = (poItemsResult.data || []) as { don_hang_id: string; ma_hom: string }[];
  const poIds = [...new Set(poItems.map(item => item.don_hang_id).filter(Boolean))];
  const poResult = poIds.length > 0
    ? await supabase.from('fact_don_hang').select('id, ma_don_hang, trang_thai').in('id', poIds)
    : { data: [], error: null };
  if (poResult.error) throw new Error(poResult.error.message);

  const poMap = new Map<string, ActivePo>();
  for (const po of (poResult.data || []) as { id: string; ma_don_hang: string; trang_thai: string }[]) {
    if (!ACTIVE_PO_STATUSES.has(String(po.trang_thai || '').toLowerCase())) continue;
    poMap.set(po.id, { id: po.id, code: po.ma_don_hang, status: po.trang_thai });
  }

  const poBySku = new Map<string, ActivePo>();
  for (const item of poItems) {
    const po = poMap.get(item.don_hang_id);
    if (po && !poBySku.has(item.ma_hom.trim().toUpperCase())) {
      poBySku.set(item.ma_hom.trim().toUpperCase(), po);
    }
  }

  const states = new Map<string, ExistingAlertState>();
  for (const state of (stateResult.data || []) as ExistingAlertState[]) {
    states.set(state.hom_id, state);
  }

  const summary: ReorderEvaluationSummary = {
    set_id: activeSet.id,
    evaluated: items.length,
    below_threshold: 0,
    newly_alerted: 0,
    reminders_sent: 0,
    po_pending: 0,
    resolved: 0,
  };

  for (const item of items) {
    const quantities = inventoryByHom.get(item.hom_id) || { physical: 0, available: 0 };
    const threshold = numericQuantity(item.reorder_point);
    const existing = states.get(item.hom_id);
    const activePo = poBySku.get(item.ma_hom.trim().toUpperCase());
    const belowThreshold = quantities.available <= threshold;

    if (!belowThreshold) {
      if (existing && existing.status !== 'resolved') {
        const { error } = await supabase
          .from('reorder_alert_states')
          .update({
            physical_quantity: quantities.physical,
            available_quantity: quantities.available,
            reorder_point: threshold,
            status: 'resolved',
            linked_po_id: null,
            resolved_at: nowIso,
          })
          .eq('id', existing.id);
        if (error) throw new Error(error.message);
        summary.resolved += 1;
      }
      continue;
    }

    summary.below_threshold += 1;
    const poPending = Boolean(activePo);
    // A cancelled PO reopens the alert even though the stock never crossed
    // above the threshold in between.
    const reopenedAfterPoCancellation = existing?.status === 'po_pending' && !activePo;
    const crossed = reopenedAfterPoCancellation || hasCrossedIntoThreshold(existing, threshold, quantities.available);
    const shouldSendReminder = !poPending
      && !crossed
      && existing?.status === 'open'
      && existing.last_reminder_date !== today
      && (!existing.last_notified_at || ictDateKey(new Date(existing.last_notified_at)) !== today);

    const nextStatus: ReorderAlertStatus = poPending ? 'po_pending' : 'open';
    const statePayload = {
      set_id: activeSet.id,
      hom_id: item.hom_id,
      ma_hom: item.ma_hom,
      physical_quantity: quantities.physical,
      available_quantity: quantities.available,
      reorder_point: threshold,
      status: nextStatus,
      first_alerted_at: existing?.first_alerted_at || nowIso,
      last_notified_at: (crossed || shouldSendReminder) && !poPending
        ? nowIso
        : existing?.last_notified_at || null,
      last_reminder_date: shouldSendReminder ? today : existing?.last_reminder_date || null,
      linked_po_id: activePo?.id || null,
      resolved_at: null,
    };

    const { data: savedState, error: stateError } = await supabase
      .from('reorder_alert_states')
      .upsert(statePayload, { onConflict: 'set_id,hom_id' })
      .select('id')
      .single();
    if (stateError || !savedState) throw new Error(stateError?.message || 'Không lưu được trạng thái reorder alert.');

    if (poPending) {
      summary.po_pending += 1;
      continue;
    }

    if (crossed) {
      summary.newly_alerted += 1;
      await insertReorderNotification(supabase, {
        type: 'reorder_alert',
        referenceId: savedState.id,
        item,
        quantities,
        threshold,
        senderEmail: options.senderEmail || 'system',
      });
    } else if (shouldSendReminder) {
      summary.reminders_sent += 1;
      await insertReorderNotification(supabase, {
        type: 'reorder_reminder',
        referenceId: savedState.id,
        item,
        quantities,
        threshold,
        senderEmail: options.senderEmail || 'system',
      });
    }
  }

  return summary;
}

/** Fire-and-forget hook for inventory mutation routes. The daily cron remains the backstop. */
export function triggerReorderEvaluation(supabase: SupabaseLike, reason: string): void {
  void evaluateReorderAlerts({ supabase, senderEmail: 'system' }).catch(error => {
    console.warn(`[reorder] Evaluation after ${reason} failed:`, error instanceof Error ? error.message : error);
  });
}

async function insertReorderNotification(
  supabase: SupabaseLike,
  input: {
    type: 'reorder_alert' | 'reorder_reminder';
    referenceId: string;
    item: ReorderItem;
    quantities: { physical: number; available: number };
    threshold: number;
    senderEmail: string;
  },
) {
  const isReminder = input.type === 'reorder_reminder';
  const title = isReminder
    ? `Nhắc lại: hòm ${input.item.ma_hom} đang dưới reorder point`
    : `Cảnh báo tồn kho thấp: hòm ${input.item.ma_hom}`;
  const message = isReminder
    ? `Hòm ${input.item.ma_hom} còn khả dụng ${input.quantities.available}, tồn vật lý ${input.quantities.physical}, reorder point ${input.threshold}. Chưa có PO đang xử lý.`
    : `Hòm ${input.item.ma_hom} đã chạm ngưỡng reorder point. Khả dụng: ${input.quantities.available}; vật lý: ${input.quantities.physical}; ngưỡng: ${input.threshold}.`;

  const { error } = await supabase.from('notifications').insert({
    sender_email: input.senderEmail,
    receiver_role: 'procurement',
    title,
    message,
    type: input.type,
    reference_id: input.referenceId,
  });

  if (error) {
    // Keep inventory evaluation successful even if notifications are temporarily unavailable.
    console.error('[reorder] Notification insert failed:', error.message);
  }
}

