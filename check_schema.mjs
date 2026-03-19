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
  
  if (!supabaseUrl || !apikey) {
    console.error('Missing Supabase credentials in .env.local');
    return;
  }

  const url = `${supabaseUrl}/rest/v1/?apikey=${apikey}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    
    if (json.definitions && json.definitions['product_inventory']) {
      const { properties } = json.definitions['product_inventory'];
      console.log('--- PRODUCT_INVENTORY SCHEMA ---');
      for (const [col, info] of Object.entries(properties)) {
        console.log(`- ${col}: ${info.type} (${info.format}) - Description: ${info.description || 'none'}`);
      }
    } else {
      console.log('Table "product_inventory" not found in Supabase OpenAPI definitions.');
      const tables = Object.keys(json.definitions || {}).filter(k => k !== 'export_confirmations' && k !== 'products');
      console.log('Other available tables: ', tables.join(', '));
    }
  } catch (err) {
    console.error('Error fetching Supabase OpenAPI spec:', err.message);
  }
}

check();
