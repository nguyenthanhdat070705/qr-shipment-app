import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateFolder } from '@/lib/googleDrive';

const PARENT_FOLDER_ID = '10549CY-fI5L-f4eBtpl7nIo9mgUpqPqG';

export async function POST(req: NextRequest) {
  try {
    const { folderName } = await req.json();

    if (!folderName) {
      return NextResponse.json({ error: 'Missing folderName' }, { status: 400 });
    }

    const folderId = await getOrCreateFolder(folderName, PARENT_FOLDER_ID);
    
    if (!folderId) {
      return NextResponse.json({ error: 'Không thể tạo thư mục trên Google Drive.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, folderId });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
