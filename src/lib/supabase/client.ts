import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser-side Supabase client — uses the anon/public key.
 * Safe to expose in the browser; RLS restricts what anon users can do.
 *
 * Lazy initialization: created on first call to avoid build-time throws
 * when env vars are absent in CI/build environments.
 */
let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.'
    );
  }

  _client = createClient(supabaseUrl, supabaseAnonKey);
  return _client;
}

