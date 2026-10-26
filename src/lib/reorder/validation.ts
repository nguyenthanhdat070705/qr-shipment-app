import type {
  NormalizedReorderRow,
  ReorderImportRow,
  ReorderValidationIssue,
  ReorderValidationResult,
} from './types';

function parseNonNegativeInteger(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const normalized = String(value).trim().replace(/\s/g, '').replace(/,/g, '');
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function normalizeEffectiveMonth(value: string | undefined): string {
  if (value && /^\d{4}-\d{2}$/.test(value)) return `${value}-01`;
  return `${new Date().toISOString().slice(0, 7)}-01`;
}

export function hashRows(rows: NormalizedReorderRow[]): string {
  return rows
    .map(row => [row.ma_hom, row.safety_stock, row.movement, row.reorder_point, row.description].join('|'))
    .join('\n');
}

export function validateReorderRows(
  inputRows: ReorderImportRow[],
  catalog: { id: string; ma_hom: string; ten_hom?: string | null; ten_hom_the_hien?: string | null }[],
): ReorderValidationResult {
  const issues: ReorderValidationIssue[] = [];
  const catalogMap = new Map(catalog.map(product => [product.ma_hom.trim().toUpperCase(), product]));
  const skuOccurrences = new Map<string, number[]>();
  const normalizedRows: NormalizedReorderRow[] = [];

  inputRows.forEach((raw, index) => {
    const sourceRow = Number(raw.source_row) || index + 2;
    const sku = String(raw.ma_hom ?? '').trim().toUpperCase();
    if (!sku) {
      issues.push({ row: sourceRow, code: 'missing_sku', message: 'Thiếu mã hòm ở cột A.' });
      return;
    }

    const occurrences = skuOccurrences.get(sku) || [];
    occurrences.push(sourceRow);
    skuOccurrences.set(sku, occurrences);

    const safetyStock = parseNonNegativeInteger(raw.safety_stock);
    const movement = parseNonNegativeInteger(raw.movement);
    const reorderPoint = parseNonNegativeInteger(raw.reorder_point);

    if (safetyStock === null) {
      issues.push({ row: sourceRow, sku, code: 'invalid_safety_stock', message: 'Safety stock phải là số nguyên không âm.' });
    }
    if (movement === null) {
      issues.push({ row: sourceRow, sku, code: 'invalid_movement', message: 'Movement phải là số nguyên không âm.' });
    }
    if (reorderPoint === null) {
      issues.push({ row: sourceRow, sku, code: 'invalid_reorder_point', message: 'Reorder point phải là số nguyên không âm.' });
    }

    const product = catalogMap.get(sku);
    if (!product) {
      issues.push({ row: sourceRow, sku, code: 'unknown_sku', message: 'SKU chưa tồn tại trong catalogue.' });
    }

    if (safetyStock !== null && movement !== null && reorderPoint !== null && reorderPoint !== safetyStock + movement) {
      issues.push({
        row: sourceRow,
        sku,
        code: 'formula_mismatch',
        message: `Reorder point phải bằng Safety stock + Movement (${safetyStock + movement}).`,
      });
    }

    if (product && safetyStock !== null && movement !== null && reorderPoint !== null) {
      normalizedRows.push({
        ma_hom: sku,
        safety_stock: safetyStock,
        movement,
        reorder_point: reorderPoint,
        description: String(raw.description ?? '').trim() || product.ten_hom_the_hien || product.ten_hom || '',
        source_row: sourceRow,
        hom_id: product.id,
      });
    }
  });

  const duplicateSkus: string[] = [];
  for (const [sku, rows] of skuOccurrences) {
    if (rows.length > 1) {
      duplicateSkus.push(sku);
      issues.push({
        row: rows[0],
        sku,
        code: 'duplicate_sku',
        message: `SKU bị trùng ở các dòng ${rows.join(', ')}. Cần xác nhận một ngưỡng duy nhất.`,
      });
    }
  }

  const unknownSkus = [...new Set(issues.filter(issue => issue.code === 'unknown_sku' && issue.sku).map(issue => issue.sku!))];
  const suppliedSkus = new Set([...skuOccurrences.keys()]);
  const coverageWarnings = catalog
    .map(product => product.ma_hom.trim().toUpperCase())
    .filter(sku => !suppliedSkus.has(sku));

  return {
    valid: issues.length === 0 && normalizedRows.length === inputRows.length,
    total_rows: inputRows.length,
    valid_rows: normalizedRows.length,
    duplicate_skus: duplicateSkus.sort(),
    unknown_skus: unknownSkus.sort(),
    coverage_warnings: coverageWarnings.sort(),
    issues,
    rows: normalizedRows,
  };
}

