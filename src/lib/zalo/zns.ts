/**
 * Zalo ZNS (Zalo Notification Service) — Thư viện gửi tin nhắn tự động
 * Tài liệu: https://developers.zalo.me/docs/zns
 *
 * Luồng xác thực:
 *   1. ZALO_OA_ACCESS_TOKEN (valid 1h) — dùng cho ZNS
 *   2. ZALO_REFRESH_TOKEN   (valid 3 months) — để làm mới access token
 *
 * Lưu token trong .env.local:
 *   ZALO_OA_ACCESS_TOKEN=...
 *   ZALO_OA_REFRESH_TOKEN=...
 *   ZALO_OA_APP_ID=...
 *   ZALO_OA_APP_SECRET=...
 *   ZALO_OA_ID=...                  (optional - for OA messages)
 *   ZALO_ZNS_TEMPLATE_WELCOME=...   (Template ID - Welcome)
 *   ZALO_ZNS_TEMPLATE_BIRTHDAY=...  (Template ID - Birthday)
 */

const ZALO_API_BASE = 'https://openapi.zalo.me/v2.0';
const ZALO_ZNS_BASE = 'https://business.openapi.zalo.me';

export interface ZNSResult {
  success: boolean;
  message_id?: string;
  error?: string;
  raw?: unknown;
}

export interface ZNSWelcomeParams {
  phone: string;           // Số điện thoại khách hàng (10 số)
  full_name: string;       // Tên hội viên
  member_code: string;     // Mã hội viên
  contract_link?: string;  // Link xem hợp đồng điện tử
}

export interface ZNSBirthdayParams {
  phone: string;
  full_name: string;
  member_code: string;
}

/**
 * Lấy access token mới nhất (có thể lưu vào DB hoặc env)
 * Trong production, nên lưu token vào Supabase để refresh tự động
 */
function getAccessToken(): string {
  const token = process.env.ZALO_OA_ACCESS_TOKEN;
  if (!token) {
    throw new Error('ZALO_OA_ACCESS_TOKEN chưa được cấu hình trong .env');
  }
  return token;
}

/**
 * Chuẩn hóa số điện thoại về dạng 84xxxxxxxxx (quốc tế)
 */
export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('84')) return cleaned;
  if (cleaned.startsWith('0')) return '84' + cleaned.slice(1);
  return '84' + cleaned;
}

/**
 * Gửi ZNS Welcome Message — Chào mừng hội viên mới
 * Template cần có params: member_name, member_code, contract_link
 */
export async function sendZNSWelcome(params: ZNSWelcomeParams): Promise<ZNSResult> {
  const templateId = process.env.ZALO_ZNS_TEMPLATE_WELCOME;
  if (!templateId) {
    console.warn('[ZNS] ZALO_ZNS_TEMPLATE_WELCOME chưa cấu hình — bỏ qua gửi Welcome');
    return { success: false, error: 'Template ID chưa cấu hình' };
  }

  const phone = normalizePhone(params.phone);
  const contractLink = params.contract_link || 
    `${process.env.NEXT_PUBLIC_APP_URL}/membership/${params.member_code}`;

  const body = {
    phone,
    template_id: templateId,
    template_data: {
      member_name: params.full_name,
      member_code: params.member_code,
      contract_link: contractLink,
    },
    tracking_id: `welcome_${params.member_code}_${Date.now()}`,
  };

  return callZNSApi('/message/template', body);
}

/**
 * Gửi ZNS Birthday Message — Thiệp sinh nhật tự động
 */
export async function sendZNSBirthday(params: ZNSBirthdayParams): Promise<ZNSResult> {
  const templateId = process.env.ZALO_ZNS_TEMPLATE_BIRTHDAY;
  if (!templateId) {
    console.warn('[ZNS] ZALO_ZNS_TEMPLATE_BIRTHDAY chưa cấu hình — bỏ qua gửi Birthday');
    return { success: false, error: 'Template ID chưa cấu hình' };
  }

  const phone = normalizePhone(params.phone);
  const today = new Date();
  const year = today.getFullYear();

  const body = {
    phone,
    template_id: templateId,
    template_data: {
      member_name: params.full_name,
      member_code: params.member_code,
      year: String(year),
    },
    tracking_id: `birthday_${params.member_code}_${year}`,
  };

  return callZNSApi('/message/template', body);
}

