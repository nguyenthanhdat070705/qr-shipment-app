import { NextRequest, NextResponse } from 'next/server';
import { evaluateReorderAlerts } from '@/lib/reorder/evaluator';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: 'Cron is not configured' }, { status: 503 });
  if (authHeader !== `Bearer ${cronSecret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const summary = await evaluateReorderAlerts({ senderEmail: 'system' });
    return NextResponse.json({ success: true, scheduled_at: new Date().toISOString(), summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Cron] Reorder alerts failed:', message);
    return NextResponse.json({ error: message, scheduled_at: new Date().toISOString() }, { status: 500 });
  }
}

