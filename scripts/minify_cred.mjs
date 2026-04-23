import { readFileSync } from 'fs';
const c = JSON.parse(readFileSync('google-drive-credentials.json', 'utf8'));
process.stdout.write(JSON.stringify(c));
