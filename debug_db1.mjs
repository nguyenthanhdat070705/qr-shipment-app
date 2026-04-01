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

console.log("URL:", V1_URL);
console.log("KEY starts with:", V1_KEY ? V1_KEY.substring(0, 15) : "NULL");

const db1 = createClient(V1_URL, V1_KEY);

async function check() {
  const { data, error } = await db1.from('dim_dam').select('*').limit(1);
  console.log("DIM_DAM:", error || data);
  
  const { data: wData, error: wErr } = await db1.from('warehouses').select('*').limit(1);
  console.log("WAREHOUSES:", wErr || wData);
}

check();
