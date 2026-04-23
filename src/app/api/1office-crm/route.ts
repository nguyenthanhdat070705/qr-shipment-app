import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import {
  fetchCustomers,
  fetchLeads,
  fetchCRMTasks,
  fetchCustomersSince,
  fetchLeadsSince,
  fetchProducts,
} from '@/lib/1office/client';

export const maxDuration = 300;

// ── Mappers ────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseDate(str: unknown): string | null {
  if (!str || typeof str !== 'string') return null;
  const parts = str.trim().split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  if (!d || !m || !y || y.length !== 4) return null;
  const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  return isNaN(Date.parse(iso)) ? null : iso;
}
function parseNum(val: unknown): number {
  if (!val) return 0;
  const n = parseFloat(String(val).replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCustomer(item: any) {
  return {
    oneoffice_id:   Number(item.ID) || Number(item.id) || null,
    code:           item.code || null,
    name:           item.name || item.fullname || item.title || `KH-${item.ID}`,
    phone:          item.phone || item.mobile || null,
    email:          item.email || null,
    address:        item.address || item.full_address || null,
    city:           item.city || item.province || null,
    company:        item.company_name || item.company || null,
    assigned_to:    item.user_id || item.assigned_user_id || null,
    assigned_name:  item.assigned_name || item.user_name || null,
    status:         item.status_view || item.status || null,
    customer_type:  item.customer_type || item.type || null,
    source:         item.source || null,
    tags:           Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || null),
    total_revenue:  parseNum(item.revenue || item.total_revenue),
    note:           item.desc || item.note || null,
    date_created:   parseDate(item.date_created),
    synced_at:      new Date().toISOString(),
    updated_at:     new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLead(item: any) {
  return {
    oneoffice_id:   Number(item.ID) || Number(item.id) || null,
    code:           item.code || null,
    title:          item.title || item.name || `Lead-${item.ID}`,
    customer_id:    Number(item.customer_id) || null,
    customer_name:  item.customer_name || null,
    customer_phone: item.customer_phone || null,
    assigned_to:    item.user_id || item.assigned_user_id || null,
    stage:          item.stage_view || item.stage || item.pipeline_stage || null,
    status:         item.status_view || item.status || null,
    value:          parseNum(item.value || item.expected_revenue || item.total_price),
    currency:       item.currency_unit || 'VND',
    probability:    parseNum(item.probability || item.win_rate),
    expected_close: parseDate(item.date_close || item.expected_close_date || item.date_to),
    source:         item.source || null,
    note:           item.desc || item.note || null,
    date_created:   parseDate(item.date_created),
    synced_at:      new Date().toISOString(),
    updated_at:     new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTask(item: any) {
  function mapPriority(p: string): string {
    if (!p) return 'Trung bình';
    if (p.toLowerCase().includes('high') || p.includes('Cao')) return 'Cao';
    if (p.toLowerCase().includes('low') || p.includes('Thấp')) return 'Thấp';
    return 'Trung bình';
  }
  function mapStatus(s: string): string {
    if (!s) return 'Mới';
    if (s.includes('Hoàn') || s.includes('Done') || s.toLowerCase().includes('complete')) return 'Hoàn thành';
    if (s.includes('Đang') || s.toLowerCase().includes('progress') || s.toLowerCase().includes('doing')) return 'Đang làm';
    return 'Mới';
  }
  return {
    oneoffice_id:   Number(item.ID) || Number(item.id) || null,
    title:          item.title || item.name || `Task-${item.ID}`,
    description:    item.desc || item.description || null,
    assigned_to:    item.user_id || item.assigned_user_id || null,
    related_type:   item.related_type || null,
    related_id:     Number(item.related_id) || null,
    status:         mapStatus(item.status_view || item.status || ''),
    priority:       mapPriority(item.priority_view || item.priority || ''),
    due_date:       parseDate(item.date_deadline || item.due_date || item.date_to),
    completed_at:   item.date_completed ? new Date(item.date_completed).toISOString() : null,
    date_created:   parseDate(item.date_created),
    synced_at:      new Date().toISOString(),
    updated_at:     new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProduct(item: any) {
  return {
    oneoffice_id:   Number(item.ID) || null,
    code:           item.code || String(item.ID),
    name:           item.title || `SP #${item.ID}`,
    barcode:        item.barcode || null,
    unit:           item.unit_id || null,
    cost_price:     parseNum(item.price_buy),
    selling_price:  parseNum(item.price),
    category:       item.product_category || null,
    product_type:   item.product_type || null,
    manage_type:    item.manage_type || null,
    supplier_list:  item.supplier_list || null,
    description:    item.desc || null,
    is_active:      item.status === 'Hoạt động' || item.status === 'active' || item.status === 1,
    updated_at:     new Date().toISOString(),
  };
}

// ── Upsert helper ─────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertBatch(supabase: any, table: string, rows: any[], conflictKey: string) {
  const BATCH = 50;
  let upserted = 0, errors = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).filter(r => r[conflictKey] !== null);
    if (!batch.length) continue;
    const { error } = await supabase.from(table).upsert(batch, { onConflict: conflictKey, ignoreDuplicates: false });
    if (error) { console.error(`[CRMSync] Upsert ${table}:`, error.message); errors += batch.length; }
    else upserted += batch.length;
  }
  return { upserted, errors };
}

// ── Main API handler ──────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type   = searchParams.get('type') || 'customers';
  const search = searchParams.get('search') || '';
  const page   = parseInt(searchParams.get('page') || '1');
  const limit  = parseInt(searchParams.get('limit') || '50');
  const status = searchParams.get('status') || '';
  const offset = (page - 1) * limit;

  const supabase = getSupabaseAdmin();

  try {
    if (type === 'customers') {
      let query = supabase
        .from('oneoffice_crm_customers')
        .select('*', { count: 'exact' });

      if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,code.ilike.%${search}%`);
      }
      if (status) query = query.eq('status', status);
      
      const { data, count, error } = await query
        .order('synced_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ total: count, page, limit, data });
    }

    if (type === 'leads') {
      let query = supabase
        .from('oneoffice_crm_leads')
        .select('*', { count: 'exact' });
      
      if (search) {
        query = query.or(`title.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
      }
      if (status) query = query.eq('stage', status);

      const { data, count, error } = await query
        .order('synced_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ total: count, page, limit, data });
    }

    if (type === 'tasks') {
      let query = supabase
        .from('oneoffice_crm_tasks')
        .select('*', { count: 'exact' });
      
      if (search) query = query.ilike('title', `%${search}%`);
      if (status) query = query.eq('status', status);

      const { data, count, error } = await query
        .order('due_date', { ascending: true })
        .range(offset, offset + limit - 1);
      
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ total: count, page, limit, data });
    }

    if (type === 'products') {
      let query = supabase
        .from('products')
        .select('*', { count: 'exact' });
      
      if (search) {
        query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,barcode.ilike.%${search}%`);
      }
      
      const { data, count, error } = await query
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ total: count, page, limit, data });
    }

    if (type === 'stats') {
      const [custRes, leadsRes, tasksRes, prodRes, syncRes] = await Promise.all([
        supabase.from('oneoffice_crm_customers').select('id, status', { count: 'exact' }),
        supabase.from('oneoffice_crm_leads').select('id, stage, value', { count: 'exact' }),
        supabase.from('oneoffice_crm_tasks').select('id, status', { count: 'exact' }),
        supabase.from('products').select('id', { count: 'exact' }),
        supabase.from('oneoffice_sync_log')
          .select('*')
          .eq('sync_type', 'crm_full')
          .order('started_at', { ascending: false })
          .limit(1),
      ]);

      const totalRevenue = (leadsRes.data || []).reduce((s: number, l: { value: number }) => s + (l.value || 0), 0);
      const lastSync = syncRes.data?.[0] || null;

      return NextResponse.json({
        customers: { total: custRes.count || 0 },
        leads: {
          total: leadsRes.count || 0,
          total_value: totalRevenue,
        },
        tasks: {
          total: tasksRes.count || 0,
          pending: (tasksRes.data || []).filter((t: { status: string }) => t.status !== 'Hoàn thành').length,
        },
        products: {
          total: prodRes.count || 0,
        },
        last_sync: lastSync,
      });
    }

    if (type === 'sync_logs') {
      const { data, error } = await supabase
        .from('oneoffice_sync_log')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: 'type không hợp lệ' }, { status: 400 });

  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── POST: Trigger sync ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const mode  = body.mode  || 'full'; // 'full' | 'delta'
    const tables = body.tables || ['customers', 'leads', 'tasks', 'products'];

    const supabase = getSupabaseAdmin();

    // Ghi log bắt đầu
    const { data: logRow } = await supabase
      .from('oneoffice_sync_log')
      .insert({ sync_type: `crm_${mode}`, status: 'running', started_at: new Date().toISOString() })
      .select()
      .single();
    const logId = logRow?.id;

    const startTime = Date.now();
    const results: Record<string, { fetched: number; upserted: number; errors: number }> = {};

    // Sync Customers
    if (tables.includes('customers')) {
      const rawCustomers = mode === 'delta'
        ? await fetchCustomersSince(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        : await fetchCustomers();
      
      const mapped = rawCustomers.map(mapCustomer).filter(c => c.oneoffice_id !== null);
      const { upserted, errors } = await upsertBatch(supabase, 'oneoffice_crm_customers', mapped, 'oneoffice_id');
      results.customers = { fetched: rawCustomers.length, upserted, errors };
    }

    // Sync Leads
    if (tables.includes('leads')) {
      const rawLeads = mode === 'delta'
        ? await fetchLeadsSince(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        : await fetchLeads();
      
      const mapped = rawLeads.map(mapLead).filter(l => l.oneoffice_id !== null);
      const { upserted, errors } = await upsertBatch(supabase, 'oneoffice_crm_leads', mapped, 'oneoffice_id');
      results.leads = { fetched: rawLeads.length, upserted, errors };
    }

    // Sync Tasks
    if (tables.includes('tasks')) {
      const rawTasks = await fetchCRMTasks();
      const mapped = rawTasks.map(mapTask).filter(t => t.oneoffice_id !== null);
      const { upserted, errors } = await upsertBatch(supabase, 'oneoffice_crm_tasks', mapped, 'oneoffice_id');
      results.tasks = { fetched: rawTasks.length, upserted, errors };
    }

    // Sync Products
    if (tables.includes('products')) {
      const rawProducts = await fetchProducts();
      const mapped = rawProducts.map(mapProduct).filter(t => t.oneoffice_id !== null);
      const { upserted, errors } = await upsertBatch(supabase, 'products', mapped, 'oneoffice_id');
      results.products = { fetched: rawProducts.length, upserted, errors };
    }

    const duration_ms = Date.now() - startTime;
    const totalErrors = Object.values(results).reduce((s, r) => s + r.errors, 0);
    const totalUpserted = Object.values(results).reduce((s, r) => s + r.upserted, 0);
    const totalFetched = Object.values(results).reduce((s, r) => s + r.fetched, 0);

    // Cập nhật log
    if (logId) {
      await supabase.from('oneoffice_sync_log').update({
        status: totalErrors === 0 ? 'success' : 'partial',
        fetched: totalFetched,
        upserted: totalUpserted,
        errors: totalErrors,
        duration_ms,
        finished_at: new Date().toISOString(),
      }).eq('id', logId);
    }

    return NextResponse.json({
      success: true,
      mode,
      duration_ms,
      results,
    });

  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
