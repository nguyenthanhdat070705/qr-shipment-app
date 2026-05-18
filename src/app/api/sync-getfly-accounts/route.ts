import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { findOrCreateFolder, uploadUrlToDriveIfMissing } from '@/lib/gdrive';

const GETFLY_API_KEY = process.env.GETFLY_API_KEY || '';
const GETFLY_BASE = 'https://blackstonesdvtl.getflycrm.com/api/v3';
const GETFLY_PAGE_DELAY_MS = 150;
const GETFLY_MAX_RETRIES = 4;

type AccountRow = ReturnType<typeof mapAccount>;

type ExistingAccount = {
  getfly_account_id: string;
  gdrive_folder_id: string | null;
  gdrive_folder_url: string | null;
  raw_data: Record<string, unknown> | null;
};

type DriveSyncStats = {
  foldersCreated: number;
  filesUploaded: number;
  filesSkipped: number;
  filesFailed: number;
  driveErrors: string[];
};

const DOC_DEFINITIONS = [
  {
    type: 'vneid_front',
    fileBaseName: 'VNeID_MatTruoc',
    aliases: [
      'vneid_front_url',
      'anh_mat_truoc_vneid',
      'anh_mat_truoc',
      'cccd_mat_truoc',
      'cmnd_mat_truoc',
      'mat_truoc_cccd',
      'front_id_image',
    ],
  },
  {
    type: 'vneid_back',
    fileBaseName: 'VNeID_MatSau',
    aliases: [
      'vneid_back_url',
      'anh_mat_sau_vneid',
      'anh_mat_sau',
      'cccd_mat_sau',
      'cmnd_mat_sau',
      'mat_sau_cccd',
      'back_id_image',
    ],
  },
  {
    type: 'contract_scan',
    fileBaseName: 'BanScan_HopDong',
    aliases: [
      'contract_scan_url',
      'scan_file_url',
      'file_scan_hop_dong',
      'ban_scan_hop_dong',
      'hop_dong_scan',
      'file_hop_dong',
      'contract_file_url',
    ],
  },
  {
    type: 'membership_form',
    fileBaseName: 'Phieu_HoiVien',
    aliases: [
      'membership_form_url',
      'phieu_hoi_vien',
      'phieu_dang_ky_hoi_vien',
      'file_phieu_hoi_vien',
      'membership_registration_form',
    ],
  },
] as const;

