import { NextResponse } from 'next/server';
import { getDriveClient } from '@/lib/googleDrive';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  try {
    const drive = await getDriveClient();
    if (!drive) {
      return NextResponse.json({ error: 'Google Drive client setup failed' }, { status: 500 });
    }

    const parentFolderId = '1bwgDD-4dl7eGlAXlOoHp2vCY-IaLeRpL';

    // Fetch all folders inside the parent directory (trashed=false ensures we don't get deleted ones)
    const response = await drive.files.list({
      q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, webViewLink, createdTime)',
      orderBy: 'createdTime desc',
    });

    const folders = response.data.files || [];

    // Fetch members from Supabase to match the names
    const supabase = getSupabaseAdmin();
    const { data: members, error } = await supabase
      .from('members')
      .select('member_code, full_name, status');

    if (error) {
      console.error('Failed to fetch members for contract list:', error);
    }

    const memberMap = new Map();
    if (members) {
      members.forEach((m) => memberMap.set(m.member_code, m));
    }

    // Merge Google Drive data with Supabase member data
    const contracts = folders.map(f => {
      const memberInfo = memberMap.get(f.name);
      return {
        id: f.id,
        member_code: f.name, // The folder name is the member code
        drive_link: f.webViewLink,
        created_time: f.createdTime,
        full_name: memberInfo ? memberInfo.full_name : 'Không xác định',
        status: memberInfo ? memberInfo.status : 'unknown',
      };
    });

    return NextResponse.json({ contracts });
  } catch (error: any) {
    console.error('Error fetching contracts from Drive:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
