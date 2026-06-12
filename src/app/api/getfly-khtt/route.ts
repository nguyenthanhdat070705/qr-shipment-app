/**
 * GET /api/getfly-khtt — Tra cứu Khách Hàng Trăm Tuổi (KHTT)
 *
 * Nguồn dữ liệu MỚI: bảng `crm_don_ban` (mirror Đơn Bán từ Google Sheet), thay cho
 * bảng cũ `getfly_khtt_orders`. KHTT = đơn bán có mã chứa "KHTT" + đang "Chờ duyệt"
 * (status = 1). Tên khách + người thụ hưởng lấy từ chính đơn và join `crm_khach_hang`.
 *
 *   • ?phone=...  → tra cứu công khai theo SĐT (khách / người thụ hưởng)
 *   • ?q=...      → tìm nội bộ (tên / mã KH / SĐT / mã đơn)
 *   • (không tham số) → toàn bộ danh sách KHTT (trang quản lý)
 *
 * Giữ NGUYÊN response shape ({ found, total, results: KhttRecord[] }) để các UI công khai
 * (/embed/khtt, /tra-cuu) không phải sửa.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { phoneKey, formatPhone, toAmount, isKhttOrderCode, KHTT_STATUS_WAITING, KHTT_STATUS_WAITING_LABEL, type KhttRecord } from '@/lib/khtt';

export const dynamic = 'force-dynamic';

// ── Rate limiting ──
const rateLimitStore: Record<string, { count: number; resetAt: number }> = {};
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  if (!rateLimitStore[ip] || rateLimitStore[ip].resetAt < now) {
    rateLimitStore[ip] = { count: 1, resetAt: now + 60_000 };
    return true;
  }
  return ++rateLimitStore[ip].count <= 60;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

type Json = Record<string, string>;

/** Dựng KhttRecord từ 1 đơn bán + thông tin tài khoản (join). */
function buildRecord(order: Json, acc: Json | undefined): KhttRecord {
  const total = toAmount(order.real_amount);
  const paid = toAmount(order.f_amount);
  const accountName = (acc?.account_name || order.contact_name || '').trim() || null;
  const benName = (order.contact_name || acc?.lh_last_name || acc?.account_name || '').trim() || null;
  const benPhoneRaw = (order.contact_phone || acc?.lh_phone_mobile || acc?.lh_phone_home || '').trim();
  return {
    getfly_order_id: String(order.id ?? ''),
    order_code: order.order_code || null,
    order_date: order.order_date || null,
    order_status: order.status_label || KHTT_STATUS_WAITING_LABEL,
    customer_code: order.account_code || null,
    customer_name: accountName,
    customer_phone: order.account_phone ? formatPhone(order.account_phone) : null,
    package_name: order.sp_product_name || null,
    total_value: total,
    paid_amount: paid,
    remaining_amount: Math.max(0, total - paid),
    beneficiary_name: benName,
    beneficiary_phone: benPhoneRaw ? formatPhone(benPhoneRaw) : null,
    person_in_charge: order.assigned_user_name || null,
    expiry_date: null, // Sheet Đơn Bán không có ngày hết hạn KHTT
  };
}

function phoneMatches(rec: KhttRecord, keys: Set<string>): boolean {
  const cands = [rec.customer_phone, rec.beneficiary_phone].filter(Boolean) as string[];
  return cands.some((p) => keys.has(phoneKey(p)));
}

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

    if (phone !== undefined && !phone) {
      return NextResponse.json({ error: 'Vui lòng nhập số điện thoại.' }, { status: 400, headers: CORS });
    }

    const supabase = getSupabaseAdmin();

    // 1) Lấy các đơn KHTT đang hoạt động (mã chứa "KHTT" + Chờ duyệt).
    const { data: orderRows, error: oErr } = await supabase
      .from('crm_don_ban')
      .select('id, data')
      .ilike('data->>order_code', '%KHTT%')
      .eq('data->>status', KHTT_STATUS_WAITING)
      .limit(2000);

    if (oErr) {
      console.error('[KHTT Lookup] DB error:', oErr.message);
      return NextResponse.json({ error: 'Lỗi hệ thống. Vui lòng thử lại.' }, { status: 500, headers: CORS });
    }

    const orders = (orderRows ?? []).map((r) => (r.data ?? {}) as Json).filter((d) => isKhttOrderCode(d.order_code));

    // 2) Join tài khoản (crm_khach_hang.id = đơn.account_id) để lấy tên khách hàng.
    const accountIds = Array.from(new Set(orders.map((d) => String(d.account_id || '')).filter(Boolean)));
    const accMap = new Map<string, Json>();
    if (accountIds.length) {
      const { data: accRows } = await supabase.from('crm_khach_hang').select('id, data').in('id', accountIds);
      for (const a of accRows ?? []) accMap.set(String(a.id), (a.data ?? {}) as Json);
    }

    // 3) Dựng KhttRecord + lọc theo phone/q.
    let results = orders.map((d) => buildRecord(d, accMap.get(String(d.account_id || ''))));

    if (phone !== undefined) {
      const keys = new Set([phoneKey(phone!)].filter(Boolean));
      results = results.filter((r) => phoneMatches(r, keys));
    } else if (q) {
      const needle = q.toLowerCase();
      results = results.filter((r) =>
        [r.customer_name, r.customer_code, r.customer_phone, r.order_code, r.beneficiary_name]
          .some((v) => String(v ?? '').toLowerCase().includes(needle)),
      );
    }

    results.sort((a, b) => String(b.order_date ?? '').localeCompare(String(a.order_date ?? '')));
    results = results.slice(0, limit);

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
