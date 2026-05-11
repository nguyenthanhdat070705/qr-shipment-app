import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { findOrCreateFolder, uploadUrlToDrive } from '@/lib/gdrive';

const GETFLY_API_KEY = process.env.GETFLY_API_KEY || 'UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1';
const GETFLY_BASE = 'https://blackstonesdvtl.getflycrm.com/api/v3';

// ── Helper: fetch all contracts from GetFly with pagination ──
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
      console.error(`[Sync GetFly Contracts] Page ${page} returned ${res.status}: ${errText}`);
      throw new Error(`GetFly API Error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const records: Record<string, unknown>[] = data.records || data.data || [];

    console.log(`[Sync GetFly Contracts] Page ${page}: got ${records.length} records | Total so far: ${allRecords.length + records.length}`);

    if (records.length === 0) break;
    allRecords.push(...records);

    // Check total
    const totalRecord = data.pagination?.total_record || data.total_record;
    if (totalRecord && allRecords.length >= parseInt(String(totalRecord), 10)) break;

    // Last page check
    if (records.length < perPage) break;

    // Safety limit
    if (page >= 200) {
      console.warn('[Sync GetFly Contracts] Hit 200-page safety limit.');
      break;
    }

    page++;
  }

  return allRecords;
}

// ── Helper: safely extract string field ──
function str(val: unknown): string | null {
  if (val === undefined || val === null || val === '') return null;
  return String(val);
}

// ── Helper: safely extract numeric field ──
function num(val: unknown): number {
  if (val === undefined || val === null || val === '') return 0;
  const n = parseFloat(String(val).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

// ── Helper: map GetFly contract to our DB schema ──
function mapContract(c: Record<string, unknown>) {
  // GetFly contracts may use different field names
  // We try common patterns based on the GetFly API structure
  return {
    getfly_contract_id: str(c.contract_id || c.order_id || c.id),
    contract_name: str(c.contract_name || c.order_name || c.name || c.order_code),
    contract_code: str(c.contract_code || c.order_code || c.code),
    contract_status: str(c.contract_status || c.status || c.status_name || c.order_status),
    contract_type: str(c.contract_type || c.type || c.type_name),
    remaining_days: c.remaining_days !== undefined ? parseInt(String(c.remaining_days), 10) || null : null,

    created_date: str(c.created_date || c.created_at || c.create_date),
    effective_date: str(c.effective_date || c.start_date || c.begin_date),
    expiry_date: str(c.expiry_date || c.end_date || c.expire_date),

    customer_name: str(c.customer_name || c.account_name || (c.account as Record<string, unknown>)?.account_name || (c.account_info as Record<string, unknown>)?.account_name || (c.account_info as Record<string, unknown>)?.account_code),
    person_in_charge: str(c.person_in_charge || c.assigned_name || c.manager_name || c.user_name),

    contract_value: num(c.contract_value || c.amount || c.value || c.total_amount),
    actual_value: num(c.actual_value || c.real_value),
    executed_amount: num(c.executed_amount || c.done_amount),
    paid_amount: num(c.paid_amount || c.payment_amount),
    debt_amount: num(c.debt_amount || c.debt),

    // Beneficiary fields - these are likely custom fields in GetFly
    beneficiary_name_1: str(c.beneficiary_name_1 || c.ten_nguoi_thu_huong_so_1 || c.ten_nguoi_thu_huong_1),
    beneficiary_vneid_1: str(c.beneficiary_vneid_1 || c.vneid_nguoi_thu_huong_1),
    beneficiary_phone_1: str(c.beneficiary_phone_1 || c.so_dien_thoai_nguoi_thu_huong_01 || c.sdt_nguoi_thu_huong_1),
    beneficiary_address_1: str(c.beneficiary_address_1 || c.dia_chi_nguoi_thu_huong_01 || c.dia_chi_nguoi_thu_huong_1),

    beneficiary_name_2: str(c.beneficiary_name_2 || c.ten_nguoi_thu_huong_02 || c.ten_nguoi_thu_huong_2),
    beneficiary_vneid_2: str(c.beneficiary_vneid_2 || c.vneid_nguoi_thu_huong_02),
    beneficiary_phone_2: str(c.beneficiary_phone_2 || c.so_dien_thoai_nguoi_thu_huong_02 || c.sdt_nguoi_thu_huong_2),
    beneficiary_address_2: str(c.beneficiary_address_2 || c.dia_chi_nguoi_thu_huong_02 || c.dia_chi_nguoi_thu_huong_2),

    buyer_email: str(c.buyer_email || c.email_nguoi_mua || c.email),

    synced_at: new Date().toISOString(),
    raw_data: c,
  };
}

// ── POST: Sync all contracts from GetFly ──
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    console.log('[Sync GetFly Contracts] Starting sync...');
    const contracts = await fetchAllContracts();
    console.log(`[Sync GetFly Contracts] Fetched ${contracts.length} contracts from GetFly`);

    if (contracts.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: 'Không tìm thấy hợp đồng nào trên GetFly',
      });
    }

    // Map to our schema
    const rows = contracts.map(mapContract).filter(r => r.getfly_contract_id);

    // Batch upsert in chunks of 100
    const chunkSize = 100;
    let totalUpserted = 0;

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase
        .from('getfly_contracts')
        .upsert(chunk, { onConflict: 'getfly_contract_id', ignoreDuplicates: false });

      if (error) {
        console.error('[Sync GetFly Contracts] Upsert error at chunk', i, error);
        return NextResponse.json({ error: error.message, hint: error.hint }, { status: 500 });
      }
      totalUpserted += chunk.length;

      // --- NEW: Google Drive Sync Process (Avoid Duplicates) ---
      try {
        // Fetch existing tracking records for this chunk to avoid duplicate folders/files
        const contractIds = chunk.map(c => c.getfly_contract_id);
        const { data: existingRecords } = await supabase
          .from('membership_gdrive_attachments')
          .select('*')
          .in('getfly_contract_id', contractIds);
        
        const existingMap = new Map(existingRecords?.map(r => [r.getfly_contract_id, r]) || []);

        const attachmentPromises = chunk.map(async (contractRecord) => {
          const raw = contractRecord.raw_data as any;
          if (!raw) return;

          // Placeholder Getfly image fields
          const vneidFrontUrl = raw.vneid_front_url || raw.anh_mat_truoc_vneid;
          const vneidBackUrl = raw.vneid_back_url || raw.anh_mat_sau_vneid;
          const scanFileUrl = raw.scan_file_url || raw.file_scan_hop_dong;
          const formUrl = raw.membership_form_url || raw.phieu_hoi_vien;

          if (!vneidFrontUrl && !vneidBackUrl && !scanFileUrl && !formUrl) return;

          const trackRecord = existingMap.get(contractRecord.getfly_contract_id) || {};
          let folderId = trackRecord.gdrive_folder_id;

          // 1. Create or Find Customer Folder
          if (!folderId) {
            const phone = contractRecord.beneficiary_phone_1 || raw.account_phone || raw.phone || raw.dien_thoai || '';
            const cleanPhone = phone ? ` - ${phone}` : '';
            const folderName = `${contractRecord.customer_name || 'Khach Hang'}${cleanPhone}`;
            folderId = await findOrCreateFolder(folderName);
          }

          // 2. Upload missing files only
          const updates: any = {
            getfly_contract_id: contractRecord.getfly_contract_id,
            gdrive_folder_id: folderId,
            last_sync_at: new Date().toISOString()
          };

          if (vneidFrontUrl && !trackRecord.vneid_front_file_id) {
            updates.vneid_front_file_id = await uploadUrlToDrive(vneidFrontUrl, 'VNeID_MatTruoc', folderId);
          }
          if (vneidBackUrl && !trackRecord.vneid_back_file_id) {
            updates.vneid_back_file_id = await uploadUrlToDrive(vneidBackUrl, 'VNeID_MatSau', folderId);
          }
          if (scanFileUrl && !trackRecord.contract_scan_file_id) {
            updates.contract_scan_file_id = await uploadUrlToDrive(scanFileUrl, 'BanScanHopDong', folderId);
          }
          if (formUrl && !trackRecord.membership_form_file_id) {
            updates.membership_form_file_id = await uploadUrlToDrive(formUrl, 'PhieuHoiVien', folderId);
          }

          // 3. Save tracking to DB
          await supabase.from('membership_gdrive_attachments').upsert(updates, { onConflict: 'getfly_contract_id' });
        });

        // Await all uploads for this chunk
        await Promise.all(attachmentPromises);
      } catch (attachErr) {
        console.error('[Sync GetFly Contracts] GDrive sync error:', attachErr);
      }
      // ---------------------------------------------------------
    }

    return NextResponse.json({
      success: true,
      synced: totalUpserted,
      message: `Đã sync ${totalUpserted} hợp đồng từ GetFly vào hệ thống`,
    });
  } catch (err) {
    console.error('[Sync GetFly Contracts] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── GET: Check sync status ──
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

    return NextResponse.json({
      synced_count: count || 0,
      last_sync: data?.[0]?.synced_at || null,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
