import fs from 'fs';

function loadEnv() {
  const content = fs.readFileSync('.env.local', 'utf-8');
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  });
}

loadEnv();

async function check() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apikey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const url = `${supabaseUrl}/rest/v1/?apikey=${apikey}`;
  const res = await fetch(url);
  const json = await res.json();
  const table = json.definitions['shipment_confirmations'];
  if (table) {
    console.log('--- shipment_confirmations SCHEMA ---');
    for (const [col, info] of Object.entries(table.properties)) {
      console.log(`${col}: ${info.type}`);
    }
  } else {
    console.log('shipment_confirmations NOT FOUND');
    console.log('Tables available:', Object.keys(json.definitions).join(', '));
  }
}
check();
