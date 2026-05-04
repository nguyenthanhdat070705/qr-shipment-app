import { NextRequest, NextResponse } from 'next/server';

const GETFLY_API_KEY = 'UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1';
const GETFLY_BASE = 'https://blackstonesdvtl.getflycrm.com/api/v3';

async function getflyFetch(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${GETFLY_BASE}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { 'X-API-KEY': GETFLY_API_KEY },
    next: { revalidate: 60 }, // cache 1 min
  });
  return res.json();
}

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get('type') || 'accounts';
    const page = req.nextUrl.searchParams.get('page') || '1';
    const perPage = req.nextUrl.searchParams.get('per_page') || '20';
    const search = req.nextUrl.searchParams.get('search') || '';

    switch (type) {
      case 'accounts': {
        const params: Record<string, string> = { page, per_page: perPage };
        if (search) params.keyword = search;
        const data = await getflyFetch('/accounts', params);
        return NextResponse.json(data);
      }
      case 'deals': {
        const data = await getflyFetch('/orders', { order_type: '2', page, per_page: perPage });
        return NextResponse.json(data);
      }
      case 'products': {
        const data = await getflyFetch('/products', { page: '1', per_page: '100' });
        return NextResponse.json(data);
      }
      case 'tasks': {
        const data = await getflyFetch('/tasks', { page, per_page: perPage });
        return NextResponse.json(data);
      }
      case 'users': {
        const data = await getflyFetch('/users');
        return NextResponse.json(data);
      }
      case 'summary': {
        // Fetch multiple endpoints for dashboard summary
        const [accounts, deals, tasks, users] = await Promise.all([
          getflyFetch('/accounts', { page: '1', per_page: '1' }),
          getflyFetch('/orders', { order_type: '2', page: '1', per_page: '10' }),
          getflyFetch('/tasks', { page: '1', per_page: '5' }),
          getflyFetch('/users'),
        ]);

        // Calculate deals stats
        const dealRecords = deals.records || [];
        const totalDealValue = dealRecords.reduce((sum: number, d: { amount: string }) => {
          const val = parseFloat((d.amount || '0').replace(/,/g, ''));
          return sum + (isNaN(val) ? 0 : val);
        }, 0);

        return NextResponse.json({
          accounts_total: accounts.total_record || accounts.records?.length || 0,
          deals_recent: dealRecords.slice(0, 5),
          deals_total_value: totalDealValue,
          deals_count: dealRecords.length,
          tasks_recent: (tasks.data || []).slice(0, 5),
          users_count: Array.isArray(users) ? users.length : (users.data || users.records || []).length,
        });
      }
      default:
        return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
    }
  } catch (err) {
    console.error('GetFly API error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
