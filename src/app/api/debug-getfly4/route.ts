import { NextResponse } from 'next/server';

const GETFLY_API_KEY = process.env.GETFLY_API_KEY || '';
const GETFLY_BASE = 'https://blackstonesdvtl.getflycrm.com';

export async function GET() {
  const results: Record<string, unknown> = {};
  const headers = { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' };

  // Test various v3 endpoints for comments/attachments/files
  const endpoints = [
    // Account comments
    { name: 'v3_account_10_comments', url: '/api/v3/accounts/10/comments?per_page=5' },
    { name: 'v3_account_10_notes', url: '/api/v3/accounts/10/notes?per_page=5' },
    { name: 'v3_account_10_activities', url: '/api/v3/accounts/10/activities?per_page=5' },
    { name: 'v3_account_10_attachments', url: '/api/v3/accounts/10/attachments?per_page=5' },
    { name: 'v3_account_10_files', url: '/api/v3/accounts/10/files?per_page=5' },
    { name: 'v3_account_10_documents', url: '/api/v3/accounts/10/documents?per_page=5' },
    { name: 'v3_account_10_images', url: '/api/v3/accounts/10/images?per_page=5' },
    // Custom fields  
    { name: 'v3_custom_fields', url: '/api/v3/accounts/custom_fields?per_page=50' },
    // Account detail
    { name: 'v3_account_10_detail', url: '/api/v3/accounts/10' },
    // Order contracts
    { name: 'v3_order_contracts', url: '/api/v3/order_contracts?per_page=3' },
    // Tasks
    { name: 'v3_tasks', url: '/api/v3/tasks?per_page=2' },
    // Try finding an account with membership data (higher IDs = newer)  
    { name: 'v3_recent_account_17223', url: '/api/v3/accounts/17223' },
  ];

  for (const ep of endpoints) {
    try {
      const r = await fetch(`${GETFLY_BASE}${ep.url}`, {
        headers, cache: 'no-store',
      });
      const contentType = r.headers.get('content-type') || '';
      if (contentType.includes('json')) {
        const data = await r.json();
        results[ep.name] = { status: r.status, data };
      } else {
        const text = await r.text();
        results[ep.name] = { 
          status: r.status, 
          is_html: true,
          snippet: text.substring(0, 100),
        };
      }
    } catch (e: any) {
      results[ep.name] = { error: e.message };
    }
  }

  return NextResponse.json(results, { status: 200 });
}
