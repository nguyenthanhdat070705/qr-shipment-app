import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * GET /api/fix-rls
 * One-time fix: disable RLS or add permissive policies on export_confirmations.
 * Only call this once from the admin to fix the RLS violation.
 */
export async function GET() {
  const supabase = getSupabaseAdmin();

  const statements = [
    // Disable RLS entirely on the table (service_role always bypasses anyway)
    `ALTER TABLE IF EXISTS export_confirmations DISABLE ROW LEVEL SECURITY;`,
    // In case disable doesn't work, also add a permissive policy
    `DROP POLICY IF EXISTS "Allow all inserts" ON export_confirmations;`,
    `DROP POLICY IF EXISTS "Allow all selects" ON export_confirmations;`,
    `CREATE POLICY IF NOT EXISTS "Allow all inserts" ON export_confirmations FOR INSERT WITH CHECK (true);`,
    `CREATE POLICY IF NOT EXISTS "Allow all selects" ON export_confirmations FOR SELECT USING (true);`,
    `CREATE POLICY IF NOT EXISTS "Allow all updates" ON export_confirmations FOR UPDATE USING (true);`,
  ];

  const results: { sql: string; status: string }[] = [];

  for (const sql of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql });
      results.push({ sql: sql.slice(0, 60), status: error ? `error: ${error.message}` : 'ok' });
    } catch (e: any) {
      results.push({ sql: sql.slice(0, 60), status: `exception: ${e.message}` });
    }
  }

  return NextResponse.json({ success: true, results });
}
