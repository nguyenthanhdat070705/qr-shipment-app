require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  global: { headers: { 'x-supabase-auth-override': 'service_role' } }
});

async function testSupabase() {
  console.log('Fetching customers...');
  const { data: c, error: ce } = await supabase.from('oneoffice_crm_customers').select('id, oneoffice_id').limit(1);
  console.log('Customers check:', c ? c.length : 'error', ce ? ce.message : 'ok');

  console.log('Fetching leads...');
  const { data: l, error: le } = await supabase.from('oneoffice_crm_leads').select('id, oneoffice_id').limit(1);
  console.log('Leads check:', l ? l.length : 'error', le ? le.message : 'ok');

  console.log('Fetching products...');
  const { data: p, error: pe } = await supabase.from('products').select('id, oneoffice_id').limit(1);
  console.log('Products check:', p ? p.length : 'error', pe ? pe.message : 'ok');

  // Try to insert a dummy product to see error
  const dummy = [{
    oneoffice_id: 9999999,
    code: 'DUMMY-01',
    name: 'Dummy Product',
    cost_price: 0,
    selling_price: 0,
    is_active: true,
    updated_at: new Date().toISOString()
  }];

  const { error } = await supabase.from('products').upsert(dummy, { onConflict: 'oneoffice_id' });
  if (error) {
     console.error('Products UPSERT Error:', error.message, error.details, error.hint);
  } else {
     console.log('Products UPSERT OK!');
  }
}
testSupabase();
