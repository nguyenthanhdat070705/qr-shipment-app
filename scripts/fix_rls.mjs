import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixRLS() {
  console.log('Fixing RLS on export_confirmations...');

  // Test insert first
  const { error: testErr } = await supabase
    .from('export_confirmations')
    .select('id')
    .limit(1);

  if (testErr) {
    console.error('Cannot connect:', testErr.message);
    return;
  }

  // Try to disable RLS via rpc
  const { error } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE export_confirmations DISABLE ROW LEVEL SECURITY;'
  });

  if (error) {
    console.error('RPC exec_sql failed:', error.message);
    console.log('\nPlease run this SQL manually in Supabase Dashboard > SQL Editor:');
    console.log('ALTER TABLE export_confirmations DISABLE ROW LEVEL SECURITY;');
  } else {
    console.log('✅ RLS disabled on export_confirmations!');
  }
}

fixRLS();
