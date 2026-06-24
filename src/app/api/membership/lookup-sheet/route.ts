import { NextRequest, NextResponse } from 'next/server';
import {
  fetchHopDongBanMembers,
  findByPhone,
  matchCccd,
  type SheetMember,
} from '@/lib/hopDongBanSheet';

export const dynamic = 'force-dynamic';

// ── Rate limiting (chặn dò mật khẩu CCCD) ────────────────────
const rateLimitStore: Record<string, { count: number; resetAt: number }> = {};
function checkRateLimit(ip: string, max = 30): boolean {
  const now = Date.now();
  if (!rateLimitStore[ip] || rateLimitStore[ip].resetAt < now) {
    rateLimitStore[ip] = { count: 1, resetAt: now + 60_000 };
    return true;
  }
  return ++rateLimitStore[ip].count <= max;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Trạng thái HĐ (cột E) → nhãn + màu hiển thị trên thẻ.
function statusOf(m: SheetMember): { key: string; label: string; color: string } {
  const s = m.status_raw.toLowerCase();
  const todayIso = new Date().toISOString().slice(0, 10);
  if (s.includes('hủy') || s.includes('huỷ')) return { key: 'terminated', label: 'Đã huỷ', color: 'gray' };
  if (m.expiry_date && m.expiry_date < todayIso) return { key: 'expired', label: 'Hết hạn', color: 'red' };
  if (s.includes('chờ')) return { key: 'pending', label: 'Chờ duyệt', color: 'yellow' };
  if (s.includes('hoàn thành')) return { key: 'completed', label: 'Đã hoàn thành', color: 'blue' };
  if (s.includes('duyệt')) return { key: 'active', label: 'Đang hiệu lực', color: 'green' };
  return { key: 'active', label: m.status_raw || 'Đang hiệu lực', color: 'green' };
}

function toCard(m: SheetMember) {
  const st = statusOf(m);
  return {
    id: m.member_code,
    member_code: m.member_code,
    full_name: m.full_name,
    registered_date: m.sign_date, // Ngày ký kết ← Ngày hiệu lực (cột I)
    expiry_date: m.expiry_date, // cột J
    address: m.address, // cột U
    beneficiary_1: m.beneficiary_1, // cột CC
    beneficiary_2: m.beneficiary_2, // cột CG
    consultant_name: m.consultant_name, // cột Y
    contract_value: m.paid_amount, // Số tiền đã đóng ← cột AZ
    status: st.key,
    status_label: st.label,
    status_color: st.color,
    lookup_source: 'hop_dong_ban_sheet',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.' }, { status: 429, headers: CORS });
    }

    const phone = req.nextUrl.searchParams.get('phone')?.trim();
    const cccd = req.nextUrl.searchParams.get('cccd')?.trim();

    if (!phone) {
      return NextResponse.json({ error: 'Vui lòng nhập số điện thoại.' }, { status: 400, headers: CORS });
    }

    let rows: SheetMember[];
    try {
      rows = await fetchHopDongBanMembers();
    } catch (e) {
      console.error('[lookup-sheet] fetch error:', e);
      return NextResponse.json({ error: 'Không đọc được dữ liệu hợp đồng. Vui lòng thử lại sau.' }, { status: 502, headers: CORS });
    }

    const matches = findByPhone(rows, phone);

    // ── Bước 1: chỉ có SĐT → KHÔNG trả thông tin, yêu cầu nhập mật khẩu CCCD ──
    if (!cccd) {
      if (matches.length === 0) {
        return NextResponse.json({ found: false, locked: false, message: 'Không tìm thấy hội viên với số điện thoại này.' }, { status: 200, headers: CORS });
      }
      return NextResponse.json({ found: true, locked: true, count: matches.length }, { status: 200, headers: CORS });
    }

    // ── Bước 2: có SĐT + CCCD → mở khoá nếu CCCD khớp ──
    if (matches.length === 0) {
      return NextResponse.json({ found: false, locked: false, message: 'Không tìm thấy hội viên với số điện thoại này.' }, { status: 200, headers: CORS });
    }
    const unlocked = matches.filter((m) => matchCccd(m, cccd));
    if (unlocked.length === 0) {
      return NextResponse.json({ found: true, locked: true, wrongPassword: true, count: matches.length, message: 'CCCD không đúng. Vui lòng nhập đúng CCCD của hội viên.' }, { status: 200, headers: CORS });
    }

    return NextResponse.json({
      found: true,
      locked: false,
      total: unlocked.length,
      results: unlocked.map(toCard),
    }, { status: 200, headers: CORS });
  } catch (err) {
    console.error('[lookup-sheet] error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500, headers: CORS });
  }
}
