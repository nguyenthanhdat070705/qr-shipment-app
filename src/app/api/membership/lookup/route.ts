import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// Rate limiting store (in-memory, resets on deploy)
const rateLimitStore: Record<string, { count: number; resetAt: number }> = {};

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10;

  if (!rateLimitStore[ip] || rateLimitStore[ip].resetAt < now) {
    rateLimitStore[ip] = { count: 1, resetAt: now + windowMs };
    return true;
  }
  rateLimitStore[ip].count++;
  return rateLimitStore[ip].count <= maxRequests;
}

function maskPhone(phone: string): string {
  if (!phone) return '';
  if (phone.length <= 4) return '****';
  return phone.slice(0, 3) + '****' + phone.slice(-3);
}

function maskEmail(email: string): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return '****';
  const masked = local.length > 2 ? local[0] + '***' + local[local.length - 1] : '***';
  return `${masked}@${domain}`;
}

export async function GET(req: NextRequest) {
  try {
    // Rate limiting by IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.' },
        { status: 429 }
      );
    }

    const query = req.nextUrl.searchParams.get('q')?.trim();
    const type = req.nextUrl.searchParams.get('type') || 'auto'; // 'phone' | 'code' | 'auto'

    if (!query || query.length < 3) {
      return NextResponse.json(
        { error: 'Vui lòng nhập ít nhất 3 ký tự để tra cứu.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    let dbQuery = supabase
      .from('members')
      .select('id, member_code, full_name, phone, email, status, registered_date, expiry_date, branch, service_package, consultant_name');

    // Determine search type
    const isPhone = type === 'phone' || (type === 'auto' && /^[0-9+\s-]{8,15}$/.test(query.replace(/\s/g, '')));
    const isMemberCode = type === 'code' || (type === 'auto' && !isPhone);

    if (isPhone) {
      // Normalize phone: strip spaces, dashes
      const normalized = query.replace(/[\s-]/g, '');
      dbQuery = dbQuery.ilike('phone', `%${normalized}%`);
    } else {
      // Search by member code (exact or partial)
      dbQuery = dbQuery.ilike('member_code', `%${query}%`);
    }

    const { data, error } = await dbQuery.limit(5);

    if (error) {
      console.error('Lookup error:', error);
      return NextResponse.json({ error: 'Lỗi hệ thống. Vui lòng thử lại.' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ found: false, message: 'Không tìm thấy hội viên với thông tin này.' });
    }

    // Map status to Vietnamese
    const statusMap: Record<string, { label: string; color: string }> = {
      active:     { label: 'Đang hoạt động', color: 'green' },
      pending:    { label: 'Chờ xác nhận',   color: 'yellow' },
      expired:    { label: 'Hết hạn',         color: 'red' },
      terminated: { label: 'Đã kết thúc',     color: 'gray' },
    };

    const packageMap: Record<string, string> = {
      tieu_chuan: 'Tiêu Chuẩn',
      cao_cap:    'Cao Cấp',
      dac_biet:   'Đặc Biệt',
      gia_dinh:   'Gói Gia Đình',
    };

    // Return public-safe data (mask sensitive fields)
    const results = data.map((m) => {
      const statusInfo = statusMap[m.status] || { label: m.status, color: 'gray' };
      return {
        id: m.id,
        member_code: m.member_code,
        full_name: m.full_name,
        phone_masked: maskPhone(m.phone || ''),
        email_masked: maskEmail(m.email || ''),
        status: m.status,
        status_label: statusInfo.label,
        status_color: statusInfo.color,
        registered_date: m.registered_date,
        expiry_date: m.expiry_date,
        branch: m.branch,
        service_package: m.service_package,
        service_package_label: packageMap[m.service_package] || m.service_package,
        consultant_name: m.consultant_name,
      };
    });

    return NextResponse.json({ found: true, total: results.length, results });
  } catch (err) {
    console.error('Lookup error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
