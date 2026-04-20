import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// ── Rate Limiting ────────────────────────────────────────────
const rateLimitStore: Record<string, { count: number; resetAt: number }> = {};
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  if (!rateLimitStore[ip] || rateLimitStore[ip].resetAt < now) {
    rateLimitStore[ip] = { count: 1, resetAt: now + 60_000 };
    return true;
  }
  return ++rateLimitStore[ip].count <= 30; // 30 req/min cho internal use
}

// ── Helpers ──────────────────────────────────────────────────
function maskPhone(phone: string): string {
  if (!phone || phone.length <= 4) return '****';
  return phone.slice(0, 3) + '****' + phone.slice(-3);
}
function maskEmail(email: string): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return '****';
  return (local.length > 2 ? local[0] + '***' + local[local.length - 1] : '***') + '@' + domain;
}
function maskIdNumber(id: string): string {
  if (!id || id.length <= 4) return '****';
  return id.slice(0, 3) + '****' + id.slice(-3);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(req: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    // Rate limit by IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.' }, { status: 429, headers: corsHeaders });
    }

    const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '10'), 20);

    if (!q || q.length < 2) {
      return NextResponse.json({ error: 'Vui lòng nhập ít nhất 2 ký tự.' }, { status: 400, headers: corsHeaders });
    }

    const supabase = getSupabaseAdmin();

    const searchType = req.nextUrl.searchParams.get('type') || 'auto';

    // ── Smart detect search type ─────────────────────────────
    // Chuỗi làm sạch (bỏ khoảng trắng, dấu gạch ngang)
    const clean = q.replace(/[\s\-\.]/g, '');
    let isPhone   = false;
    let isCCCD    = false;
    let isMemCode = false;
    let isEmail   = false;

    if (searchType === 'auto') {
      isPhone   = /^(0|\+84)[0-9]{7,10}$/.test(clean);
      isCCCD    = /^[0-9]{9}$/.test(clean) || /^[0-9]{12}$/.test(clean);
      isMemCode = /^(Mem|mem|MEM)[0-9]/i.test(q);
      isEmail   = q.includes('@');
    } else {
      isPhone   = searchType === 'phone';
      isCCCD    = searchType === 'cccd';
      isMemCode = searchType === 'member_code';
      isEmail   = searchType === 'email';
    }

    let data: Record<string, unknown>[] | null = null;
    let error = null;

    if (isPhone) {
      // Tìm chính xác theo SĐT
      ({ data, error } = await supabase
        .from('members')
        .select('id, member_code, full_name, phone, email, id_number, status, registered_date, expiry_date, branch, service_package, consultant_name, address, notes, contract_value')
        .or(`phone.ilike.%${clean}%,phone.ilike.%${q}%`)
        .eq('status', 'active')
        .limit(limit));
    } else if (isCCCD) {
      // Tìm theo CCCD/CMND (cột id_number)
      ({ data, error } = await supabase
        .from('members')
        .select('id, member_code, full_name, phone, email, id_number, status, registered_date, expiry_date, branch, service_package, consultant_name, address, notes, contract_value')
        .ilike('id_number', `%${clean}%`)
        .limit(limit));
    } else if (isMemCode) {
      // Tìm theo mã hội viên
      ({ data, error } = await supabase
        .from('members')
        .select('id, member_code, full_name, phone, email, id_number, status, registered_date, expiry_date, branch, service_package, consultant_name, address, notes, contract_value')
        .ilike('member_code', `%${clean}%`)
        .limit(limit));
    } else if (isEmail) {
      // Tìm theo email
      ({ data, error } = await supabase
        .from('members')
        .select('id, member_code, full_name, phone, email, id_number, status, registered_date, expiry_date, branch, service_package, consultant_name, address, notes, contract_value')
        .ilike('email', `%${q}%`)
        .limit(limit));
    } else {
      // ── Full-text search trên tất cả các trường quan trọng ──
      // Tìm theo: tên, mã HV, SĐT, CCCD, email, địa chỉ, NV tư vấn
      ({ data, error } = await supabase
        .from('members')
        .select('id, member_code, full_name, phone, email, id_number, status, registered_date, expiry_date, branch, service_package, consultant_name, address, notes, contract_value')
        .or([
          `full_name.ilike.%${q}%`,
          `member_code.ilike.%${q}%`,
          `phone.ilike.%${q}%`,
          `id_number.ilike.%${q}%`,
          `email.ilike.%${q}%`,
          `address.ilike.%${q}%`,
          `consultant_name.ilike.%${q}%`,
        ].join(','))
        .order('registered_date', { ascending: false })
        .limit(limit));
    }

    if (error) {
      console.error('[Lookup] DB error:', error.message);
      return NextResponse.json({ error: 'Lỗi hệ thống. Vui lòng thử lại.' }, { status: 500, headers: corsHeaders });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ found: false, message: 'Không tìm thấy hội viên.' }, { status: 200, headers: corsHeaders });
    }

    // ── Response mapping ──────────────────────────────────────
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

    // Detect matched field để UI highlight
    function detectMatchedField(m: Record<string, unknown>): string {
      const lq = q.toLowerCase();
      if (String(m.phone || '').toLowerCase().includes(clean))       return 'phone';
      if (String(m.id_number || '').toLowerCase().includes(clean))   return 'id_number';
      if (String(m.member_code || '').toLowerCase().includes(lq))    return 'member_code';
      if (String(m.full_name || '').toLowerCase().includes(lq))      return 'full_name';
      if (String(m.email || '').toLowerCase().includes(lq))          return 'email';
      if (String(m.address || '').toLowerCase().includes(lq))        return 'address';
      if (String(m.consultant_name || '').toLowerCase().includes(lq)) return 'consultant_name';
      return 'unknown';
    }

    const results = data.map((m) => {
      const statusInfo = statusMap[String(m.status)] || { label: String(m.status), color: 'gray' };
      const matchedField = detectMatchedField(m);
      return {
        id: m.id,
        member_code: m.member_code,
        full_name: m.full_name,
        phone_masked:    maskPhone(String(m.phone || '')),
        email_masked:    maskEmail(String(m.email || '')),
        id_number_masked: maskIdNumber(String(m.id_number || '')),
        status: m.status,
        status_label: statusInfo.label,
        status_color: statusInfo.color,
        registered_date: m.registered_date,
        expiry_date: m.expiry_date,
        branch: m.branch,
        service_package: m.service_package,
        service_package_label: packageMap[String(m.service_package)] || String(m.service_package || '—'),
        consultant_name: m.consultant_name,
        address: m.address,
        notes: m.notes,
        contract_value: m.contract_value,
        matched_field: matchedField,
        // Trả về phần highlight an toàn (không lộ dữ liệu nhạy cảm)
        matched_preview: matchedField === 'address'
          ? String(m.address || '').slice(0, 50)
          : matchedField === 'consultant_name'
            ? String(m.consultant_name || '')
            : undefined,
      };
    });

    return NextResponse.json({
      found: true,
      total: results.length,
      query: q,
      search_type: searchType,
      results,
    }, { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error('[Lookup] Error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500, headers: corsHeaders });
  }
}
