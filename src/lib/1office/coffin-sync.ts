import { randomUUID } from 'node:crypto';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { fetchInventory, fetchWarehouses } from './client';

const BATCH_SIZE = 50;
const COFFIN_CODE = /^2AQ/i;
const PROTECTED_WAREHOUSES = new Set(['ham long', 'kha van can', 'kinh duong vuong']);
const UNCONFIRMED_WAREHOUSE_ALIASES = new Set(['to ky']);

type OneOfficeRecord = Record<string, unknown>;

export interface CoffinSyncResult {
  table: string;
  fetched: number;
  upserted: number;
  errors: number;
  duration_ms: number;
  error_msg?: string;
  note?: string;
}

function normalize(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/^\s*kho\s+/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizedFields(record: OneOfficeRecord): Map<string, unknown> {
  return new Map(Object.entries(record).map(([key, value]) => [normalize(key), value]));
}

function field(record: OneOfficeRecord, ...names: string[]): unknown {
  const fields = normalizedFields(record);
  for (const name of names) {
    const value = fields.get(normalize(name));
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function stringValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>;
    return stringValue(item.name ?? item.title ?? item.value ?? item.code);
  }
  return '';
}

function numberValue(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function sourceIsActive(value: unknown): boolean {
  if (value === false || value === 0 || value === '0') return false;
  const status = normalize(value);
  if (/^(inactive|blocked|disabled|ngung|ngung ban|ngung kinh doanh|tam ngung)$/.test(status)) return false;
  return true;
}

function sourceColor(product: OneOfficeRecord): string {
  const direct = stringValue(field(product, 'Mau_sac', 'mau_sac', 'color', 'colour', 'finish'));
  if (direct) return direct;

  const title = stringValue(field(product, 'title', 'name', 'product_name'));
  const titleColor = title.match(/(?:màu sắc?|colou?r|finish)\s*[:=\-]\s*([^,;|/]+)/i)?.[1]?.trim();
  if (titleColor) return titleColor;

  const properties = field(product, 'properties', 'attributes');
  if (!Array.isArray(properties)) return '';

  for (const rawProperty of properties) {
    if (!rawProperty || typeof rawProperty !== 'object') continue;
    const property = rawProperty as OneOfficeRecord;
    const name = stringValue(field(property, 'name', 'title', 'label', 'field_name'));
    if (!/mau sac|color|colour|finish/i.test(normalize(name))) continue;
    const value = stringValue(field(property, 'value', 'title', 'text', 'content'));
    if (value) return value;
  }
  return '';
}

function parseId(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseWarehouseNameMap(): Record<string, string> {
  const raw = process.env.ONEOFFICE_WAREHOUSE_NAME_MAP_JSON;
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .filter(([, value]) => typeof value === 'string' && value.trim())
        .map(([key, value]) => [normalize(key), String(value).trim()])
    );
  } catch {
    throw new Error('ONEOFFICE_WAREHOUSE_NAME_MAP_JSON phải là JSON dạng {"tên kho 1Office":"tên kho web app"}.');
  }
}

function isSubWarehouse(warehouse: OneOfficeRecord): boolean {
  const name = normalize(sourceWarehouseName(warehouse));
  return /(^| )(ky gui|dat coc|hang hong|bi hong|hu hong|damaged|deposit|consignment|bao hanh)( |$)/.test(name);
}

function sourceProductId(product: OneOfficeRecord): string {
  return stringValue(field(product, 'ID', 'product_id', 'productId', 'id'));
}

function sourceProductCode(product: OneOfficeRecord): string {
  return stringValue(field(product, 'product_code', 'ma_hom', 'code', 'product_code_id'));
}

function sourceWarehouseName(warehouse: OneOfficeRecord): string {
  return stringValue(field(warehouse, 'name', 'title', 'warehouse_name', 'ten_kho', 'Kho'));
}

function sourceWarehouseCode(warehouse: OneOfficeRecord): string {
  return stringValue(field(warehouse, 'code', 'warehouse_code', 'ma_kho'));
}

function sourceWarehouseId(warehouse: OneOfficeRecord): string {
  return stringValue(field(warehouse, 'ID', 'warehouse_id', 'id'));
}

async function upsertRows(table: string, rows: OneOfficeRecord[], conflict: string) {
  let upserted = 0;
  let errors = 0;
  let firstError = '';

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await getSupabaseAdmin().from(table).upsert(batch, {
      onConflict: conflict,
      ignoreDuplicates: false,
    });
    if (error) {
      errors += batch.length;
      firstError ||= error.message;
      console.error(`[1Office] Upsert ${table} lỗi:`, error.message);
    } else {
      upserted += batch.length;
    }
  }
  return { upserted, errors, firstError };
}

