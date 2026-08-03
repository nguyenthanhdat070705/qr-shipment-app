import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import * as XLSX from 'xlsx';

const BASE_URL = process.env.ONEOFFICE_BASE_URL || 'https://blackstones.1office.vn';
const TOKEN = process.env.ONEOFFICE_PRODUCTS_TOKEN || process.env.ONEOFFICE_API_KEY;
const PAGE_SIZE = Number(process.env.ONEOFFICE_PAGE_SIZE || 100);
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.resolve('outputs', 'oneoffice-products');

if (!TOKEN) {
  throw new Error('Missing ONEOFFICE_PRODUCTS_TOKEN or ONEOFFICE_API_KEY');
}

const now = new Date();

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const cleaned = String(value).replace(/[^\d.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseInventory(infoInventory, product) {
  if (!infoInventory || !String(infoInventory).trim()) return [];

  return String(infoInventory)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.*?):\s*([+-]?\d+(?:[.,]\d+)?)\s*(?:\((.*?)\))?\s*$/);
      const warehouse = match ? match[1].trim() : line;
      const quantity = match ? parseNumber(match[2]) : 0;
      const unit = match?.[3]?.trim() || product.unit_id || '';
      return {
        product_id: product.ID,
        product_code: product.code || String(product.ID),
        product_name: product.title || `SP #${product.ID}`,
        warehouse,
        quantity,
        unit,
        selling_price: parseNumber(product.price),
        cost_price: parseNumber(product.price_buy),
        stock_value_selling: quantity * parseNumber(product.price),
        stock_value_cost: quantity * parseNumber(product.price_buy),
      };
    });
}

