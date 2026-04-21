import { NextRequest, NextResponse } from 'next/server';
import { uploadDocumentToDrive } from '@/lib/googleDrive';

// Mặc định tạm thời lưu vào folder gốc (giống tạo folder thành viên)
// Có thể đổi thành Drive/Folder ID mong muốn.
const PARENT_FOLDER_ID = '1bwgDD-4dl7eGlAXlOoHp2vCY-IaLeRpL';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const category = formData.get('category') as string || 'General';

    if (!file) {
      return NextResponse.json({ error: 'Không tìm thấy file trong request' }, { status: 400 });
    }

    console.log(`[Upload API] Nhận file: ${file.name}, kích thước: ${file.size} bytes`);

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadDocumentToDrive(file.name, file.type, buffer, PARENT_FOLDER_ID);

    if (!result) {
      return NextResponse.json({ error: 'Tải file lên Google Drive thất bại' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      file: {
        id: result.id,
        name: result.name,
        link: result.link,
        category
      }
    });
  } catch (error) {
    console.error('[Upload API] Lỗi upload file:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
