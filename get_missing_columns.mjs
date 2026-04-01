import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envV1Raw = fs.readFileSync('.env.v1', 'utf8');

function extractKey(content, key) {
  const matches = content.match(new RegExp(`^${key}=(.+)`, 'gm'));
  if (matches && matches.length > 0) {
      return matches[matches.length - 1].split('=')[1].trim();
  }
  return null;
}

const V1_URL = extractKey(envV1Raw, 'NEXT_PUBLIC_SUPABASE_URL');
const V1_KEY = extractKey(envV1Raw, 'SUPABASE_SERVICE_ROLE_KEY') || extractKey(envV1Raw, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');

const db1 = createClient(V1_URL, V1_KEY);

async function check() {
  const tables = ['dim_dam', 'fact_dam', 'fact_inventory'];
  for (const t of tables) {
    const { data } = await db1.from(t).select('*').limit(1);
    if (data && data.length > 0) {
        console.log(`Table ${t} columns: ${Object.keys(data[0]).join(', ')}`);
    } else {
        console.log(`Table ${t} is empty. Cannot infer columns via REST.`);
    }
  }
}

check();
