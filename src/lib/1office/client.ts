/**
 * 1Office API Client
 * Base URL: https://cloud-cloud.1office.vn
 * Auth: access_token (query param)
 */

const BASE_URL = 'https://cloud-cloud.1office.vn';
const ACCESS_TOKEN = process.env.ONEOFFICE_API_KEY || '84869196569c35038d0514699999665';
const PAGE_SIZE = 50;
const DELAY_MS = 800; // Tránh rate limit

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface OneOfficeResponse<T> {
  error: boolean;
  message?: string;
  data?: T[];
  total?: number;
}

/**
 * Fetch tất cả dữ liệu từ 1 endpoint (tự động pagination)
 */
export async function fetchAll<T = Record<string, unknown>>(
  endpoint: string,
  extraParams: Record<string, string> = {}
): Promise<T[]> {
  const allData: T[] = [];
  let page = 1;

  console.log(`[1Office] Bắt đầu fetch: ${endpoint}`);

  while (true) {
    const params = new URLSearchParams({
      access_token: ACCESS_TOKEN,
      limit: String(PAGE_SIZE),
      page: String(page),
      ...extraParams,
    });

    const url = `${BASE_URL}${endpoint}?${params}`;

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json',
        },
        next: { revalidate: 0 },
      });

      const text = await res.text();

      // Parse JSON (đôi khi có HTML wrapper)
      let json: OneOfficeResponse<T> | null = null;
      try {
        json = JSON.parse(text);
      } catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          try { json = JSON.parse(match[0]); } catch { /* ignore */ }
        }
      }

      if (!json) {
        console.warn(`[1Office] [${endpoint}] Trang ${page}: không parse được JSON`);
        break;
      }

      if (json.error === true) {
        console.warn(`[1Office] [${endpoint}] Lỗi API: ${json.message}`);
        break;
      }

      if (!json.data || !Array.isArray(json.data) || json.data.length === 0) {
        console.log(`[1Office] [${endpoint}] Hết dữ liệu tại trang ${page}`);
        break;
      }

      allData.push(...json.data);
      console.log(`[1Office] [${endpoint}] Trang ${page}: +${json.data.length} bản ghi (tổng: ${allData.length})`);

      if (json.data.length < PAGE_SIZE) break;

      page++;
      await sleep(DELAY_MS);

    } catch (err) {
      console.error(`[1Office] [${endpoint}] Lỗi kết nối trang ${page}:`, err);
      break;
    }
  }

  return allData;
}

// ── Các endpoint cụ thể ────────────────────────────────────────

export async function fetchProducts() {
  return fetchAll('/api/warehouse/product/gets');
}

export async function fetchReceipts() {
  return fetchAll('/api/warehouse/receipt/gets');
}

export async function fetchContracts() {
  return fetchAll('/api/sale/contract/gets');
}

export async function fetchQuotations() {
  return fetchAll('/api/sale/quotation/gets');
}

export async function fetchStocktakes() {
  return fetchAll('/api/warehouse/stocktake/gets');
}

export async function fetchSaleOrders() {
  return fetchAll('/api/sale/order/gets');
}

export async function fetchWarehouses() {
  return fetchAll('/api/warehouse/gets');
}

export async function fetchInventory() {
  return fetchAll('/api/warehouse/inventory/gets');
}
