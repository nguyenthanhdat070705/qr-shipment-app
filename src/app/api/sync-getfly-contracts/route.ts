import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { findOrCreateFolder, findOrCreateSubFolder, uploadUrlToDriveIfMissing } from '@/lib/gdrive';

const GETFLY_API_KEY = process.env.GETFLY_API_KEY || '';
const GETFLY_BASE = 'https://blackstonesdvtl.getflycrm.com/api/v3';

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════
interface DriveSyncStats {
  foldersCreated: number;
  contractFoldersCreated: number;
  filesUploaded: number;
  filesSkipped: number;
  filesFailed: number;
  errors: string[];
}

// ── Helper: fetch all contracts (order_type=2) from GetFly with pagination ──
async function fetchAllContracts(): Promise<Record<string, unknown>[]> {
  const allRecords: Record<string, unknown>[] = [];
  let page = 1;
  const perPage = 50;

  while (true) {
    const url = new URL(`${GETFLY_BASE}/orders`);
    url.searchParams.set('order_type', '2');
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(perPage));

    const res = await fetch(url.toString(), {
      headers: {
        'X-API-KEY': GETFLY_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Sync Contracts] Page ${page} returned ${res.status}: ${errText.substring(0, 200)}`);
      throw new Error(`GetFly API Error ${res.status}: ${errText.substring(0, 200)}`);
    }

    const data = await res.json();
    const records: Record<string, unknown>[] = data.records || data.data || [];

    console.log(`[Sync Contracts] Page ${page}: got ${records.length} records | Total: ${allRecords.length + records.length}`);

    if (records.length === 0) break;
    allRecords.push(...records);

    const totalRecord = data.pagination?.total_record || data.total_record;
    if (totalRecord && allRecords.length >= parseInt(String(totalRecord), 10)) break;
    if (records.length < perPage) break;
    if (page >= 200) {
      console.warn('[Sync Contracts] Hit 200-page safety limit.');
      break;
    }

    page++;
  }

  return allRecords;
}

// ── Helper: fetch contract detail with custom fields ──
async function fetchContractDetail(orderId: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${GETFLY_BASE}/orders/${orderId}`, {
      headers: {
        'X-API-KEY': GETFLY_API_KEY,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ── Helper: fetch account detail to get image URLs ──
async function fetchAccountDetail(accountId: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${GETFLY_BASE}/accounts/${accountId}`, {
      headers: {
        'X-API-KEY': GETFLY_API_KEY,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.record || data.data || data;
  } catch {
    return null;
  }
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

function extensionFromUrl(url: string): string {
  try {
    const ext = new URL(url).pathname.split('.').pop()?.toLowerCase();
    if (ext && /^[a-z0-9]{2,5}$/.test(ext)) return ext;
  } catch { /* ignore */ }
  return 'jpg';
}

// ── Deep search for URLs by field name aliases ──
const IMAGE_FIELD_ALIASES = {
  vneid_front: [
    'vneid_front_url', 'anh_mat_truoc_vneid', 'anh_mat_truoc',
    'cccd_mat_truoc', 'cmnd_mat_truoc', 'mat_truoc_cccd', 'front_id_image',
  ],
  vneid_back: [
    'vneid_back_url', 'anh_mat_sau_vneid', 'anh_mat_sau',
    'cccd_mat_sau', 'cmnd_mat_sau', 'mat_sau_cccd', 'back_id_image',
  ],
  contract_scan: [
    'contract_scan_url', 'scan_file_url', 'file_scan_hop_dong',
    'ban_scan_hop_dong', 'hop_dong_scan', 'file_hop_dong', 'contract_file_url',
  ],
  membership_form: [
    'membership_form_url', 'phieu_hoi_vien', 'phieu_dang_ky_hoi_vien',
    'file_phieu_hoi_vien', 'membership_registration_form',
  ],
} as const;

function findUrlByAliases(raw: unknown, aliases: readonly string[]): string | null {
  const normalizedAliases = aliases.map(normalizeKey);
  const seen = new Set<unknown>();

  function walk(value: unknown): string | null {
    if (!value || typeof value !== 'object') return null;
    if (seen.has(value)) return null;
    seen.add(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = walk(item);
        if (found) return found;
      }
      return null;
    }

    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const normalizedKey = normalizeKey(key);
      const matchesAlias = normalizedAliases.some((alias) => normalizedKey.includes(alias));

      if (matchesAlias && isHttpUrl(child)) return child;
      if (matchesAlias && Array.isArray(child)) {
        const firstUrl = child.find(isHttpUrl);
        if (firstUrl) return firstUrl;
      }
      if (child && typeof child === 'object') {
        const found = walk(child);
        if (found) return found;
      }
    }

    return null;
  }

  return walk(raw);
}

// ── Map GetFly contract to DB schema ──
function mapContract(c: Record<string, unknown>) {
  const accountInfo = (c.account_info || {}) as Record<string, unknown>;

  return {
    getfly_contract_id: str(c.order_id || c.contract_id || c.id),
    contract_name: str(c.order_code || c.contract_name || c.order_name || c.name),
    contract_code: str(c.order_code || c.contract_code || c.code),
    contract_status: mapStatus(c.status || c.order_status || c.contract_status),
    contract_type: str(c.contract_type || c.type || c.type_name),
    remaining_days: c.remaining_days !== undefined ? parseInt(String(c.remaining_days), 10) || null : null,

    created_date: str(c.created_at || c.created_date || c.create_date),
    effective_date: str(c.effective_date || c.start_date || c.order_date),
    expiry_date: str(c.expiry_date || c.end_date || c.expire_date),

    customer_name: str(c.account_name || c.customer_name || accountInfo.account_code),
    person_in_charge: str(c.assigned_name || c.person_in_charge || c.manager_name),

    contract_value: num(c.amount || c.contract_value || c.value || c.total_amount),
    actual_value: num(c.f_amount || c.actual_value || c.real_value),
    executed_amount: num(c.executed_amount || c.done_amount),
    paid_amount: num(c.paid_amount || c.payment_amount),
    debt_amount: num(c.debt_amount || c.debt),

    beneficiary_name_1: str(c.beneficiary_name_1 || c.ten_nguoi_thu_huong_so_1),
    beneficiary_vneid_1: str(c.beneficiary_vneid_1 || c.vneid_nguoi_thu_huong_1),
    beneficiary_phone_1: str(c.beneficiary_phone_1 || c.so_dien_thoai_nguoi_thu_huong_01),
    beneficiary_address_1: str(c.beneficiary_address_1 || c.dia_chi_nguoi_thu_huong_01),

    beneficiary_name_2: str(c.beneficiary_name_2 || c.ten_nguoi_thu_huong_02),
    beneficiary_vneid_2: str(c.beneficiary_vneid_2 || c.vneid_nguoi_thu_huong_02),
    beneficiary_phone_2: str(c.beneficiary_phone_2 || c.so_dien_thoai_nguoi_thu_huong_02),
    beneficiary_address_2: str(c.beneficiary_address_2 || c.dia_chi_nguoi_thu_huong_02),

    buyer_email: str(c.buyer_email || c.email_nguoi_mua || accountInfo.email),

    // Store account_id for GDrive cross-reference
    account_id: str(c.account_id || accountInfo.account_id),
    account_phone: str(c.account_phone || accountInfo.phone),

    synced_at: new Date().toISOString(),
    raw_data: c,
  };
}

function mapStatus(val: unknown): string | null {
  const s = String(val || '').trim();
  switch (s) {
    case '1': return 'Đang xử lý';
    case '2': return 'Hoàn thành';
    case '3': return 'Đã hủy';
    default: return s || null;
  }
}

// ═══════════════════════════════════════════════════════
// Google Drive Sync Per Contract
// ═══════════════════════════════════════════════════════
async function syncContractDocsToDrive(
  contractRow: ReturnType<typeof mapContract>,
  accountData: Record<string, unknown> | null,
  stats: DriveSyncStats,
): Promise<{
  gdrive_folder_id: string | null;
  gdrive_folder_url: string | null;
  uploaded_files: Record<string, string>;
}> {
  const result = {
    gdrive_folder_id: null as string | null,
    gdrive_folder_url: null as string | null,
    uploaded_files: {} as Record<string, string>,
  };

  // Merge all raw data sources for deep URL search
  const mergedData = {
    ...(contractRow.raw_data as Record<string, unknown> || {}),
    ...(accountData || {}),
  };

  // Check if there are any image URLs to upload
  const docsToPush: { type: string; fileName: string; url: string }[] = [];

  for (const [type, aliases] of Object.entries(IMAGE_FIELD_ALIASES)) {
    const url = findUrlByAliases(mergedData, aliases);
    if (url) {
      const ext = extensionFromUrl(url);
      const fileNameMap: Record<string, string> = {
        vneid_front: `VNeID_MatTruoc.${ext}`,
        vneid_back: `VNeID_MatSau.${ext}`,
        contract_scan: `BanScan_HopDong.${ext}`,
        membership_form: `Phieu_HoiVien.${ext}`,
      };
      docsToPush.push({
        type,
        fileName: fileNameMap[type] || `document.${ext}`,
        url,
      });
    }
  }

  // Even if no image URLs, create a folder for the contract for manual uploads
  const customerName = contractRow.customer_name || 'Khach_Hang';
  const phone = contractRow.account_phone || '';
  const cleanPhone = phone ? ` - ${phone}` : '';
  const customerFolderName = `${customerName}${cleanPhone}`;

  try {
    // 1. Create/find customer root folder
    const customerFolderId = await findOrCreateFolder(customerFolderName);
    stats.foldersCreated++;

    // 2. Create/find per-contract subfolder
    const contractCode = contractRow.contract_code || contractRow.getfly_contract_id || 'HD';
    const contractFolderName = `HĐ_${contractCode}`;
    const contractFolderId = await findOrCreateSubFolder(contractFolderName, customerFolderId);
    stats.contractFoldersCreated++;

    result.gdrive_folder_id = contractFolderId;
    result.gdrive_folder_url = `https://drive.google.com/drive/folders/${contractFolderId}`;

    // 3. Upload documents (skip if already exists)
    for (const doc of docsToPush) {
      try {
        const uploadResult = await uploadUrlToDriveIfMissing(doc.url, doc.fileName, contractFolderId);
        if (uploadResult.uploaded) {
          stats.filesUploaded++;
          result.uploaded_files[doc.type] = uploadResult.fileId || '';
        } else if (uploadResult.skipped) {
          stats.filesSkipped++;
          result.uploaded_files[doc.type] = uploadResult.fileId || '';
        } else {
          stats.filesFailed++;
        }
      } catch (err) {
        stats.filesFailed++;
        stats.errors.push(`${contractCode}/${doc.type}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    stats.errors.push(`Folder "${customerFolderName}": ${err instanceof Error ? err.message : String(err)}`);
  }

  return result;
}

// ═══════════════════════════════════════════════════════
// POST: Sync all contracts from GetFly + GDrive upload
// ═══════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const url = new URL(req.url);
    const syncDrive = url.searchParams.get('sync_drive') !== 'false';

    console.log('[Sync Contracts] Starting sync...');
    const contracts = await fetchAllContracts();
    console.log(`[Sync Contracts] Fetched ${contracts.length} contracts from GetFly`);

    if (contracts.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: 'Không tìm thấy hợp đồng nào trên GetFly',
      });
    }

    // Map to our schema
    const rows = contracts.map(mapContract).filter(r => r.getfly_contract_id);
    const driveStats: DriveSyncStats = {
      foldersCreated: 0,
      contractFoldersCreated: 0,
      filesUploaded: 0,
      filesSkipped: 0,
      filesFailed: 0,
      errors: [],
    };

    // Upsert contracts to database via RPC
    const chunkSize = 50;
    let totalUpserted = 0;

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);

      // Try RPC first, fallback to direct REST
      const { data, error } = await supabase.rpc('bulk_upsert_getfly_contracts', {
        payload: chunk
      });

      if (error) {
        console.error('[Sync Contracts] RPC error at chunk', i, error);
        // Fallback: try direct REST
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        const restRes = await fetch(`${supabaseUrl}/rest/v1/getfly_contracts?on_conflict=getfly_contract_id`, {
          method: 'POST',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify(chunk),
        });

        if (!restRes.ok) {
          const errText = await restRes.text();
          console.error('[Sync Contracts] REST fallback error:', errText.substring(0, 300));
          return NextResponse.json({ error: `Upsert failed: ${errText.substring(0, 200)}` }, { status: 500 });
        }
      }
      totalUpserted += (data || chunk.length);
    }

    // ── Google Drive Sync ──
    let driveMessage = '';
    if (syncDrive) {
      console.log('[Sync Contracts] Starting Google Drive sync...');
      
      // Cache account data to avoid redundant API calls
      const accountCache = new Map<string, Record<string, unknown> | null>();

      for (const contractRow of rows) {
        const accountId = contractRow.account_id;
        let accountData: Record<string, unknown> | null = null;

        if (accountId) {
          if (accountCache.has(accountId)) {
            accountData = accountCache.get(accountId) || null;
          } else {
            // Try to get account data from our local DB first
            const { data: localAccount } = await supabase
              .from('getfly_accounts')
              .select('raw_data')
              .eq('getfly_account_id', accountId)
              .single();

            accountData = (localAccount?.raw_data as Record<string, unknown>) || null;

            // If no local data, try fetching from GetFly API
            if (!accountData) {
              accountData = await fetchAccountDetail(accountId);
            }
            accountCache.set(accountId, accountData);
          }
        }

        try {
          const driveResult = await syncContractDocsToDrive(contractRow, accountData, driveStats);

          // Update the contract record with GDrive folder info
          if (driveResult.gdrive_folder_id) {
            // Save GDrive tracking to membership_gdrive_attachments
            const trackingData: Record<string, unknown> = {
              getfly_contract_id: contractRow.getfly_contract_id,
              gdrive_folder_id: driveResult.gdrive_folder_id,
              last_sync_at: new Date().toISOString(),
            };

            if (driveResult.uploaded_files.vneid_front) {
              trackingData.vneid_front_file_id = driveResult.uploaded_files.vneid_front;
            }
            if (driveResult.uploaded_files.vneid_back) {
              trackingData.vneid_back_file_id = driveResult.uploaded_files.vneid_back;
            }
            if (driveResult.uploaded_files.contract_scan) {
              trackingData.contract_scan_file_id = driveResult.uploaded_files.contract_scan;
            }
            if (driveResult.uploaded_files.membership_form) {
              trackingData.membership_form_file_id = driveResult.uploaded_files.membership_form;
            }

            await supabase
              .from('membership_gdrive_attachments')
              .upsert(trackingData, { onConflict: 'getfly_contract_id' })
              .then(({ error: upsertErr }) => {
                if (upsertErr) {
                  console.error('[Sync Contracts] GDrive tracking upsert error:', upsertErr.message);
                }
              });
          }
        } catch (err) {
          const label = contractRow.contract_code || contractRow.getfly_contract_id;
          driveStats.errors.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      const driveParts = [];
      if (driveStats.foldersCreated > 0) driveParts.push(`${driveStats.foldersCreated} thư mục KH`);
      if (driveStats.contractFoldersCreated > 0) driveParts.push(`${driveStats.contractFoldersCreated} thư mục HĐ`);
      if (driveStats.filesUploaded > 0) driveParts.push(`${driveStats.filesUploaded} file đã upload`);
      if (driveStats.filesSkipped > 0) driveParts.push(`${driveStats.filesSkipped} file đã có`);
      if (driveStats.filesFailed > 0) driveParts.push(`${driveStats.filesFailed} file lỗi`);
      driveMessage = driveParts.length > 0 ? ` | GDrive: ${driveParts.join(', ')}` : '';
    }

    return NextResponse.json({
      success: true,
      synced: totalUpserted,
      message: `Đã sync ${totalUpserted} hợp đồng từ GetFly${driveMessage}`,
      drive_stats: syncDrive ? {
        folders_created: driveStats.foldersCreated,
        contract_folders_created: driveStats.contractFoldersCreated,
        files_uploaded: driveStats.filesUploaded,
        files_skipped: driveStats.filesSkipped,
        files_failed: driveStats.filesFailed,
        errors: driveStats.errors.slice(0, 20),
      } : undefined,
    });
  } catch (err) {
    console.error('[Sync Contracts] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── GET: Check sync status with GDrive info ──
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error, count } = await supabase
      .from('getfly_contracts')
      .select('*', { count: 'exact' })
      .order('synced_at', { ascending: false })
      .limit(1);

    if (error) {
      return NextResponse.json({ synced: 0, last_sync: null, error: error.message });
    }

    // Get GDrive attachment stats
    const { count: driveCount } = await supabase
      .from('membership_gdrive_attachments')
      .select('*', { count: 'exact', head: true })
      .not('gdrive_folder_id', 'is', null);

    return NextResponse.json({
      synced_count: count || 0,
      last_sync: data?.[0]?.synced_at || null,
      drive_folders: driveCount || 0,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
