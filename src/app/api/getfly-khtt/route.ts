import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { normalizePhone, toAmount, type KhttRecord } from '@/lib/khtt';

export const dynamic = 'force-dynamic';

// ── Rate limiting (giống /api/membership/lookup) ──
const rateLimitStore: Record<string, { count: number; resetAt: number }> = {};
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  if (!rateLimitStore[ip] || rateLimitStore[ip].resetAt < now) {
    rateLimitStore[ip] = { count: 1, resetAt: now + 60_000 };
    return true;
  }
  return ++rateLimitStore[ip].count <= 60;
}

const SELECT_COLS =
  'getfly_order_id, order_code, order_date, order_status, customer_code, customer_name, ' +
  'customer_phone, package_name, total_value, paid_amount, remaining_amount, ' +
  'beneficiary_name, beneficiary_phone, person_in_charge, expiry_date';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function toRecord(r: Record<string, unknown>): KhttRecord {
  return {
    getfly_order_id: String(r.getfly_order_id),
    order_code: (r.order_code as string) ?? null,
    order_date: (r.order_date as string) ?? null,
    order_status: (r.order_status as string) ?? null,
    customer_code: (r.customer_code as string) ?? null,
    customer_name: (r.customer_name as string) ?? null,
    customer_phone: (r.customer_phone as string) ?? null,
    package_name: (r.package_name as string) ?? null,
    total_value: toAmount(r.total_value),
    paid_amount: toAmount(r.paid_amount),
    remaining_amount: toAmount(r.remaining_amount),
    beneficiary_name: (r.beneficiary_name as string) ?? null,
    beneficiary_phone: (r.beneficiary_phone as string) ?? null,
    person_in_charge: (r.person_in_charge as string) ?? null,
    expiry_date: (r.expiry_date as string) ?? null,
  };
}

// ═══════════════════════════════════════════════════════
// GET: tra cứu KHTT
//   • ?phone=...  → tra cứu công khai theo SĐT (khách/CSKH)
//   • ?q=...      → tìm nội bộ (tên / mã KH / SĐT / mã đơn)
//   • (không tham số) → toàn bộ danh sách (trang quản lý)
// ═══════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.' },
        { status: 429, headers: CORS },
      );
    }

    const phone = req.nextUrl.searchParams.get('phone')?.trim();
    const q = req.nextUrl.searchParams.get('q')?.trim();
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '200', 10), 500);

    const supabase = getSupabaseAdmin();
    let query = supabase.from('getfly_khtt_orders').select(SELECT_COLS);

    if (phone !== undefined) {
      // Tra cứu công khai: bắt buộc nhập SĐT.
      if (!phone) {
        return NextResponse.json(
          { error: 'Vui lòng nhập số điện thoại.' },
          { status: 400, headers: CORS },
        );
      }
      const norm = normalizePhone(phone);
      const values = Array.from(new Set([phone, norm].filter(Boolean)));
      query = query.or(
        values
          .flatMap((v) => [`customer_phone.eq.${v}`, `beneficiary_phone.eq.${v}`])
          .join(','),
      );
    } else if (q) {
      query = query.or(
        [
          `customer_name.ilike.%${q}%`,
          `customer_code.ilike.%${q}%`,
          `customer_phone.ilike.%${q}%`,
          `order_code.ilike.%${q}%`,
          `beneficiary_name.ilike.%${q}%`,
        ].join(','),
      );
    }

    const { data, error } = await query.order('order_date', { ascending: false }).limit(limit);

    if (error) {
      console.error('[KHTT Lookup] DB error:', error.message);
      return NextResponse.json(
        { error: 'Lỗi hệ thống. Vui lòng thử lại.' },
        { status: 500, headers: CORS },
      );
    }

    const results = (data || []).map((r) => toRecord(r as Record<string, unknown>));

    if (phone !== undefined && results.length === 0) {
      return NextResponse.json(
        { found: false, message: 'Không tìm thấy khách hàng Trăm Tuổi.' },
        { status: 200, headers: CORS },
      );
    }

    return NextResponse.json(
      { found: results.length > 0, total: results.length, results },
      { status: 200, headers: CORS },
    );
  } catch (err) {
    console.error('[KHTT Lookup] Error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500, headers: CORS });
  }
}
