import { google } from 'googleapis';
import fs from 'fs';

const credentials = JSON.parse(fs.readFileSync('./google-drive-credentials.json', 'utf-8'));

const SCOPES = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.file'];

async function test() {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });

  const drive = google.drive({ version: 'v3', auth });
  
  try {
    // 1. Create a new folder
    const folder = await drive.files.create({
      requestBody: {
        name: 'Văn bản pháp lý (App Sync)',
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id, name, webViewLink'
    });
    
    console.log('Created Folder ID:', folder.data.id);
    console.log('Folder Link:', folder.data.webViewLink);

    // 2. Share with user
    await drive.permissions.create({
      fileId: folder.data.id!,
      requestBody: {
        role: 'writer',
        type: 'user',
        emailAddress: 'nguyenthanhdat070705@gmail.com'
      }
    });

    console.log('Shared with nguyenthanhdat070705@gmail.com successfully!');

  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

test();