async function fetchAllProducts() {
  const all = [];
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      access_token: TOKEN,
      limit: String(PAGE_SIZE),
      page: String(page),
    });
    const url = `${BASE_URL}/api/warehouse/product/gets?${params}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
    });
    const json = await response.json();

    if (json.error) {
      throw new Error(json.message || `1Office API error at page ${page}`);
    }

    const data = Array.isArray(json.data) ? json.data : [];
    all.push(...data);
    console.log(`Fetched page ${page}: ${data.length} records`);

    if (data.length < PAGE_SIZE) break;
    page += 1;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return all;
}

function summarizeBy(rows, key, metrics) {
  const map = new Map();
  for (const row of rows) {
    const label = row[key] || '(Trống)';
    if (!map.has(label)) {
      map.set(label, Object.fromEntries(metrics.map((metric) => [metric, 0])));
    }
    const target = map.get(label);
    for (const metric of metrics) {
      target[metric] += parseNumber(row[metric]);
    }
  }
  return [...map.entries()]
    .map(([label, values]) => ({ label, ...values }))
    .sort((a, b) => (b.stock_value_selling || b.products || b.quantity || 0) - (a.stock_value_selling || a.products || a.quantity || 0));
}

function addSheet(workbook, name, rows) {
  const worksheet = XLSX.utils.json_to_sheet(rows, { cellDates: true });
  XLSX.utils.book_append_sheet(workbook, worksheet, name);
}

function aoaSheet(workbook, name, rows) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, name);
}

async function main() {
  const rawProducts = await fetchAllProducts();
  const inventoryRows = rawProducts.flatMap((product) => parseInventory(product.infoInventory, product));

  const products = rawProducts.map((item) => {
    const productInventory = parseInventory(item.infoInventory, item);
    const totalQuantity = productInventory.reduce((sum, row) => sum + row.quantity, 0);
    const sellingPrice = parseNumber(item.price);
    const costPrice = parseNumber(item.price_buy);
    return {
      oneoffice_id: item.ID,
      code: item.code || String(item.ID),
      barcode: item.barcode || '',
      name: item.title || `SP #${item.ID}`,
      category: item.product_category || '',
      product_type: item.product_type || '',
      manage_type: item.manage_type || '',
      unit: item.unit_id || '',
      selling_price: sellingPrice,
      cost_price: costPrice,
      margin_value: sellingPrice - costPrice,
      margin_pct: sellingPrice ? (sellingPrice - costPrice) / sellingPrice : 0,
      status: item.status || '',
      is_active: item.status === 'Hoạt động' || item.status === 'active' || item.status === 1,
      total_quantity: totalQuantity,
      warehouse_count: new Set(productInventory.map((row) => row.warehouse)).size,
      stock_value_selling: totalQuantity * sellingPrice,
      stock_value_cost: totalQuantity * costPrice,
      supplier_list: item.supplier_list || '',
      date_created: item.date_created || '',
      raw_inventory: item.infoInventory || '',
      description: item.desc || '',
    };
  });

  const categoryRows = summarizeBy(
    products.map((product) => ({
      category: product.category || product.product_type || '(Trống)',
      products: 1,
      active_products: product.is_active ? 1 : 0,
      quantity: product.total_quantity,
      stock_value_selling: product.stock_value_selling,
      stock_value_cost: product.stock_value_cost,
    })),
    'category',
    ['products', 'active_products', 'quantity', 'stock_value_selling', 'stock_value_cost'],
  ).map((row) => ({
    category: row.label,
    products: row.products,
    active_products: row.active_products,
    total_quantity: row.quantity,
    stock_value_selling: row.stock_value_selling,
    stock_value_cost: row.stock_value_cost,
  }));

  const warehouseRows = summarizeBy(inventoryRows, 'warehouse', ['quantity', 'stock_value_selling', 'stock_value_cost'])
    .map((row) => ({
      warehouse: row.label,
      total_quantity: row.quantity,
      stock_value_selling: row.stock_value_selling,
      stock_value_cost: row.stock_value_cost,
    }));

  const activeCount = products.filter((product) => product.is_active).length;
  const stockedCount = products.filter((product) => product.total_quantity > 0).length;
  const totalQty = products.reduce((sum, product) => sum + product.total_quantity, 0);
  const sellingValue = products.reduce((sum, product) => sum + product.stock_value_selling, 0);
  const costValue = products.reduce((sum, product) => sum + product.stock_value_cost, 0);

  const topProducts = [...products]
    .sort((a, b) => b.stock_value_selling - a.stock_value_selling)
    .slice(0, 20)
    .map((product) => ({
      code: product.code,
      name: product.name,
      total_quantity: product.total_quantity,
      selling_price: product.selling_price,
      stock_value_selling: product.stock_value_selling,
    }));

  const dashboard = [
    ['Blackstones 1Office Product Dashboard', '', '', '', ''],
    ['Last sync', now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }), '', 'Refresh policy', 'Reset/làm mới 3 ngày/lần'],
    [],
    ['Metric', 'Value', '', 'Metric', 'Value'],
    ['Total products', products.length, '', 'Active products', activeCount],
    ['Products with stock', stockedCount, '', 'Inventory lines', inventoryRows.length],
    ['Total quantity', totalQty, '', 'Warehouses', warehouseRows.length],
    ['Stock value at selling price', sellingValue, '', 'Stock value at cost price', costValue],
    ['Estimated margin value', sellingValue - costValue, '', 'Active ratio', products.length ? activeCount / products.length : 0],
    [],
    ['Top categories by selling stock value', '', '', 'Top warehouses by selling stock value', ''],
    ['Category', 'Stock value', 'Quantity', 'Warehouse', 'Stock value'],
    ...Array.from({ length: 10 }).map((_, index) => [
      categoryRows[index]?.category || '',
      categoryRows[index]?.stock_value_selling || '',
      categoryRows[index]?.total_quantity || '',
      warehouseRows[index]?.warehouse || '',
      warehouseRows[index]?.stock_value_selling || '',
    ]),
  ];

  const refreshLog = [
    {
      synced_at_vietnam: now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
      source_base_url: BASE_URL,
      endpoint: '/api/warehouse/product/gets',
      refresh_policy: 'Reset/làm mới 3 ngày/lần',
      products: products.length,
      inventory_lines: inventoryRows.length,
    },
  ];

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUTPUT_DIR, 'oneoffice_products_raw.json'), JSON.stringify({ synced_at: now.toISOString(), products: rawProducts }, null, 2));
  await fs.writeFile(path.join(OUTPUT_DIR, 'oneoffice_products_summary.json'), JSON.stringify({
    synced_at: now.toISOString(),
    product_count: products.length,
    active_count: activeCount,
    stocked_count: stockedCount,
    inventory_lines: inventoryRows.length,
    warehouse_count: warehouseRows.length,
    total_quantity: totalQty,
    stock_value_selling: sellingValue,
    stock_value_cost: costValue,
  }, null, 2));

  const workbook = XLSX.utils.book_new();
  aoaSheet(workbook, 'Dashboard', dashboard);
  addSheet(workbook, 'Products', products);
  addSheet(workbook, 'Inventory_By_Warehouse', inventoryRows);
  addSheet(workbook, 'Category_Summary', categoryRows);
  addSheet(workbook, 'Warehouse_Summary', warehouseRows);
  addSheet(workbook, 'Top_Products', topProducts);
  addSheet(workbook, 'Refresh_Log', refreshLog);

  const outputPath = path.join(OUTPUT_DIR, 'Blackstones_1Office_Product_Dashboard.xlsx');
  XLSX.writeFile(workbook, outputPath, { compression: true });
  console.log(JSON.stringify({
    outputPath,
    product_count: products.length,
    active_count: activeCount,
    stocked_count: stockedCount,
    inventory_lines: inventoryRows.length,
    warehouse_count: warehouseRows.length,
    total_quantity: totalQty,
    stock_value_selling: sellingValue,
    stock_value_cost: costValue,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
