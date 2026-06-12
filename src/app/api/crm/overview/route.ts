/**
 * GET /api/crm/overview — đếm số bản ghi từng module + thời điểm sync gần nhất.
 * (Route tĩnh "overview" được Next ưu tiên hơn [module] động.)
 */
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { CRM_MODULES } from '@/config/crmModules';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const supabase = getSupabaseAdmin();
  const counts: Record<string, number> = {};

  await Promise.all(
    CRM_MODULES.map(async (m) => {
      try {
        const { count, error } = await supabase.from(m.table).select('id', { count: 'exact', head: true });
        counts[m.key] = error ? 0 : count ?? 0;
      } catch {
        counts[m.key] = 0;
      }
    }),
  );

  let lastSync: string | null = null;
  try {
    const { data } = await supabase.from('crm_khach_hang').select('synced_at').order('synced_at', { ascending: false }).limit(1);
    lastSync = data?.[0]?.synced_at ?? null;
  } catch { /* tables may not exist yet */ }

  return NextResponse.json({ counts, last_sync: lastSync });
}
