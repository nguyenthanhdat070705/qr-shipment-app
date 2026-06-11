import { google } from 'googleapis';
import fs from 'fs';

const credentials = JSON.parse(fs.readFileSync('./google-drive-credentials.json', 'utf-8'));

const SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'];

async function test() {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });

  const drive = google.drive({ version: 'v3', auth });
  const PARENT_FOLDER_ID = '1vtWLJ0k_y-wk1oXLJDrzKRz0WJnCEbAF';
  
  try {
    const res = await drive.files.get({
      fileId: PARENT_FOLDER_ID,
      fields: 'id, name'
    });
    console.log('Success, folder name:', res.data.name);
  } catch (err: any) {
    console.error('Error fetching folder:', err.message);
  }
}

test();