/**
 * Gửi tin nhắn OA trực tiếp (khi không dùng ZNS template)
 * Dùng khi cần gửi nội dung tự do (cần user đã follow OA)
 */
export async function sendOAMessage(phone: string, text: string): Promise<ZNSResult> {
  const oaId = process.env.ZALO_OA_ID;
  if (!oaId) {
    return { success: false, error: 'ZALO_OA_ID chưa cấu hình' };
  }

  const normalizedPhone = normalizePhone(phone);

  // Bước 1: Lấy user_id từ phone
  const userIdResult = await getUserIdByPhone(normalizedPhone);
  if (!userIdResult.userId) {
    return { success: false, error: userIdResult.error || 'Không tìm thấy user Zalo' };
  }

  // Bước 2: Gửi tin nhắn
  const body = {
    recipient: { user_id: userIdResult.userId },
    message: { text },
  };

  try {
    const token = getAccessToken();
    const res = await fetch(`${ZALO_API_BASE}/oa/message`, {
      method: 'POST',
      headers: {
        'access_token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.error === 0) {
      return { success: true, message_id: data.data?.message_id, raw: data };
    }
    return { success: false, error: `Zalo error ${data.error}: ${data.message}`, raw: data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Helper: Lấy Zalo user_id từ số điện thoại
 */
async function getUserIdByPhone(phone: string): Promise<{ userId?: string; error?: string }> {
  try {
    const token = getAccessToken();
    const res = await fetch(
      `${ZALO_API_BASE}/oa/getprofile?data=${encodeURIComponent(JSON.stringify({ user_id: phone }))}`,
      {
        headers: { 'access_token': token },
      }
    );
    const data = await res.json();
    if (data.error === 0 && data.data?.user_id) {
      return { userId: data.data.user_id };
    }
    return { error: data.message || 'Không tìm thấy' };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Core function: Gọi Zalo ZNS API
 */
async function callZNSApi(endpoint: string, body: Record<string, unknown>): Promise<ZNSResult> {
  try {
    const token = getAccessToken();
    const url = `${ZALO_ZNS_BASE}${endpoint}`;

    console.log(`[ZNS] POST ${url}`, JSON.stringify(body));

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'access_token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    console.log('[ZNS] Response:', JSON.stringify(data));

    // Zalo ZNS trả về error=0 khi thành công
    if (data.error === 0) {
      return {
        success: true,
        message_id: data.data?.message_id || data.data?.zns_message_id,
        raw: data,
      };
    }

    return {
      success: false,
      error: `Zalo ZNS error ${data.error}: ${data.message}`,
      raw: data,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[ZNS] Lỗi gọi API:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Refresh Zalo Access Token bằng Refresh Token
 * Gọi khi Access Token hết hạn (1h)
 */
export async function refreshZaloToken(): Promise<{ access_token?: string; error?: string }> {
  const appId = process.env.ZALO_OA_APP_ID;
  const appSecret = process.env.ZALO_OA_APP_SECRET;
  const refreshToken = process.env.ZALO_OA_REFRESH_TOKEN;

  if (!appId || !appSecret || !refreshToken) {
    return { error: 'Thiếu ZALO_OA_APP_ID, ZALO_OA_APP_SECRET hoặc ZALO_OA_REFRESH_TOKEN' };
  }

  try {
    const res = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'secret_key': appSecret,
      },
      body: new URLSearchParams({
        app_id: appId,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const data = await res.json();
    if (data.access_token) {
      return { access_token: data.access_token };
    }
    return { error: data.error_description || 'Refresh token thất bại' };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
