import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * GET  /api/notifications?role=xxx       → Get notifications for a role
 * PATCH /api/notifications               → Mark as read / dismiss
 */

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role');
  const unreadOnly = searchParams.get('unread') === 'true';

  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (role) {
    // admin sees both 'admin' and 'procurement' notifications
    if (role === 'admin') {
      query = query.in('receiver_role', ['admin', 'procurement']);
    } else {
      query = query.eq('receiver_role', role);
    }
  }

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count unread for badge
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false)
    .in('receiver_role', role === 'admin' ? ['admin', 'procurement'] : [role || '']);

  return NextResponse.json({
    data: data || [],
    unread_count: unreadCount || 0,
  });
}

export async function PATCH(req: NextRequest) {
  const supabase = getSupabaseAdmin();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { id, action } = body as { id?: string; action?: 'read' | 'dismiss' | 'read_all' };

  if (action === 'read_all') {
    const role = body.role as string;
    if (role) {
      const roles = role === 'admin' ? ['admin', 'procurement'] : [role];
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('receiver_role', roles)
        .eq('is_read', false);
    }
    return NextResponse.json({ success: true });
  }

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  if (action === 'dismiss') {
    await supabase.from('notifications').delete().eq('id', id);
  } else {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  }

  return NextResponse.json({ success: true });
}
