import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { findOrCreateFolder, uploadBufferToDrive } from '@/lib/gdrive';

export const runtime = 'nodejs';

/**
 * POST /api/upload-member-docs
 * Upload a file for a specific getfly account to Google Drive
 * Body: FormData with fields: file, account_id, doc_type
 * doc_type: 'vneid_front' | 'vneid_back' | 'contract_scan' | 'membership_form'
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const accountId = formData.get('account_id') as string;
    const docType = formData.get('doc_type') as string;

    if (!file || !accountId || !docType) {
      return NextResponse.json(
        { error: 'Missing required fields: file, account_id, doc_type' },
        { status: 400 }
      );
    }

    const validTypes = ['vneid_front', 'vneid_back', 'contract_scan', 'membership_form'];
    if (!validTypes.includes(docType)) {
      return NextResponse.json(
        { error: `Invalid doc_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1. Get account info
    const { data: account, error: accErr } = await supabase
      .from('getfly_accounts')
      .select('getfly_account_id, account_name, phone, gdrive_folder_id')
      .eq('getfly_account_id', accountId)
      .single();

    if (accErr || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // 2. Find or create Google Drive folder for this customer
    let folderId = account.gdrive_folder_id;

    if (!folderId) {
      const phone = account.phone || '';
      const cleanPhone = phone ? ` - ${phone}` : '';
      const folderName = `${account.account_name || 'KH'}${cleanPhone}`;
      folderId = await findOrCreateFolder(folderName);

      // Save folder ID to account
      await supabase
        .from('getfly_accounts')
        .update({
          gdrive_folder_id: folderId,
          gdrive_folder_url: `https://drive.google.com/drive/folders/${folderId}`,
        })
        .eq('getfly_account_id', accountId);
    }

    // 3. Upload file to Google Drive
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'jpg';
    const fileNameMap: Record<string, string> = {
      vneid_front: `VNeID_MatTruoc.${ext}`,
      vneid_back: `VNeID_MatSau.${ext}`,
      contract_scan: `BanScan_HopDong.${ext}`,
      membership_form: `Phieu_HoiVien.${ext}`,
    };
    const fileName = fileNameMap[docType] || `document.${ext}`;

    const driveFileId = await uploadBufferToDrive(buffer, fileName, folderId, file.type);

    if (!driveFileId) {
      return NextResponse.json({ error: 'Failed to upload to Google Drive' }, { status: 500 });
    }

    const driveFileUrl = `https://drive.google.com/file/d/${driveFileId}/view`;

    // 4. Save file reference to getfly_accounts
    const updateField: Record<string, string> = {};
    const fieldMap: Record<string, string> = {
      vneid_front: 'vneid_front_file_id',
      vneid_back: 'vneid_back_file_id',
      contract_scan: 'contract_scan_file_id',
      membership_form: 'membership_form_file_id',
    };

    // We store in raw_data as custom fields since the main table may not have these columns yet
    // First, let's update via RPC or direct column if available
    const { data: currentData } = await supabase
      .from('getfly_accounts')
      .select('raw_data')
      .eq('getfly_account_id', accountId)
      .single();

    const updatedRawData = {
      ...(currentData?.raw_data || {}),
      [`_uploaded_${docType}_file_id`]: driveFileId,
      [`_uploaded_${docType}_url`]: driveFileUrl,
      [`_uploaded_${docType}_at`]: new Date().toISOString(),
      [`_uploaded_${docType}_name`]: file.name,
    };

    await supabase
      .from('getfly_accounts')
      .update({ raw_data: updatedRawData })
      .eq('getfly_account_id', accountId);

    return NextResponse.json({
      success: true,
      drive_file_id: driveFileId,
      drive_file_url: driveFileUrl,
      drive_folder_url: `https://drive.google.com/drive/folders/${folderId}`,
      message: `Đã upload ${fileName} lên Google Drive`,
    });
  } catch (err) {
    console.error('[Upload Member Docs] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
