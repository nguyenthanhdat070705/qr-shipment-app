import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'];

/**
 * Initialize Google Drive client.
 * Reads credentials from GOOGLE_SERVICE_ACCOUNT_JSON env var (JSON string).
 * Falls back to local google-drive-credentials.json for local dev.
 */
export const getDriveClient = async () => {
  try {
    let credentials: Record<string, string> | undefined;

    // Priority 1: env var (Vercel production)
    const envJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (envJson) {
      credentials = JSON.parse(envJson);
    }

    const auth = new google.auth.GoogleAuth({
      ...(credentials ? { credentials } : { keyFile: 'google-drive-credentials.json' }),
      scopes: SCOPES,
    });

    const drive = google.drive({ version: 'v3', auth });
    return drive;
  } catch (err) {
    console.error('Error initializing Google Drive client:', err);
    return null;
  }
};

/**
 * Creates a folder inside the specified parent folder
 * @param folderName The name of the new folder e.g. "Mem260414001"
 * @param parentFolderId The ID of the main folder where child will be created 
 * @returns The new folder's ID and webViewLink
 */
export const createMemberFolder = async (folderName: string, parentFolderId: string) => {
  const drive = await getDriveClient();
  if (!drive) return null;

  try {
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
    };

    const folder = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, webViewLink'
    });

    return {
      id: folder.data.id,
      link: folder.data.webViewLink
    };
  } catch (err) {
    console.error('Error creating folder in Google Drive:', err);
    return null;
  }
};
