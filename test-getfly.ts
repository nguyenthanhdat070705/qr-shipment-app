import { getSupabaseAdmin } from './src/lib/supabase/server';

async function main() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('getfly_contracts').select('*').limit(5);
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
