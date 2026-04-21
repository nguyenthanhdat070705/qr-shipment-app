import { NextRequest, NextResponse } from 'next/server';
import { uploadDocumentToDrive, getOrCreateFolder } from '@/lib/googleDrive';

// Lưu trữ vào thư mục cấu hình sẵn
const PARENT_FOLDER_ID = '1vtWLJ0k_y-wk1oXLJDrzKRz0WJnCEbAF';

const CATEGORY_NAMES: Record<string, string> = {
  finance: 'Văn bản về tài chính',
  accounting: 'Văn bản kế toán',
  quality: 'Văn bản về chất lượng',
  classification: 'Văn bản về phân loại',
  roles: 'Văn bản về nhiệm vụ và trách nhiệm',
  policy: 'Văn bản về chính sách',
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const category = formData.get('category') as string || 'General';

    if (!file) {
      return NextResponse.json({ error: 'Không tìm thấy file trong request' }, { status: 400 });
    }

    const folderName = CATEGORY_NAMES[category] || category;

    console.log(`[Upload API] Nhận file: ${file.name}, kích thước: ${file.size} bytes. Hạng mục: ${folderName}`);

    // Truy vấn hoặc tạo Folder con (theo từng danh mục) nằm bên trong Folder tổng
    const targetFolderId = await getOrCreateFolder(folderName, PARENT_FOLDER_ID);
    
    if (!targetFolderId) {
      return NextResponse.json({ error: 'Lỗi khi khởi tạo/tìm kiếm thư mục trên Google Drive' }, { status: 500 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Tải file thẳng vào Folder hạng mục đã lấy được ID
    const result = await uploadDocumentToDrive(file.name, file.type, buffer, targetFolderId);

    if (!result) {
      return NextResponse.json({ error: 'Tải file lên Google Drive thất bại' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      file: {
        id: result.id,
        name: result.name,
        link: result.link,
        category: folderName
      }
    });
  } catch (error) {
    console.error('[Upload API] Lỗi upload file:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
