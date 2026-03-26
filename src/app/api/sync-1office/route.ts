/**
 * POST /api/sync-1office
 * GET  /api/sync-1office?table=products (sync 1 bảng)
 *
 * Trigger thủ công hoặc từ cron job (Vercel / external)
 * Bảo vệ bằng SYNC_API_KEY header
 */

import { NextRequest, NextResponse } from 'next/server';
import { runFullSync } from '@/lib/1office/sync';

const ALLOWED_TABLES = [
  'products',
  'warehouses_1office',
  'inventory_1office',
  'goods_receipts_1office',
  'sale_contracts',
  'sale_quotations',
  'sale_orders',
  'stocktakes',
];

function authorized(req: NextRequest): boolean {
  // Kiểm tra SYNC_API_KEY (từ header hoặc query param)
  const headerKey = req.headers.get('x-sync-api-key') || req.headers.get('authorization');
  const queryKey = req.nextUrl.searchParams.get('api_key');
  const expected = process.env.SYNC_API_KEY;

  if (!expected) return true; // Chế độ dev: không cần key

  const provided = headerKey?.replace(/^Bearer\s+/, '') || queryKey;
  return provided === expected;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const table = req.nextUrl.searchParams.get('table');
  const tables = table
    ? [table].filter(t => ALLOWED_TABLES.includes(t))
    : undefined;

  if (table && tables?.length === 0) {
    return NextResponse.json(
      { error: `Bảng không hợp lệ: ${table}. Chọn từ: ${ALLOWED_TABLES.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const result = await runFullSync({ tables });
    return NextResponse.json(result, { status: result.success ? 200 : 207 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}

// Tắt timeout mặc định của Next.js (sync có thể mất vài phút)
export const maxDuration = 300; // 5 phút (Vercel Pro)
