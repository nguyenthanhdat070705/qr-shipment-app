/**
 * Đọc TRỰC TIẾP Google Sheet "Hợp Đồng Bán" (bản công khai, xuất CSV) để tra cứu
 * hội viên — KHÔNG đi qua Supabase. Đây là nguồn cho phiên bản tra cứu mới
 * (/embed/hoi-vien-v2 + /api/membership/lookup-sheet), giữ nguyên luồng cũ.
 *
 * Sheet: https://docs.google.com/spreadsheets/d/1VsrxbldhPl7LcTHZRL6w2VKzS3Ty5ym0EU9NwuI9FQY
 * Mapping cột (đã đối chiếu header thật của sheet, tab gid=0):
 *   B  Mã hợp đồng            → Mã hội viên
 *   C  Tên hợp đồng           → SĐT để search (số sync về thường thiếu số 0 đầu)
 *   E  Trạng thái             → badge trạng thái
 *   I  Ngày hiệu lực          → Ngày ký kết
 *   J  Ngày hết hạn           → Ngày hết hạn
 *   T  Bên bán                → Tên hội viên
 *   U  Bên bán - Địa chỉ      → Địa chỉ
 *   Y  Bên bán - Người phụ trách → Sale phụ trách
 *   AZ Tổng đã thanh toán     → Số tiền đã đóng
 *   CB CCCD khách hàng        → mật khẩu (nhập đúng CCCD mới xem được)
 *   CC Người thụ hưởng 1
 *   CG Người thụ hưởng 2
 */

import { parse } from 'csv-parse/sync';
import { phoneKey, cccdKey } from '@/lib/normalize';
import { getGoogleAccessTokenOrNull, SERVICE_ACCOUNT_EMAIL } from '@/lib/googleAuth';

export const HOP_DONG_BAN_SHEET_ID = '1VsrxbldhPl7LcTHZRL6w2VKzS3Ty5ym0EU9NwuI9FQY';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${HOP_DONG_BAN_SHEET_ID}/export?format=csv&gid=0`;

/** Chữ cái cột Sheet (A, B, …, AA, …, CB) → chỉ số 0-based. */
function col(letter: string): number {
  let n = 0;
  for (const ch of letter) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

const COL = {
  memberCode: col('B'),
  phone: col('C'),
  statusRaw: col('E'),
  signDate: col('I'),
  expiryDate: col('J'),
  fullName: col('T'),
  address: col('U'),
  consultant: col('Y'),
  paidAmount: col('AZ'),
  cccd: col('CB'),
  beneficiary1: col('CC'),
  beneficiary2: col('CG'),
};

export interface SheetMember {
  member_code: string;
  full_name: string;
  phone_raw: string;
  sign_date: string;
  expiry_date: string;
  address: string;
  beneficiary_1: string;
  beneficiary_2: string;
  consultant_name: string;
  paid_amount: number;
  status_raw: string;
  /** Chỉ dùng nội bộ để so khớp — KHÔNG bao giờ trả ra client. */
  _phone_key: string;
  _cccd_key: string;
}

function toNumber(v: string): number {
  const n = parseFloat(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function mapRow(r: string[]): SheetMember {
  const cell = (i: number) => String(r[i] ?? '').trim();
  const phoneRaw = cell(COL.phone);
  const cccdRaw = cell(COL.cccd);
  return {
    member_code: cell(COL.memberCode),
    full_name: cell(COL.fullName),
    phone_raw: phoneRaw,
    sign_date: cell(COL.signDate),
    expiry_date: cell(COL.expiryDate),
    address: cell(COL.address),
    beneficiary_1: cell(COL.beneficiary1),
    beneficiary_2: cell(COL.beneficiary2),
    consultant_name: cell(COL.consultant),
    paid_amount: toNumber(cell(COL.paidAmount)),
    status_raw: cell(COL.statusRaw),
    _phone_key: phoneKey(phoneRaw),
    _cccd_key: cccdKey(cccdRaw),
  };
}

/** HĐ hội viên = mã hợp đồng (cột B) bắt đầu bằng "MBS". */
export function isMbsRow(m: SheetMember): boolean {
  return m.member_code.toUpperCase().startsWith('MBS');
}

let cache: { at: number; rows: SheetMember[] } = { at: 0, rows: [] };
const TTL_MS = 60_000;

export async function fetchHopDongBanMembers(force = false): Promise<SheetMember[]> {
  const now = Date.now();
  if (!force && cache.rows.length && now - cache.at < TTL_MS) return cache.rows;

  // Ưu tiên đọc qua Service Account (đọc được Sheet riêng tư đã share); nếu
  // không có creds thì fetch ẩn danh (Sheet phải đang public).
  const token = await getGoogleAccessTokenOrNull();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(CSV_URL, { cache: 'no-store', redirect: 'follow', headers });
  if (!res.ok) throw new Error(`Không tải được Google Sheet (HTTP ${res.status}).`);
  const text = await res.text();
  // Sheet bị khoá quyền → Google trả trang HTML đăng nhập thay vì CSV.
  if (/^\s*</.test(text) || /<html/i.test(text.slice(0, 200))) {
    const who = SERVICE_ACCOUNT_EMAIL ? ` Hãy chia sẻ Sheet cho service account "${SERVICE_ACCOUNT_EMAIL}" (quyền Viewer).` : '';
    throw new Error(`Không đọc được Sheet — sheet không public và service account chưa có quyền.${who}`);
  }

  const records = parse(text, { skip_empty_lines: true, relax_column_count: true }) as string[][];
  const rows = records.slice(1).map(mapRow).filter(isMbsRow);
  cache = { at: now, rows };
  return rows;
}

/** Lọc theo SĐT (cột C) — chuẩn hoá bỏ 84 + số 0 đầu cả 2 phía. */
export function findByPhone(rows: SheetMember[], phone: string): SheetMember[] {
  const key = phoneKey(phone);
  if (!key) return [];
  return rows.filter((m) => m._phone_key && m._phone_key === key);
}

/** Kiểm tra mật khẩu = CCCD (cột CB) — bỏ mọi số 0 đầu cả 2 phía. */
export function matchCccd(m: SheetMember, cccd: string): boolean {
  const key = cccdKey(cccd);
  return !!key && m._cccd_key === key;
}
