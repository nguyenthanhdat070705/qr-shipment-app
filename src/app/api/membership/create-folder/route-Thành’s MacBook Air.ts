import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { createMemberFolder } from '@/lib/googleDrive';

const PARENT_FOLDER_ID = '1bwgDD-4dl7eGlAXlOoHp2vCY-IaLeRpL';

export async function POST(req: NextRequest) {
  try {
    const { member_id, member_code, full_name } = await req.json();

    if (!member_id || !member_code) {
      return NextResponse.json({ error: 'Thiếu member_id hoặc member_code' }, { status: 400 });
    }

    // Tên folder: "Mem260415001 — Nguyễn Văn A"
    const folderName = full_name
      ? `${member_code} — ${full_name.trim()}`
      : member_code;

    const hasEnvVar = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    console.log('[create-folder] Creating folder:', folderName, '| env:', hasEnvVar);

    const folderInfo = await createMemberFolder(folderName, PARENT_FOLDER_ID);
    if (!folderInfo) {
      console.error('[create-folder] createMemberFolder returned null for:', folderName);
      return NextResponse.json({
        error: 'Không thể tạo folder trên Google Drive. Kiểm tra GOOGLE_SERVICE_ACCOUNT_JSON trong Vercel env.',
        debug: { hasEnvVar, folderName, parent_folder_id: PARENT_FOLDER_ID }
      }, { status: 500 });
    }

    // Lưu folder ID vào contract_number
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('members')
      .update({
        contract_number: folderInfo.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', member_id);

    if (error) {
      console.error('[create-folder] Update contract_number error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Build link thủ công vì webViewLink có thể null với Service Account
    const folderId = folderInfo.id!;
    const folderLink = folderInfo.link || `https://drive.google.com/drive/folders/${folderId}`;

    return NextResponse.json({
      success: true,
      folder_id: folderId,
      folder_link: folderLink,
      folder_name: folderName,
    });
  } catch (err) {
    console.error('[create-folder] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
