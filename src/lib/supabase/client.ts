import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser-side Supabase client — uses the anon/public key.
 * Safe to expose in the browser; RLS restricts what anon users can do.
 *
 * Build-safe: during `next build` on Railway, NEXT_PUBLIC_* vars may
 * not be available. We create the client lazily so it only errors
 * at actual request time, not at build time.
 */
let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If real env vars are available, create and cache the real client
  if (supabaseUrl && supabaseAnonKey) {
    if (!_client) {
      _client = createClient(supabaseUrl, supabaseAnonKey);
    }
    return _client;
  }

  // During build: return a throwaway placeholder (not cached)
  console.warn(
    '[supabase/client] Missing env vars — returning placeholder. ' +
    'Expected during `next build` on Railway.'
  );
  return createClient('https://placeholder.supabase.co', 'placeholder-key');
}