async function runStep(
  table: string,
  fetched: number,
  work: () => Promise<{ upserted: number; errors: number; note?: string }>,
): Promise<CoffinSyncResult> {
  const start = Date.now();
  try {
    const result = await work();
    return {
      table,
      fetched,
      upserted: result.upserted,
      errors: result.errors,
      duration_ms: Date.now() - start,
      ...(result.errors ? { error_msg: 'Một hoặc nhiều bản ghi không đồng bộ được.' } : {}),
      ...(result.note ? { note: result.note } : {}),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[1Office] Sync ${table} lỗi:`, message);
    return { table, fetched, upserted: 0, errors: 1, duration_ms: Date.now() - start, error_msg: message };
  }
}

async function syncCoffinCatalog(products: OneOfficeRecord[]): Promise<CoffinSyncResult> {
  const startedAt = Date.now();
  const byCode = new Map<string, OneOfficeRecord>();
  for (const product of products) {
    const code = sourceProductCode(product).toUpperCase();
    if (COFFIN_CODE.test(code)) byCode.set(code, product);
  }
  const selected = [...byCode.entries()];
  const supabase = getSupabaseAdmin();
  const existingByCode = new Map<string, OneOfficeRecord>();

  for (let i = 0; i < selected.length; i += BATCH_SIZE) {
    const codes = selected.slice(i, i + BATCH_SIZE).map(([code]) => code);
    const { data, error } = await supabase.from('dim_hom').select('*').in('ma_hom', codes);
    if (error) throw new Error(`Không đọc được dim_hom để tránh ghi đè dữ liệu hiện có: ${error.message}`);
    for (const row of data || []) existingByCode.set(String(row.ma_hom).toUpperCase(), row as OneOfficeRecord);
  }

  const rows = selected.map(([code, product]) => {
    const current = existingByCode.get(code);
    const title = stringValue(field(product, 'title', 'name', 'product_name')) || code;
    const color = sourceColor(product) || stringValue(current?.Mau_sac ?? current?.mau_sac);
    const activeValue = field(product, 'is_active', 'status');
    const isActive = current ? current.is_active !== false : sourceIsActive(activeValue);

    return {
      ma_hom: code,
      ten_hom: title,
      ten_hom_the_hien: title,
      ...(color ? { Mau_sac: color } : {}),
      is_active: isActive,
    };
  });

  const { upserted, errors, firstError } = await upsertRows('dim_hom', rows, 'ma_hom');
  return {
    table: 'dim_hom',
    fetched: products.length,
    upserted,
    errors,
    duration_ms: Date.now() - startedAt,
    ...(firstError ? { error_msg: firstError } : {}),
    note: `${selected.length} mã 2AQ duy nhất; các trường do web app quản lý được giữ nguyên.`,
  };
}

function buildWarehouseLookups(warehouses: OneOfficeRecord[]) {
  const byId = new Map<string, OneOfficeRecord>();
  const byCode = new Map<string, OneOfficeRecord>();
  for (const warehouse of warehouses) {
    const id = sourceWarehouseId(warehouse);
    const code = sourceWarehouseCode(warehouse);
    if (id) byId.set(id, warehouse);
    if (code) byCode.set(code.toLowerCase(), warehouse);
  }
  return { byId, byCode };
}

function resolveWarehouse(
  record: OneOfficeRecord,
  lookups: ReturnType<typeof buildWarehouseLookups>,
): { name: string; code: string; id: string } {
  const warehouseRef = field(record, 'warehouse', 'inventory_id');
  const nestedWarehouse = warehouseRef && typeof warehouseRef === 'object'
    ? warehouseRef as OneOfficeRecord
    : undefined;
  const directName = stringValue(field(record, 'warehouse_name', 'Kho', 'ten_kho'))
    || (nestedWarehouse ? sourceWarehouseName(nestedWarehouse) : '');
  const rawRef = typeof warehouseRef === 'string' || typeof warehouseRef === 'number'
    ? String(warehouseRef)
    : '';
  const rawId = stringValue(field(record, 'warehouse_id', 'kho_id'))
    || (nestedWarehouse ? sourceWarehouseId(nestedWarehouse) : '')
    || (rawRef && lookups.byId.has(rawRef) ? rawRef : '');
  const rawCode = stringValue(field(record, 'warehouse_code', 'ma_kho'))
    || (nestedWarehouse ? sourceWarehouseCode(nestedWarehouse) : '');
  const source = (rawId && lookups.byId.get(rawId))
    || (rawCode && lookups.byCode.get(rawCode.toLowerCase()))
    || (rawRef && lookups.byId.get(rawRef))
    || (rawRef && lookups.byCode.get(rawRef.toLowerCase()));
  const name = directName || (source ? sourceWarehouseName(source) : rawRef);
  const code = rawCode || (source ? sourceWarehouseCode(source) : '');
  const id = rawId || (source ? sourceWarehouseId(source) : '');
  return { name, code, id };
}

function mapInventoryRows(
  inventory: OneOfficeRecord[],
  products: OneOfficeRecord[],
  warehouses: OneOfficeRecord[],
  aggregateByProductWarehouse = true,
) {
  const productById = new Map<string, OneOfficeRecord>();
  const productByCode = new Map<string, OneOfficeRecord>();
  for (const product of products) {
    const id = sourceProductId(product);
    const code = sourceProductCode(product).toUpperCase();
    if (id) productById.set(id, product);
    if (code) productByCode.set(code, product);
  }
  const warehouseLookups = buildWarehouseLookups(warehouses);
  const rowsByKey = new Map<string, OneOfficeRecord>();

  for (const record of inventory) {
    const productId = stringValue(field(record, 'product_id', 'productId', 'item_id'));
    const relatedProduct = productId ? productById.get(productId) : undefined;
    const nestedProduct = field(record, 'product', 'item');
    const nested = nestedProduct && typeof nestedProduct === 'object' ? nestedProduct as OneOfficeRecord : undefined;
    const productCode = (
      sourceProductCode(record)
      || (nested ? sourceProductCode(nested) : '')
      || (relatedProduct ? sourceProductCode(relatedProduct) : '')
    ).toUpperCase();
    if (!COFFIN_CODE.test(productCode)) continue;

    const warehouse = resolveWarehouse(record, warehouseLookups);
    if (!warehouse.name) continue;

    const productName = stringValue(field(record, 'product_name', 'ten_hom', 'name'))
      || (nested ? stringValue(field(nested, 'title', 'name')) : '')
      || (relatedProduct ? stringValue(field(relatedProduct, 'title', 'name')) : '')
      || productByCode.get(productCode)?.title as string
      || productCode;
    const quantity = numberValue(field(record, 'quantity', 'so_luong', 'Số lượng', 'qty', 'amount'));
    const available = numberValue(field(record, 'available_qty', 'so_luong_kha_dung', 'available', 'Ghi chú') ?? quantity);
    const unit = stringValue(field(record, 'unit', 'don_vi_tinh', 'unit_name'));
    const oneofficeId = parseId(field(record, 'ID', 'row_id', 'id'));
    const warehouseKey = warehouse.code || normalize(warehouse.name);
    const sourceKey = aggregateByProductWarehouse
      ? `row:${productCode}|${warehouseKey}`
      : oneofficeId ? `id:${oneofficeId}` : `row:${productCode}|${warehouseKey}`;
    const current = rowsByKey.get(sourceKey);

    if (current) {
      current.oneoffice_id = null;
      current.quantity = numberValue(current.quantity) + quantity;
      current.available_qty = numberValue(current.available_qty) + available;
      current.last_synced_at = new Date().toISOString();
      if (!current.unit && unit) current.unit = unit;
    } else {
      rowsByKey.set(sourceKey, {
        oneoffice_id: oneofficeId,
        source_key: sourceKey,
        product_code: productCode,
        product_name: productName,
        warehouse_name: warehouse.name,
        warehouse_code: warehouse.code || null,
        quantity,
        available_qty: available,
        unit: unit || null,
        last_synced_at: new Date().toISOString(),
      });
    }
  }
  return [...rowsByKey.values()];
}

async function applyInventoryToWebApp(
  snapshots: OneOfficeRecord[],
  warehouses: OneOfficeRecord[],
): Promise<CoffinSyncResult> {
  const startedAt = Date.now();
  const supabase = getSupabaseAdmin();
  const nameMap = parseWarehouseNameMap();
  const unresolved: string[] = [];
  const targetNameBySource = new Map<string, string>();
  const warehouseByName = new Map<string, OneOfficeRecord>();

  const { data: currentWarehouses, error: warehouseReadError } = await supabase
    .from('dim_kho')
    .select('id, ma_kho, ten_kho');
  if (warehouseReadError) {
    return { table: 'fact_inventory', fetched: snapshots.length, upserted: 0, errors: 1, duration_ms: Date.now() - startedAt, error_msg: warehouseReadError.message };
  }
  for (const warehouse of currentWarehouses || []) {
    warehouseByName.set(normalize(warehouse.ten_kho), warehouse as OneOfficeRecord);
  }

  const sourceWarehouseByName = new Map<string, OneOfficeRecord>();
  for (const warehouse of warehouses) {
    const name = sourceWarehouseName(warehouse);
    if (name) sourceWarehouseByName.set(normalize(name), warehouse);
  }
  for (const row of snapshots) {
    const name = stringValue(row.warehouse_name);
    const key = normalize(name);
    if (key && !sourceWarehouseByName.has(key)) sourceWarehouseByName.set(key, { name });
  }

  let createdWarehouses = 0;
  for (const [sourceKey, sourceWarehouse] of sourceWarehouseByName) {
    if (isSubWarehouse(sourceWarehouse)) continue;
    const targetName = nameMap[sourceKey] || sourceWarehouseName(sourceWarehouse);
    const targetKey = normalize(targetName);
    if (!targetKey || PROTECTED_WAREHOUSES.has(sourceKey) || PROTECTED_WAREHOUSES.has(targetKey)) continue;
    if (UNCONFIRMED_WAREHOUSE_ALIASES.has(sourceKey) && !nameMap[sourceKey]) {
      unresolved.push(sourceWarehouseName(sourceWarehouse));
      continue;
    }

    let target = warehouseByName.get(targetKey);
    if (!target) {
      const id = sourceWarehouseId(sourceWarehouse);
      const sourceCode = sourceWarehouseCode(sourceWarehouse);
      const proposedCode = sourceCode || `1O-${id || targetKey.replace(/\s+/g, '-')}`;
      const { data: codeCollision, error: codeReadError } = await supabase
        .from('dim_kho')
        .select('id, ma_kho, ten_kho')
        .eq('ma_kho', proposedCode)
        .maybeSingle();
      if (codeReadError) {
        unresolved.push(sourceWarehouseName(sourceWarehouse));
        continue;
      }
      const fallbackCode = `1O-${id || targetKey.replace(/\s+/g, '-')}`;
      const maKho = codeCollision
        ? `${fallbackCode}-${randomUUID().slice(0, 8)}`
        : proposedCode;
      const displayName = targetName.replace(/^Kho\s+/i, '').trim();
      const { data: created, error: createError } = await supabase
        .from('dim_kho')
        .insert({ ma_kho: maKho, ten_kho: displayName, is_active: true })
        .select('id, ma_kho, ten_kho')
        .single();
      if (createError || !created) {
        unresolved.push(sourceWarehouseName(sourceWarehouse));
        console.error('[1Office] Không thể tạo kho mới:', createError?.message || 'không có dữ liệu trả về');
        continue;
      }
      target = created as OneOfficeRecord;
      warehouseByName.set(targetKey, target);
      createdWarehouses++;
    }
    targetNameBySource.set(sourceKey, String(target.id));
  }

  if (!snapshots.length) {
    return {
      table: 'fact_inventory', fetched: 0, upserted: 0, errors: 0, duration_ms: Date.now() - startedAt,
      note: 'Không có dòng tồn 2AQ trong ảnh chụp 1Office.',
    };
  }

  const codes = [...new Set(snapshots.map(row => String(row.product_code || '').toUpperCase()).filter(code => COFFIN_CODE.test(code)))];
  const productByCode = new Map<string, string>();
  for (let i = 0; i < codes.length; i += BATCH_SIZE) {
    const { data, error } = await supabase.from('dim_hom').select('id, ma_hom').in('ma_hom', codes.slice(i, i + BATCH_SIZE));
    if (error) {
      return { table: 'fact_inventory', fetched: snapshots.length, upserted: 0, errors: 1, duration_ms: Date.now() - startedAt, error_msg: error.message };
    }
    for (const row of data || []) productByCode.set(String(row.ma_hom).toUpperCase(), String(row.id));
  }

  const whIds = [...new Set(targetNameBySource.values())];
  const productIds = [...new Set(productByCode.values())];
  const existingRows: OneOfficeRecord[] = [];
  for (let i = 0; whIds.length > 0 && i < productIds.length; i += BATCH_SIZE) {
    const productBatch = productIds.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('fact_inventory')
      .select('*')
      .in('Tên hàng hóa', productBatch)
      .in('Kho', whIds);
    if (error) {
      return { table: 'fact_inventory', fetched: snapshots.length, upserted: 0, errors: 1, duration_ms: Date.now() - startedAt, error_msg: error.message };
    }
    existingRows.push(...(data || []) as OneOfficeRecord[]);
  }

  const existingByKey = new Map<string, OneOfficeRecord[]>();
  for (const row of existingRows) {
    const key = `${row['Tên hàng hóa']}|${row['Kho']}`;
    const records = existingByKey.get(key) || [];
    records.push(row);
    existingByKey.set(key, records);
  }

  const liveRowsByKey = new Map<string, OneOfficeRecord>();
  for (const snapshot of snapshots) {
    const productCode = String(snapshot.product_code || '').toUpperCase();
    const warehouseId = targetNameBySource.get(normalize(snapshot.warehouse_name));
    if (!warehouseId) continue;
    const key = `${productCode}|${warehouseId}`;
    const current = liveRowsByKey.get(key);
    if (current) {
      current.quantity = numberValue(current.quantity) + numberValue(snapshot.quantity);
      current.available_qty = numberValue(current.available_qty) + numberValue(snapshot.available_qty);
    } else {
      liveRowsByKey.set(key, { ...snapshot, product_code: productCode, target_warehouse_id: warehouseId });
    }
  }

  const operations: (() => Promise<{ error: string | null }>)[] = [];
  let missingProductCount = 0;
  for (const snapshot of liveRowsByKey.values()) {
    const code = String(snapshot.product_code || '').toUpperCase();
    const homId = productByCode.get(code);
    const khoId = String(snapshot.target_warehouse_id || '');
    if (!homId) { missingProductCount++; continue; }
    if (!khoId) continue;

    const key = `${homId}|${khoId}`;
    const existing = existingByKey.get(key) || [];
    const inventoryValues = {
      'Số lượng': numberValue(snapshot.quantity),
      'Ghi chú': numberValue(snapshot.available_qty),
    };

    if (existing.length > 1) {
      unresolved.push(`${snapshot.product_code} @ ${snapshot.warehouse_name}: có nhiều dòng tồn hiện hữu`);
      continue;
    }
    if (existing.length === 1) {
      const inventoryId = existing[0]['Mã'];
      operations.push(async () => {
        const { error } = await supabase.from('fact_inventory').update(inventoryValues).eq('Mã', inventoryId);
        return { error: error?.message || null };
      });
    } else {
      operations.push(async () => {
        const { error } = await supabase.from('fact_inventory').insert({
          'Mã': randomUUID(),
          'Tên hàng hóa': homId,
          'Kho': khoId,
          ...inventoryValues,
          'Loại hàng': 'Đã mua',
        });
        return { error: error?.message || null };
      });
    }
  }

  let upserted = 0;
  let errors = missingProductCount;
  let firstError = missingProductCount ? `${missingProductCount} mã hòm chưa có trong dim_hom.` : '';
  for (let i = 0; i < operations.length; i += 20) {
    const results = await Promise.all(operations.slice(i, i + 20).map(operation => operation()));
    for (const result of results) {
      if (result.error) {
        errors++;
        firstError ||= result.error;
      } else {
        upserted++;
      }
    }
  }

  const notes = [
    `${createdWarehouses} kho mới đã được tạo trong dim_kho.`,
    'Không cập nhật tồn của Hàm Long, Kha Vạn Cân hoặc Kinh Dương Vương.',
    unresolved.length ? `Cần đối soát thủ công: ${[...new Set(unresolved)].join(', ')}.` : '',
  ].filter(Boolean);
  return {
    table: 'fact_inventory',
    fetched: snapshots.length,
    upserted,
    errors,
    duration_ms: Date.now() - startedAt,
    ...(firstError ? { error_msg: firstError } : {}),
    note: notes.join(' '),
  };
}

async function syncWarehouseSnapshot(warehouses: OneOfficeRecord[]): Promise<CoffinSyncResult> {
  const rows = new Map<string, OneOfficeRecord>();
  for (const warehouse of warehouses) {
    const id = parseId(field(warehouse, 'ID', 'id'));
    const name = sourceWarehouseName(warehouse);
    if (!id || !name) continue;
    rows.set(String(id), {
      oneoffice_id: id,
      code: sourceWarehouseCode(warehouse) || `1O-${id}`,
      name,
      address: stringValue(field(warehouse, 'address', 'inventory_address')) || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    });
  }
  return runStep('warehouses_1office', warehouses.length, async () => {
    const result = await upsertRows('warehouses_1office', [...rows.values()], 'oneoffice_id');
    return { upserted: result.upserted, errors: result.errors };
  });
}

async function syncInventorySnapshot(
  rawInventory: OneOfficeRecord[],
  products: OneOfficeRecord[],
  warehouses: OneOfficeRecord[],
): Promise<CoffinSyncResult> {
  const rows = mapInventoryRows(rawInventory, products, warehouses, false);
  return runStep('inventory_1office', rawInventory.length, async () => {
    const identifiedRows = rows.filter(row => row.oneoffice_id !== null);
    const rowsWithoutId = rows.filter(row => row.oneoffice_id === null);
    const byIdResult = await upsertRows('inventory_1office', identifiedRows, 'oneoffice_id');
    const byKeyResult = await upsertRows('inventory_1office', rowsWithoutId, 'source_key');
    const result = {
      upserted: byIdResult.upserted + byKeyResult.upserted,
      errors: byIdResult.errors + byKeyResult.errors,
    };
    const note = 'Đang lưu ảnh chụp 2AQ để đối soát; chưa ghi đè tồn kho đang hiển thị trên web app.';
    return { upserted: result.upserted, errors: result.errors, note };
  });
}

export async function runCoffinSync(
  products: OneOfficeRecord[],
  options: { catalog?: boolean; inventory?: boolean } = {},
): Promise<CoffinSyncResult[]> {
  const results: CoffinSyncResult[] = [];
  const syncInventory = options.inventory ?? true;
  const syncCatalog = (options.catalog ?? true) || syncInventory;

  if (syncCatalog) results.push(await syncCoffinCatalog(products));
  if (syncInventory) {
    const [warehouses, inventory] = await Promise.all([fetchWarehouses(), fetchInventory()]);
    const warehouseResult = await syncWarehouseSnapshot(warehouses as OneOfficeRecord[]);
    results.push(warehouseResult);
    const rawWarehouses = warehouses as OneOfficeRecord[];
    const rawInventory = inventory as OneOfficeRecord[];
    const snapshots = mapInventoryRows(rawInventory, products, rawWarehouses);
    const inventoryResult = await syncInventorySnapshot(rawInventory, products, rawWarehouses);
    results.push(inventoryResult);
    if (!warehouseResult.errors && !inventoryResult.errors) {
      results.push(await applyInventoryToWebApp(snapshots, rawWarehouses));
    } else {
      results.push({
        table: 'fact_inventory',
        fetched: snapshots.length,
        upserted: 0,
        errors: 1,
        duration_ms: 0,
        error_msg: 'Bỏ qua cập nhật tồn web app vì bước lưu ảnh chụp đối soát bị lỗi.',
      });
    }
  }
  return results;
}
