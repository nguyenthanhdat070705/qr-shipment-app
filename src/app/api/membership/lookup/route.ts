import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { isMembershipContract, dedupeMembershipsByCode } from '@/lib/membership';
import { loadCrmContracts } from '@/lib/crmContracts';
import { phoneKey } from '@/lib/khtt';

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
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('84') ? `0${digits.slice(2)}` : digits;
}
function toIsoDate(value: unknown): string | null {
  const text = String(value || '').trim();
  if (!text) return null;

  const ddmmyyyy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}
function mapContractStatusToMemberStatus(status: unknown, expiryDate: unknown): string {
  if (String(status || '') === 'Đã hủy') return 'terminated';
  const expiryIso = toIsoDate(expiryDate);
  if (expiryIso && expiryIso < new Date().toISOString().slice(0, 10)) return 'expired';
  return 'active';
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

    const cccd = req.nextUrl.searchParams.get('cccd')?.trim();
    const phone = req.nextUrl.searchParams.get('phone')?.trim();
    const q = req.nextUrl.searchParams.get('q')?.trim();
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '10'), 20);

    // Nếu public search: có cccd hoặc có phone
    const isPublicSearch = cccd !== undefined || phone !== undefined;

    if (isPublicSearch) {
      if (!cccd && !phone) {
        return NextResponse.json({ error: 'Vui lòng nhập CCCD hoặc Số điện thoại.' }, { status: 400, headers: corsHeaders });
      }
    } else {
      // Nếu admin search: phải có q
      if (!q || q.length < 2) {
        return NextResponse.json({ error: 'Vui lòng nhập ít nhất 2 ký tự.' }, { status: 400, headers: corsHeaders });
      }
    }

    const supabase = getSupabaseAdmin();
    let data: Record<string, unknown>[] | null = null;
    let error = null;

    if (isPublicSearch) {
      // ── Nguồn chính: hợp đồng membership hợp lệ trong getfly_contracts ──
      // Một khách hàng có thể có nhiều hợp đồng (membership, BĐS, KHTT…),
      // nên chỉ nhận các hợp đồng thoả ĐỦ điều kiện hội viên trăm tuổi:
      //   mã MBS + trạng thái "Đã duyệt" + giá trị 2.160.000đ.
      // Trả về TẤT CẢ membership khớp (mỗi người thụ hưởng là 1 hợp đồng).
      // Nguồn MỚI: bảng crm_hop_dong_ban (mirror Sheet) → chuẩn hoá → lọc membership.
      let memberships: Awaited<ReturnType<typeof loadCrmContracts>> = [];
      try {
        const all = await loadCrmContracts(supabase);
        memberships = all.filter(isMembershipContract);
      } catch (e) {
        error = { message: e instanceof Error ? e.message : String(e) };
      }

      if (!error) {
        if (cccd) {
          const cset = new Set([phoneKey(cccd), cccd.replace(/\D/g, '')].filter(Boolean));
          memberships = memberships.filter((c) =>
            [c.beneficiary_vneid_1, c.beneficiary_vneid_2, c.beneficiary_phone_1, c.beneficiary_phone_2]
              .some((v) => v && (cset.has(String(v)) || cset.has(phoneKey(v)))),
          );
        } else if (phone) {
          const pk = phoneKey(phone);
          memberships = memberships.filter((c) =>
            [c.customer_phone, c.beneficiary_phone_1, c.beneficiary_phone_2]
              .some((v) => v && phoneKey(v) === pk),
          );
        }
      }

      if (!error && memberships.length > 0) {
        // Gộp các dòng trùng mã MBS (giữ bản sync mới nhất), rồi sắp xếp mới → cũ.
        const uniqueContracts = dedupeMembershipsByCode(memberships).sort((a, b) =>
          String(b.effective_date ?? '').localeCompare(String(a.effective_date ?? '')),
        );
        data = uniqueContracts.map((contract) => ({
          id: `contract-${contract.getfly_contract_id}`,
          member_code: contract.source_contract_code || contract.contract_name,
          full_name: contract.customer_name,
          phone: contract.customer_phone,
          email: null,
          id_number: null,
          status: mapContractStatusToMemberStatus(contract.contract_status, contract.expiry_date),
          registered_date: toIsoDate(contract.effective_date),
          expiry_date: toIsoDate(contract.expiry_date),
          branch: null,
          service_package: null,
          consultant_name: contract.person_in_charge,
          address: contract.beneficiary_address_1 || contract.beneficiary_address_2,
          notes: contract.beneficiary_name_1,
          beneficiary_name_2: contract.beneficiary_name_2,
          contract_value: contract.paid_amount,
          lookup_source: 'getfly_membership',
        }));
      } else {
        // ── Fallback: bảng members (legacy) khớp chính xác CCCD/SĐT ──
        let query = supabase
          .from('members')
          .select('id, member_code, full_name, phone, email, id_number, status, registered_date, expiry_date, branch, service_package, consultant_name, address, notes, contract_value');

        if (cccd) {
          query = query.eq('id_number', cccd);
        } else if (phone) {
          const np = normalizePhone(phone);
          query = np && np !== phone
            ? query.or(`phone.eq.${phone},phone.eq.${np}`)
            : query.eq('phone', phone);
        }

        ({ data, error } = await query
          .order('registered_date', { ascending: false })
          .limit(1));
      }
    } else {
      // Admin backoffice search
      const searchType = req.nextUrl.searchParams.get('type') || 'auto';
      const clean = q!.replace(/[\s\-\.]/g, '');
      let isPhone   = false;
      let isCCCD    = false;
      let isMemCode = false;
      let isEmail   = false;

      if (searchType === 'auto') {
        isPhone   = /^(0|\+84)[0-9]{7,10}$/.test(clean);
        isCCCD    = /^[0-9]{9}$/.test(clean) || /^[0-9]{12}$/.test(clean);
        isMemCode = /^(Mem|mem|MEM)[0-9]/i.test(q!);
        isEmail   = q!.includes('@');
      } else {
        isPhone   = searchType === 'phone';
        isCCCD    = searchType === 'cccd';
        isMemCode = searchType === 'member_code';
        isEmail   = searchType === 'email';
      }

      if (isPhone) {
        ({ data, error } = await supabase
          .from('members')
          .select('id, member_code, full_name, phone, email, id_number, status, registered_date, expiry_date, branch, service_package, consultant_name, address, notes, contract_value')
          .or(`phone.ilike.%${clean}%,phone.ilike.%${q}%`)
          .eq('status', 'active')
          .limit(limit));
      } else if (isCCCD) {
        ({ data, error } = await supabase
          .from('members')
          .select('id, member_code, full_name, phone, email, id_number, status, registered_date, expiry_date, branch, service_package, consultant_name, address, notes, contract_value')
          .ilike('id_number', `%${clean}%`)
          .limit(limit));
      } else if (isMemCode) {
        ({ data, error } = await supabase
          .from('members')
          .select('id, member_code, full_name, phone, email, id_number, status, registered_date, expiry_date, branch, service_package, consultant_name, address, notes, contract_value')
          .ilike('member_code', `%${clean}%`)
          .limit(limit));
      } else if (isEmail) {
        ({ data, error } = await supabase
          .from('members')
          .select('id, member_code, full_name, phone, email, id_number, status, registered_date, expiry_date, branch, service_package, consultant_name, address, notes, contract_value')
          .ilike('email', `%${q}%`)
          .limit(limit));
      } else {
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
      if (isPublicSearch) return 'phone_and_cccd';
      
      const cleanQ = q ? q.replace(/[\s\-\.]/g, '') : '';
      const lq = q ? q.toLowerCase() : '';
      if (String(m.phone || '').toLowerCase().includes(cleanQ))       return 'phone';
      if (String(m.id_number || '').toLowerCase().includes(cleanQ))   return 'id_number';
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
        beneficiary_name_2: m.beneficiary_name_2,
        contract_value: m.contract_value,
        lookup_source: m.lookup_source || 'members',
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
      query: isPublicSearch ? (cccd ? cccd : phone) : q,
      search_type: isPublicSearch ? (cccd ? 'exact_cccd' : 'exact_phone') : (req.nextUrl.searchParams.get('type') || 'auto'),
      results,
    }, { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error('[Lookup] Error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500, headers: corsHeaders });
  }
}
