import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase admin client — uses the SERVICE ROLE key.
 * ⚠️  Has full database access and bypasses Row-Level Security.
 * NEVER import this in any client component or expose it to the browser.
 * Use ONLY inside API routes and server actions.
 *
 * Lazy initialization: the client is created on first call so that
 * missing env vars cause a runtime error (not a build-time crash).
 */
let _adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_adminClient) return _adminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing server-side Supabase environment variables. ' +
      'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.'
    );
  }

  _adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      // Disable session persistence — not needed in a stateless API route
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return _adminClient;
}

