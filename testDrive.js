
const { google } = require('googleapis');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function test() {
  let credentials;
  try {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } catch(e) {
    console.log('No credentials in env');
    return;
  }
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  const drive = google.drive({ version: 'v3', auth });
  try {
    const parent = '1vtWLJ0k_y-wk1oXLJDrzKRz0WJnCEbAF';
    const res = await drive.files.list({ q: \'\' in parents\ });
    console.log('SUCCESS:', res.data);
  } catch (err) {
    console.error('ERROR from Google API:', err.message);
  }
}
test();

