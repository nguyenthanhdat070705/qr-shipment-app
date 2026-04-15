import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { createMemberFolder } from '@/lib/googleDrive';

const PARENT_FOLDER_ID = '1bwgDD-4dl7eGlAXlOoHp2vCY-IaLeRpL';

export async function POST(req: NextRequest) {
  try {
    const { member_id, member_code } = await req.json();

    if (!member_id || !member_code) {
      return NextResponse.json({ error: 'Thiếu member_id hoặc member_code' }, { status: 400 });
    }

    // Debug: kiểm tra env var
    const hasEnvVar = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    console.log('[create-folder] GOOGLE_SERVICE_ACCOUNT_JSON present:', hasEnvVar);
    console.log('[create-folder] Creating folder:', member_code);

    // Tạo folder Drive tên theo member_code
    const folderInfo = await createMemberFolder(member_code, PARENT_FOLDER_ID);
    if (!folderInfo) {
      console.error('[create-folder] createMemberFolder returned null for:', member_code);
      return NextResponse.json({
        error: 'Không thể tạo folder trên Google Drive',
        debug: {
          hasEnvVar,
          member_code,
          parent_folder_id: PARENT_FOLDER_ID,
        }
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

    return NextResponse.json({
      success: true,
      folder_id: folderInfo.id,
      folder_link: folderInfo.link,
    });
  } catch (err) {
    console.error('[create-folder] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
