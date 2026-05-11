import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { findOrCreateFolder } from '@/lib/gdrive';

const GETFLY_API_KEY = process.env.GETFLY_API_KEY || '';
const GETFLY_BASE = 'https://blackstonesdvtl.getflycrm.com/api/v3';

// ── Helper: fetch all accounts from GetFly with pagination ──
async function fetchAllAccounts(): Promise<Record<string, unknown>[]> {
  const allRecords: Record<string, unknown>[] = [];
  let page = 1;
  const perPage = 50;

  while (true) {
    const url = `${GETFLY_BASE}/accounts?page=${page}&per_page=${perPage}`;

    const res = await fetch(url, {
      headers: {
        'X-API-KEY': GETFLY_API_KEY,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

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

    // Check pagination
    const totalRecord = data.pagination?.total_record;
    if (totalRecord && allRecords.length >= parseInt(String(totalRecord), 10)) break;
    if (records.length < perPage) break;
    if (page >= 300) {
      console.warn('[Sync Accounts] Hit 300-page safety limit.');
      break;
    }

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

    getfly_created_at: str(a.created_at),
    synced_at: new Date().toISOString(),
    raw_data: a,
  };
}

// ── POST: Full sync all accounts ──
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const url = new URL(req.url);
    const createFolders = url.searchParams.get('create_folders') === 'true';

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

    // Map to schema
    const rows = accounts.map(mapAccount).filter(r => r.getfly_account_id);

    // Batch upsert in chunks of 100
    const chunkSize = 100;
    let totalUpserted = 0;
    let foldersCreated = 0;

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);

      const { error } = await supabase
        .from('getfly_accounts')
        .upsert(chunk, { onConflict: 'getfly_account_id', ignoreDuplicates: false });

      if (error) {
        console.error('[Sync Accounts] Upsert error at chunk', i, error);
        return NextResponse.json(
          { error: error.message, hint: error.hint, chunk_index: i },
          { status: 500 }
        );
      }

      totalUpserted += chunk.length;
      console.log(`[Sync Accounts] Upserted chunk ${i / chunkSize + 1}: ${totalUpserted}/${rows.length}`);

      // Optionally create Google Drive folders
      if (createFolders) {
        for (const acc of chunk) {
          try {
            if (acc.gdrive_folder_id) continue; // Skip if already has folder

            const phone = acc.phone || acc.contact_phone || '';
            const cleanPhone = phone ? ` - ${phone}` : '';
            const folderName = `${acc.account_name || 'Khach Hang'}${cleanPhone}`;

            const folderId = await findOrCreateFolder(folderName);
            const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;

            // Update the folder ID in DB
            await supabase
              .from('getfly_accounts')
              .update({ gdrive_folder_id: folderId, gdrive_folder_url: folderUrl })
              .eq('getfly_account_id', acc.getfly_account_id);

            foldersCreated++;
          } catch (folderErr) {
            console.error(`[Sync Accounts] Folder error for ${acc.account_name}:`, folderErr);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      synced: totalUpserted,
      folders_created: foldersCreated,
      message: `Đã sync ${totalUpserted} khách hàng từ GetFly` +
        (foldersCreated > 0 ? ` | Tạo ${foldersCreated} Google Drive folders` : ''),
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
    
    // Total count
    const { count: totalCount } = await supabase
      .from('getfly_accounts')
      .select('*', { count: 'exact', head: true });

    // Membership count (ma_hoi_vien is not null)
    const { count: memberCount } = await supabase
      .from('getfly_accounts')
      .select('*', { count: 'exact', head: true })
      .not('ma_hoi_vien', 'is', null);

    // With CCCD
    const { count: cccdCount } = await supabase
      .from('getfly_accounts')
      .select('*', { count: 'exact', head: true })
      .not('so_cccd', 'is', null);

    // With Drive folder
    const { count: folderCount } = await supabase
      .from('getfly_accounts')
      .select('*', { count: 'exact', head: true })
      .not('gdrive_folder_id', 'is', null);

    // Last sync
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
