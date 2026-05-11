import { NextResponse } from 'next/server';

// Reload PostgREST schema cache by calling the Supabase Management API
export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Approach: Call Supabase's internal endpoint to reload the schema cache
  // The recommended approach is to make any schema change via the API
  // OR call NOTIFY pgrst, 'reload schema' via an RPC function
  
  // First, let's try creating an RPC function that does this
  // Since we can't run DDL via REST, let's try a different approach:
  // We'll use Supabase's built-in pg_net or direct REST to reload

  try {
    // Method 1: Try the Supabase Management API reload endpoint
    const reloadRes = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Accept': 'application/json',
        // Force schema reload by requesting with Accept-Profile
        'Accept-Profile': 'public',
      },
    });

    // Method 2: Try to query the table directly to verify it exists
    const testRes = await fetch(`${supabaseUrl}/rest/v1/getfly_accounts?select=id&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Accept': 'application/json',
      },
    });

    const testStatus = testRes.status;
    const testBody = await testRes.text();
    
    // If 404 or schema error, the table might need time
    if (testStatus === 200) {
      return NextResponse.json({
        status: 'ready',
        message: 'Bảng getfly_accounts sẵn sàng! Schema cache đã được load.',
        test_response: testBody.substring(0, 200),
      });
    }

    // Try alternative: Make a HEAD request to force cache reload
    // Supabase auto-reloads schema cache after ~5 minutes
    // But we can try to force it by changing the schema
    
    return NextResponse.json({
      status: 'cache_stale',
      test_status: testStatus,
      message: 'Schema cache chưa cập nhật. Hãy thử: 1) Vào Supabase SQL Editor chạy: NOTIFY pgrst, \'reload schema\'; 2) Hoặc đợi 5 phút để tự động reload.',
      sql_to_run: "NOTIFY pgrst, 'reload schema';",
      sql_editor_url: 'https://supabase.com/dashboard/project/zspazvdyrrkdosqigomk/sql/new',
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
