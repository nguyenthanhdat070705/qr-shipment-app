export type ReorderSetStatus = 'draft' | 'active' | 'superseded' | 'rejected';
export type ReorderAlertStatus = 'open' | 'po_pending' | 'resolved' | 'superseded';

export interface ReorderImportRow {
  ma_hom: string;
  safety_stock: number | string;
  movement: number | string;
  reorder_point: number | string;
  description?: string;
  source_row: number;
}

export interface NormalizedReorderRow {
  ma_hom: string;
  safety_stock: number;
  movement: number;
  reorder_point: number;
  description: string;
  source_row: number;
  hom_id: string;
}

export interface ReorderValidationIssue {
  row: number;
  sku?: string;
  code: string;
  message: string;
}

export interface ReorderValidationResult {
  valid: boolean;
  total_rows: number;
  valid_rows: number;
  duplicate_skus: string[];
  unknown_skus: string[];
  coverage_warnings: string[];
  issues: ReorderValidationIssue[];
  rows: NormalizedReorderRow[];
}

export const ACTIVE_PO_STATUSES = new Set([
  'draft',
  'submitted',
  'confirmed',
  'approved',
  'received',
  'closed',
]);

