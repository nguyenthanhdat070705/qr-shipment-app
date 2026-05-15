import { google } from 'googleapis';
import { Readable } from 'stream';

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Initializes the Google Drive API client using Service Account credentials.
 * Ensure GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY are set in .env.local
 */
function getDriveClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('Missing Google Drive credentials in environment variables.');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive']
  });

  return google.drive({ version: 'v3', auth });
}

/**
 * Finds a folder by name inside a specific parent folder.
 * If it doesn't exist, creates it.
 * 
 * @param folderName The name of the customer folder (e.g., 'KH001 - Nguyen Van A')
 * @returns The Drive Folder ID
 */
export async function findOrCreateFolder(folderName: string): Promise<string> {
  const drive = getDriveClient();
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  if (!rootFolderId) {
    throw new Error('Missing GOOGLE_DRIVE_ROOT_FOLDER_ID in environment variables.');
  }

  // 1. Search for existing folder
  const query = `name = '${escapeDriveQueryValue(folderName)}' and '${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  
  const searchRes = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (searchRes.data.files && searchRes.data.files.length > 0) {
    return searchRes.data.files[0].id!;
  }

  // 2. Create if not found
  const createRes = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId],
    },
    fields: 'id',
  });

  return createRes.data.id!;
}

/**
 * Finds a folder by name inside a specific parent folder (not root).
 * If it doesn't exist, creates it.
 * 
 * @param folderName The name of the subfolder
 * @param parentFolderId The parent folder ID to create the subfolder in
 * @returns The Drive Folder ID
 */
export async function findOrCreateSubFolder(folderName: string, parentFolderId: string): Promise<string> {
  const drive = getDriveClient();

  // 1. Search for existing folder inside parent
  const query = `name = '${escapeDriveQueryValue(folderName)}' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  
  const searchRes = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (searchRes.data.files && searchRes.data.files.length > 0) {
    return searchRes.data.files[0].id!;
  }

  // 2. Create if not found
  const createRes = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id',
  });

  return createRes.data.id!;
}

/**
 * Finds an existing file by exact name inside a Drive folder.
 */
export async function findFileInFolder(fileName: string, folderId: string): Promise<string | null> {
  const drive = getDriveClient();
  const query = `name = '${escapeDriveQueryValue(fileName)}' and '${folderId}' in parents and trashed = false`;

  const searchRes = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
    pageSize: 1,
  });

  return searchRes.data.files?.[0]?.id || null;
}

/**
 * Downloads a file from a URL and uploads it directly to a specific Google Drive folder.
 * 
 * @param fileUrl The URL of the image/file from Getfly
 * @param fileName The name to save the file as (e.g., 'vneid_front.jpg')
 * @param folderId The Google Drive Folder ID to upload into
 * @returns The Drive File ID
 */
export async function uploadUrlToDrive(fileUrl: string, fileName: string, folderId: string): Promise<string | null> {
  if (!fileUrl) return null;

  try {
    // 1. Download file
    const response = await fetch(fileUrl);
    if (!response.ok) {
      console.error(`[GDrive] Failed to download file from ${fileUrl}: ${response.statusText}`);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Create a readable stream from buffer
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    // 2. Upload to Drive
    const drive = getDriveClient();
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };
    
    const media = {
      mimeType: contentType,
      body: stream,
    };

    const uploadRes = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id',
    });

    return uploadRes.data.id || null;

  } catch (error) {
    console.error(`[GDrive] Exception uploading file ${fileUrl}:`, error);
    return null;
  }
}

/**
 * Uploads a URL to Drive only when the exact target file name is not present.
 * Returns whether it reused an existing file or uploaded a new one.
 */
export async function uploadUrlToDriveIfMissing(
  fileUrl: string,
  fileName: string,
  folderId: string
): Promise<{ fileId: string | null; uploaded: boolean; skipped: boolean }> {
  if (!fileUrl) return { fileId: null, uploaded: false, skipped: false };

  const existingFileId = await findFileInFolder(fileName, folderId);
  if (existingFileId) {
    return { fileId: existingFileId, uploaded: false, skipped: true };
  }

  const fileId = await uploadUrlToDrive(fileUrl, fileName, folderId);
  return { fileId, uploaded: !!fileId, skipped: false };
}

/**
 * Uploads a Buffer directly to a specific Google Drive folder.
 * Used for file uploads from the app (FormData).
 * 
 * @param buffer The file buffer
 * @param fileName The name to save the file as
 * @param folderId The Google Drive Folder ID to upload into
 * @param mimeType The MIME type of the file
 * @returns The Drive File ID
 */
export async function uploadBufferToDrive(
  buffer: Buffer,
  fileName: string,
  folderId: string,
  mimeType: string = 'application/octet-stream'
): Promise<string | null> {
  try {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const drive = getDriveClient();
    const uploadRes = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: 'id',
    });

    return uploadRes.data.id || null;
  } catch (error) {
    console.error(`[GDrive] Exception uploading buffer ${fileName}:`, error);
    return null;
  }
}