export const maxDuration = 300;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getflyFetchWithRetry(url: string, attempt = 0): Promise<Response> {
  const res = await fetch(url, {
    headers: {
      'X-API-KEY': GETFLY_API_KEY,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (res.status === 429 && attempt < GETFLY_MAX_RETRIES) {
    const retryAfter = Number(res.headers.get('retry-after'));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : 1000 * 2 ** attempt;
    console.warn(`[Sync Accounts] Rate limited, retrying in ${waitMs}ms (attempt ${attempt + 1}/${GETFLY_MAX_RETRIES})`);
    await sleep(waitMs);
    return getflyFetchWithRetry(url, attempt + 1);
  }

  return res;
}

// ── Helper: fetch all accounts from GetFly with pagination ──
async function fetchAllAccounts(): Promise<Record<string, unknown>[]> {
  if (!GETFLY_API_KEY) {
    throw new Error('Thiếu GETFLY_API_KEY để sync tài khoản GetFly.');
  }

  const allRecords: Record<string, unknown>[] = [];
  let page = 1;
  const perPage = 50;

  while (true) {
    const url = `${GETFLY_BASE}/accounts?page=${page}&per_page=${perPage}`;

    const res = await getflyFetchWithRetry(url);

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Sync Accounts] Page ${page} returned ${res.status}: ${errText.substring(0, 200)}`);
      throw new Error(`GetFly API Error ${res.status}`);
    }

    const data = await res.json();
    const records: Record<string, unknown>[] = data.records || data.data || [];

    console.log(`[Sync Accounts] Page ${page}: ${records.length} records | Total: ${allRecords.length + records.length}`);

    if (records.length === 0) break;
    allRecords.push(...records);

    const totalRecord = data.pagination?.total_record;
    if (totalRecord && allRecords.length >= parseInt(String(totalRecord), 10)) break;
    if (records.length < perPage) break;
    if (page >= 300) {
      console.warn('[Sync Accounts] Hit 300-page safety limit.');
      break;
    }

    await sleep(GETFLY_PAGE_DELAY_MS);
    page++;
  }

  return allRecords;
}

// ── Helpers ──
function str(val: unknown): string | null {
  if (val === undefined || val === null || val === '') return null;
  return String(val).trim();
}

function num(val: unknown): number {
  if (val === undefined || val === null || val === '') return 0;
  const n = parseFloat(String(val).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

function isHttpUrl(val: unknown): val is string {
  return typeof val === 'string' && /^https?:\/\//i.test(val);
}

function normalizeKey(key: string): string {
  return key
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function findUrlByAliases(raw: unknown, aliases: readonly string[]): string | null {
  const normalizedAliases = aliases.map(normalizeKey);
  const seen = new Set<unknown>();

  function walk(value: unknown, path: string): string | null {
    if (!value || typeof value !== 'object') return null;
    if (seen.has(value)) return null;
    seen.add(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = walk(item, path);
        if (found) return found;
      }
      return null;
    }

    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const currentPath = path ? `${path}.${key}` : key;
      const normalizedPath = normalizeKey(currentPath);
      const matchesAlias = normalizedAliases.some((alias) => normalizedPath.includes(alias));

      if (matchesAlias && isHttpUrl(child)) return child;
      if (matchesAlias && Array.isArray(child)) {
        const firstUrl = child.find(isHttpUrl);
        if (firstUrl) return firstUrl;
      }
      if (child && typeof child === 'object') {
        const found = walk(child, currentPath);
        if (found) return found;
      }
    }

    return null;
  }

  return walk(raw, '');
}

function extensionFromUrl(url: string): string {
  try {
    const ext = new URL(url).pathname.split('.').pop()?.toLowerCase();
    if (ext && /^[a-z0-9]{2,5}$/.test(ext)) return ext;
  } catch {
    // Fall back below when the source URL is malformed.
  }
  return 'jpg';
}

function getAccountFolderName(acc: AccountRow): string {
  const phone = acc.phone || acc.contact_phone || '';
  const cleanPhone = phone ? ` - ${phone}` : '';
  return `${acc.account_name || acc.account_code || acc.getfly_account_id || 'Khach Hang'}${cleanPhone}`;
}

function extractUploadedMetadata(raw: Record<string, unknown> | null | undefined) {
  const uploaded: Record<string, unknown> = {};
  if (!raw) return uploaded;

  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith('_uploaded_') || key.startsWith('_auto_drive_')) {
      uploaded[key] = value;
    }
  }

  return uploaded;
}

function mergeRawDataWithUploadedMetadata(
  freshRaw: Record<string, unknown>,
  existingRaw?: Record<string, unknown> | null
) {
  return {
    ...freshRaw,
    ...extractUploadedMetadata(existingRaw),
  };
}

async function getExistingAccounts(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  ids: string[]
): Promise<Map<string, ExistingAccount>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from('getfly_accounts')
    .select('getfly_account_id, gdrive_folder_id, gdrive_folder_url, raw_data')
    .in('getfly_account_id', ids);

  if (error) throw error;

  return new Map(
    (data || []).map((row: ExistingAccount) => [row.getfly_account_id, row])
  );
}

async function ensureAccountFolder(acc: AccountRow, stats: DriveSyncStats): Promise<string | null> {
  if (acc.gdrive_folder_id) return acc.gdrive_folder_id;

  const folderName = getAccountFolderName(acc);
  const folderId = await findOrCreateFolder(folderName);
  acc.gdrive_folder_id = folderId;
  acc.gdrive_folder_url = `https://drive.google.com/drive/folders/${folderId}`;
  stats.foldersCreated++;
  return folderId;
}

async function syncAccountDocumentsToDrive(
  acc: AccountRow,
  isNewAccount: boolean,
  options: { createFolderForNewAccounts: boolean },
  stats: DriveSyncStats
) {
  const raw = (acc.raw_data || {}) as Record<string, unknown>;
  const docs = DOC_DEFINITIONS
    .map((definition) => ({
      ...definition,
      sourceUrl: findUrlByAliases(raw, definition.aliases),
      existingFileId: raw[`_uploaded_${definition.type}_file_id`],
    }))
    .filter((doc) => doc.sourceUrl);

  if (isNewAccount && options.createFolderForNewAccounts && !acc.gdrive_folder_id) {
    await ensureAccountFolder(acc, stats);
  }

  const missingDocs = docs.filter((doc) => !doc.existingFileId);
  if (missingDocs.length === 0) {
    stats.filesSkipped += docs.length;
    return;
  }

  const folderId = await ensureAccountFolder(acc, stats);
  if (!folderId) return;

  for (const doc of missingDocs) {
    if (!doc.sourceUrl) continue;

    const fileIdKey = `_uploaded_${doc.type}_file_id`;
    const urlKey = `_uploaded_${doc.type}_url`;
    const atKey = `_uploaded_${doc.type}_at`;
    const nameKey = `_uploaded_${doc.type}_name`;
    const sourceKey = `_uploaded_${doc.type}_source_url`;
    const fileName = `${doc.fileBaseName}.${extensionFromUrl(doc.sourceUrl)}`;

    try {
      const result = await uploadUrlToDriveIfMissing(doc.sourceUrl, fileName, folderId);
      if (!result.fileId) {
        stats.filesFailed++;
        continue;
      }

      raw[fileIdKey] = result.fileId;
      raw[urlKey] = `https://drive.google.com/file/d/${result.fileId}/view`;
      raw[atKey] = new Date().toISOString();
      raw[nameKey] = fileName;
      raw[sourceKey] = doc.sourceUrl;

      if (result.uploaded) stats.filesUploaded++;
      if (result.skipped) stats.filesSkipped++;
    } catch (err) {
      stats.filesFailed++;
      const accountLabel = acc.account_name || acc.getfly_account_id || 'unknown';
      stats.driveErrors.push(`${accountLabel} / ${doc.type}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  acc.raw_data = raw;
}

// ── Map GetFly account to our DB schema ──
function mapAccount(a: Record<string, unknown>) {
  const contacts = (a.contacts as Array<Record<string, unknown>>) || [];
  const primaryContact = contacts[0] || {};

  return {
    getfly_account_id: str(a.account_id) || str(a.id),
    account_code: str(a.account_code),
    account_name: str(a.account_name),
    phone: str(a.phone),
    email: str(a.email),
    address: str(a.address),
    description: str(a.description),

    account_type: str(a.account_type),
    account_source: str(a.account_source),
    relation_name: str(a.relation_name),
    industry_name: str(a.industry_name),

    manager_email: str(a.manager_email),
    manager_user_name: str(a.manager_user_name),

    // Custom fields
    ma_hoi_vien: str(a.ma_hoi_vien),
    goi_dich_vu: str(a.goi_dich_vu),
    trang_thai_hoi_vien: str(a.trang_thai_hoi_vien),
    ngay_tham_gia: str(a.ngay_tham_gia),

    ho_ten_nguoi_mat: str(a.ho_ten_nguoi_mat),
    ngay_mat: str(a.ngay_mat),
    thoi_gian_to_chuc_dam: str(a.thoi_gian_to_chuc_dam),
    dia_chi_chon_cat: str(a.dia_chi_chon_cat),
    dia_chi_lien_he: str(a.dia_chi_lien_he),

    so_cccd: str(a.so_cccd),
    so_tk_ngan_hang: str(a.so_tk_ngan_hang),
    ten_ngan_hang: str(a.ten_ngan_hang),

    contact_name: str(primaryContact.first_name),
    contact_phone: str(primaryContact.phone_mobile || primaryContact.phone_home),

    province_name: str(a.province_name),
    revenue: num(a.revenue),

    gdrive_folder_id: null as string | null,
    gdrive_folder_url: null as string | null,
    getfly_created_at: str(a.created_at),
    synced_at: new Date().toISOString(),
    raw_data: a,
  };
}

// ── Direct insert using Supabase REST with explicit schema reload ──
async function directUpsert(rows: AccountRow[]) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const chunkSize = 50;
  let totalUpserted = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);

    const res = await fetch(`${supabaseUrl}/rest/v1/getfly_accounts?on_conflict=getfly_account_id`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(chunk),
    });

    if (!res.ok) {
      const errText = await res.text();

      if (errText.includes('schema cache') && i === 0) {
        console.log('[Sync Accounts] Schema cache stale, attempting reload...');
        await new Promise(r => setTimeout(r, 2000));

        const retryRes = await fetch(`${supabaseUrl}/rest/v1/getfly_accounts?on_conflict=getfly_account_id`, {
          method: 'POST',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify(chunk),
        });

        if (!retryRes.ok) {
          const retryErr = await retryRes.text();
          throw new Error(`Schema cache still stale after retry: ${retryErr.substring(0, 200)}`);
        }
      } else {
        throw new Error(`Upsert error at chunk ${i}: ${errText.substring(0, 300)}`);
      }
    }

    totalUpserted += chunk.length;
    if (totalUpserted % 500 === 0 || i + chunkSize >= rows.length) {
      console.log(`[Sync Accounts] Progress: ${totalUpserted}/${rows.length}`);
    }
  }

  return totalUpserted;
}

// ── POST: Full sync all accounts ──
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const url = new URL(req.url);
    const syncDrive = url.searchParams.get('sync_drive') !== 'false';
    const createNewFolders = url.searchParams.get('create_new_folders') !== 'false';

    console.log('[Sync Accounts] Starting sync...');
    const accounts = await fetchAllAccounts();
    console.log(`[Sync Accounts] Fetched ${accounts.length} accounts from GetFly`);

    if (accounts.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: 'Không tìm thấy khách hàng nào trên GetFly',
      });
    }

    const rows = accounts.map(mapAccount).filter(r => r.getfly_account_id);
    const driveStats: DriveSyncStats = {
      foldersCreated: 0,
      filesUploaded: 0,
      filesSkipped: 0,
      filesFailed: 0,
      driveErrors: [],
    };
    let totalUpserted = 0;
    let newAccounts = 0;

    try {
      const chunkSize = 100;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const ids = chunk.map((row) => row.getfly_account_id).filter(Boolean) as string[];
        const existingMap = await getExistingAccounts(supabase, ids);

        for (const row of chunk) {
          const existing = row.getfly_account_id ? existingMap.get(row.getfly_account_id) : undefined;
          row.gdrive_folder_id = existing?.gdrive_folder_id || null;
          row.gdrive_folder_url = existing?.gdrive_folder_url || null;
          row.raw_data = mergeRawDataWithUploadedMetadata(
            row.raw_data as Record<string, unknown>,
            existing?.raw_data
          );

          const isNewAccount = !existing;
          if (isNewAccount) newAccounts++;

          if (syncDrive) {
            try {
              await syncAccountDocumentsToDrive(row, isNewAccount, { createFolderForNewAccounts: createNewFolders }, driveStats);
            } catch (driveErr) {
              const accountLabel = row.account_name || row.getfly_account_id || 'unknown';
              driveStats.driveErrors.push(`${accountLabel}: ${driveErr instanceof Error ? driveErr.message : String(driveErr)}`);
            }
          }
        }

        const { error } = await supabase
          .from('getfly_accounts')
          .upsert(chunk, { onConflict: 'getfly_account_id', ignoreDuplicates: false });

        if (error) {
          if (error.message.includes('schema cache') && i === 0) {
            console.log('[Sync Accounts] Supabase client schema cache issue, trying direct REST...');
            totalUpserted = await directUpsert(rows);
            break;
          }
          throw error;
        }

        totalUpserted += chunk.length;
        if (totalUpserted % 500 === 0 || i + chunkSize >= rows.length) {
          console.log(`[Sync Accounts] Upserted: ${totalUpserted}/${rows.length}`);
        }
      }
    } catch (clientErr) {
      if (clientErr instanceof Error && clientErr.message.includes('schema cache')) {
        console.log('[Sync Accounts] Falling back to direct REST API...');
        totalUpserted = await directUpsert(rows);
      } else {
        throw clientErr;
      }
    }

    const messageParts = [`Đã sync ${totalUpserted} khách hàng từ GetFly`];
    if (newAccounts > 0) messageParts.push(`${newAccounts} khách mới`);
    if (syncDrive) {
      messageParts.push(`tạo ${driveStats.foldersCreated} folder`);
      messageParts.push(`upload ${driveStats.filesUploaded} file`);
      if (driveStats.filesSkipped > 0) messageParts.push(`bỏ qua ${driveStats.filesSkipped} file đã có`);
      if (driveStats.filesFailed > 0) messageParts.push(`${driveStats.filesFailed} file lỗi`);
    }

    return NextResponse.json({
      success: true,
      synced: totalUpserted,
      total_from_getfly: accounts.length,
      new_accounts: newAccounts,
      drive_sync_enabled: syncDrive,
      folders_created: driveStats.foldersCreated,
      files_uploaded: driveStats.filesUploaded,
      files_skipped: driveStats.filesSkipped,
      files_failed: driveStats.filesFailed,
      drive_errors: driveStats.driveErrors.slice(0, 20),
      message: messageParts.join(' | '),
    });
  } catch (err) {
    console.error('[Sync Accounts] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── GET: Check sync status ──
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { count: totalCount, error: totalErr } = await supabase
      .from('getfly_accounts')
      .select('*', { count: 'exact', head: true });

    if (totalErr) {
      return NextResponse.json({
        error: totalErr.message,
        hint: 'Bảng getfly_accounts có thể chưa tồn tại hoặc schema cache chưa refresh',
      });
    }

    const { count: memberCount } = await supabase
      .from('getfly_accounts')
      .select('*', { count: 'exact', head: true })
      .not('ma_hoi_vien', 'is', null);

    const { count: cccdCount } = await supabase
      .from('getfly_accounts')
      .select('*', { count: 'exact', head: true })
      .not('so_cccd', 'is', null);

    const { count: folderCount } = await supabase
      .from('getfly_accounts')
      .select('*', { count: 'exact', head: true })
      .not('gdrive_folder_id', 'is', null);

    const { data: lastRecord } = await supabase
      .from('getfly_accounts')
      .select('synced_at')
      .order('synced_at', { ascending: false })
      .limit(1);

    return NextResponse.json({
      total_accounts: totalCount || 0,
      with_membership: memberCount || 0,
      with_cccd: cccdCount || 0,
      with_gdrive_folder: folderCount || 0,
      last_sync: lastRecord?.[0]?.synced_at || null,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
