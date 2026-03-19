import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase admin client — uses the SERVICE ROLE key.
 * ⚠️  Has full database access and bypasses Row-Level Security.
 * NEVER import this in any client component or expose it to the browser.
 * Use ONLY inside API routes and server actions.
 *
 * Build-safe: won't throw during `next build` on Railway.
 */
let _adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // If real env vars are available, create and cache the real client
  if (supabaseUrl && serviceRoleKey) {
    if (!_adminClient) {
      _adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }
    return _adminClient;
  }

  // During build: return a throwaway placeholder (not cached)
  console.warn(
    '[supabase/server] Missing env vars — returning placeholder. ' +
    'Expected during `next build` on Railway.'
  );
  return createClient('https://placeholder.supabase.co', 'placeholder-key');
}


