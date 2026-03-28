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
let _cachedUrl: string | undefined;
let _cachedKey: string | undefined;

export function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // If real env vars are available, create/cache the real client.
  // Re-create if env vars changed (e.g., runtime vs build-time).
  if (supabaseUrl && serviceRoleKey) {
    if (!_adminClient || _cachedUrl !== supabaseUrl || _cachedKey !== serviceRoleKey) {
      _adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        // Ensure service_role bypasses RLS
        global: {
          headers: { 'x-supabase-auth-override': 'service_role' },
        },
      });
      _cachedUrl = supabaseUrl;
      _cachedKey = serviceRoleKey;
    }
    return _adminClient;
  }

  // During build: return a throwaway placeholder (NOT cached)
  // so the next real request re-creates with actual credentials.
  _adminClient = null;
  console.warn(
    '[supabase/server] Missing env vars — returning placeholder. ' +
    'Expected during `next build`.'
  );
  return createClient('https://placeholder.supabase.co', 'placeholder-key');
}
