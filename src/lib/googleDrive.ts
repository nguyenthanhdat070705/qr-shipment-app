import { google } from 'googleapis';

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive',
];

/**
 * Initialize Google Drive client.
 * Priority: GOOGLE_SERVICE_ACCOUNT_JSON env var (Vercel) → local google-drive-credentials.json (dev)
 */
export const getDriveClient = async () => {
  try {
    let credentials: Record<string, string> | undefined;

    const envJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (envJson) {
      try {
        credentials = JSON.parse(envJson);
      } catch (parseErr) {
        console.error('[Drive] Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:', parseErr);
        return null;
      }
    }

    if (!credentials) {
      console.warn('[Drive] No GOOGLE_SERVICE_ACCOUNT_JSON env var — falling back to local keyFile');
    }

    const auth = new google.auth.GoogleAuth({
      ...(credentials ? { credentials } : { keyFile: 'google-drive-credentials.json' }),
      scopes: SCOPES,
    });

    const drive = google.drive({ version: 'v3', auth });
    return drive;
  } catch (err) {
    console.error('[Drive] Error initializing client:', err);
    return null;
  }
};

/**
 * Creates a sub-folder inside the given parent folder on Google Drive.
 * Folder name format: "Mem260415001 — Nguyễn Văn A"
 *
 * @param folderName   Full display name for the folder
 * @param parentFolderId  Google Drive folder ID of the parent
 * @returns { id, link } or null on failure
 */
export const createMemberFolder = async (folderName: string, parentFolderId: string) => {
  const drive = await getDriveClient();
  if (!drive) {
    console.error('[Drive] getDriveClient() returned null — check credentials');
    return null;
  }

  try {
    console.log(`[Drive] Creating folder "${folderName}" inside parent ${parentFolderId}`);

    const folder = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      },
      // Yêu cầu thêm webViewLink — đôi khi Service Account trả null, dùng fallback
      fields: 'id, webViewLink, name',
    });

    const folderId = folder.data.id;
    if (!folderId) {
      console.error('[Drive] Created folder but got no id back:', folder.data);
      return null;
    }

    // webViewLink có thể null với Service Account — tự build link
    const link = folder.data.webViewLink
      || `https://drive.google.com/drive/folders/${folderId}`;

    console.log(`[Drive] ✅ Folder created: "${folder.data.name}" → ${folderId}`);
    return { id: folderId, link };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Drive] Error creating folder:', msg);

    // Ghi rõ lỗi phổ biến để dễ debug
    if (msg.includes('insufficientPermissions') || msg.includes('forbidden')) {
      console.error('[Drive] ❌ Service Account không có quyền ghi vào folder cha. Hãy share folder Drive với email service account.');
    }
    if (msg.includes('ENOENT') || msg.includes('keyFile')) {
      console.error('[Drive] ❌ Không tìm thấy file credentials. Đặt GOOGLE_SERVICE_ACCOUNT_JSON hoặc tạo google-drive-credentials.json.');
    }
    return null;
  }
};
