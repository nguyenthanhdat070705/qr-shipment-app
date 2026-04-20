import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { PRODUCT_CONFIG } from '@/config/product.config';

/**
 * GET /api/sync-sheets
 * Returns all products and export confirmations as JSON for Google Sheets sync.
 * Protected by a simple API key (SYNC_API_KEY env var).
 *
 * Query params:
 *   ?table=products         → returns products
 *   ?table=exports          → returns export_confirmations
 *   ?table=members          → returns members
 *   ?table=all              → returns all (default)
 *   &key=<SYNC_API_KEY>     → required for authentication
 */
export async function GET(req: NextRequest) {
  // ── Auth check ──────────────────────────────────────────────
  const apiKey = req.nextUrl.searchParams.get('key');
  const expectedKey = process.env.SYNC_API_KEY;

  if (!expectedKey) {
    return NextResponse.json(
      { error: 'SYNC_API_KEY not configured on server.' },
      { status: 500 }
    );
  }

  if (apiKey !== expectedKey) {
    return NextResponse.json(
      { error: 'Unauthorized. Provide ?key=<SYNC_API_KEY>' },
      { status: 401 }
    );
  }

  // ── Fetch data ──────────────────────────────────────────────
  const table = req.nextUrl.searchParams.get('table') || 'all';
  const supabase = getSupabaseAdmin();
  const result: Record<string, unknown> = { synced_at: new Date().toISOString() };

  try {
    // Products
    if (table === 'products' || table === 'all') {
      const { data: products, error } = await supabase
        .from(PRODUCT_CONFIG.TABLE_NAME as string)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw new Error(`Products: ${error.message}`);

      result.products = (products || []).map((p: Record<string, unknown>) => ({
        id: p.id,
        product_code: p.product_code,
        name: p.name,
        nhom_san_pham: p.nhom_san_pham || '',
        muc_dich_su_dung: p.muc_dich_su_dung || '',
        gia_ban: p.gia_ban || '',
        ton_kho: p.ton_kho || '',
        serial_no: p.serial_no || '',
        status: p.status || '',
        description: p.description || '',
        created_at: p.created_at || '',
        updated_at: p.updated_at || '',
      }));
      result.products_count = (products || []).length;
    }

    // Export Confirmations
    if (table === 'exports' || table === 'all') {
      const { data: exports, error } = await supabase
        .from(PRODUCT_CONFIG.CONFIRMATION_TABLE as string)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw new Error(`Exports: ${error.message}`);

      result.exports = (exports || []).map((e: Record<string, unknown>) => ({
        id: e.id,
        ma_san_pham: e.ma_san_pham || '',
        ma_don_hang: e.ma_don_hang || '',
        nguoi_xuat: e.nguoi_xuat || '',
        ghi_chu: e.ghi_chu || '',
        created_at: e.created_at || '',
      }));
      result.exports_count = (exports || []).length;
    }

    // Members
    if (table === 'members' || table === 'all') {
      const { data: members, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw new Error(`Members: ${error.message}`);

      result.members = (members || []).map((m: Record<string, unknown>) => ({
        id: m.id,
        uuid: m.uuid,
        member_code: m.member_code || '',
        full_name: m.full_name || '',
        id_number: m.id_number || '',
        phone: m.phone || '',
        email: m.email || '',
        address: m.address || '',
        registered_date: m.registered_date || '',
        expiry_date: m.expiry_date || '',
        status: m.status || '',
        tier: m.tier || '',
        created_at: m.created_at || '',
        updated_at: m.updated_at || '',
      }));
      result.members_count = (members || []).length;
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
