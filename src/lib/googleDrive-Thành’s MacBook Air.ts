import { google } from 'googleapis';
import { Readable } from 'stream';

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

/**
 * Uploads a file buffer/stream to Google Drive.
 * 
 * @param fileName        Display name of the file
 * @param mimeType        MIME type of the file
 * @param fileBuffer      Buffer of the file data
 * @param parentFolderId  Google Drive folder ID of the parent
 * @returns { id, link } or null on failure
 */
export const uploadDocumentToDrive = async (fileName: string, mimeType: string, fileBuffer: Buffer, parentFolderId: string) => {
  const drive = await getDriveClient();
  if (!drive) {
    console.error('[Drive Upload] getDriveClient() returned null');
    return null;
  }

  try {
    console.log(`[Drive Upload] Uploading file "${fileName}" to parent ${parentFolderId}`);

    // Create readable stream from buffer
    const stream = new Readable();
    stream.push(fileBuffer);
    stream.push(null);

    const file = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [parentFolderId],
      },
      media: {
        mimeType: mimeType,
        body: stream,
      },
      fields: 'id, webViewLink, name',
    });

    const fileId = file.data.id;
    if (!fileId) {
      console.error('[Drive Upload] Uploaded file but got no id back:', file.data);
      return null;
    }

    const link = file.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    console.log(`[Drive Upload] ✅ File uploaded: "${file.data.name}" → ${fileId}`);
    return { id: fileId, link, name: file.data.name };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Drive Upload] Error uploading file:', msg);
    return null;
  }
};

/**
 * Gets the ID of a folder by name within a parent folder. 
 * Creates the folder if it does not exist.
 *
 * @param folderName Display name of the folder
 * @param parentFolderId ID of the parent folder
 * @returns The ID of the folder, or null on failure
 */
export const getOrCreateFolder = async (folderName: string, parentFolderId: string): Promise<string | null> => {
  const drive = await getDriveClient();
  if (!drive) return null;

  try {
    // Search for existing folder
    const query = `name = '${folderName.replace(/'/g, "\\'")}' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const res = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (res.data.files && res.data.files.length > 0) {
      console.log(`[Drive] Folder "${folderName}" already exists with ID: ${res.data.files[0].id}`);
      return res.data.files[0].id!;
    }

    // Folder does not exist, create it
    console.log(`[Drive] Folder "${folderName}" not found in parent ${parentFolderId}. Creating...`);
    const folder = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      },
      fields: 'id',
    });
    
    return folder.data.id || null;
  } catch (err) {
    console.error('[Drive] Error in getOrCreateFolder:', err);
    return null;
  }
};
