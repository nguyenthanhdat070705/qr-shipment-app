/**
 * Lấy access-token Service Account để đọc Google Sheet/Drive KHÔNG public.
 * Cần env GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY (đã cấu hình cho CRM sync).
 *
 * - CÓ creds  → mint token Drive read-only → dùng kèm header Authorization.
 * - KHÔNG creds → trả null → caller fetch ẩn danh (Sheet phải đang public).
 *
 * Dùng google.auth.JWT.getAccessToken() để tự refresh khi token hết hạn.
 */
import { google } from 'googleapis';

type JwtClient = InstanceType<typeof google.auth.JWT>;
let _jwt: JwtClient | null = null;

export const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL?.trim() || null;

export async function getGoogleAccessTokenOrNull(): Promise<string | null> {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!clientEmail || !privateKey) return null;
  try {
    if (!_jwt) {
      _jwt = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });
    }
    const { token } = await _jwt.getAccessToken();
    return token ?? null;
  } catch (e) {
    console.warn('[googleAuth] Không lấy được token service account, fallback ẩn danh:', e);
    return null;
  }
}
