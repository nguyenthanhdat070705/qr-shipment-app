/**
 * GET /api/zalo/logs
 * Lấy lịch sử gửi ZNS (welcome + birthday)
 * POST /api/zalo/logs — test-send hoặc manual trigger
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = req.nextUrl;
    const type = searchParams.get('type');       // 'welcome' | 'birthday' | null (all)
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('zns_log')
      .select('*', { count: 'exact' })
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) query = query.eq('message_type', type);

    const { data, error, count } = await query;

    if (error) throw error;

    // Stats tổng hợp
    const { data: stats } = await supabase
      .from('zns_log')
      .select('message_type, status');

    const summary = {
      total: count || 0,
      welcome_sent: stats?.filter(r => r.message_type === 'welcome' && r.status === 'sent').length || 0,
      birthday_sent: stats?.filter(r => r.message_type === 'birthday' && r.status === 'sent').length || 0,
      failed: stats?.filter(r => r.status === 'failed').length || 0,
    };

    return NextResponse.json({ logs: data, summary, page, limit, total: count });
  } catch (err) {
    console.error('[ZNS Logs] Lỗi:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}
