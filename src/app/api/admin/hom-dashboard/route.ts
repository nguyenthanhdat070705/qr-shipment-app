import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type HomRow = Record<string, unknown>;

const dimensionKeys = [
  'Muc_dich',
  'nhom_hang_hoa',
  'loai_san_pham',
  'loai_go',
  'Goi_dich_vu',
  'Ton_giao',
  'Nguon_goc',
  'Thanh',
] as const;

const MAX_REASONABLE_HOM_IMPORT_QTY = 500;

function numberValue(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function textValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function classifyHom(hom: HomRow): string {
  const haystack = normalize([
    hom.Muc_dich,
    hom.muc_dich_su_dung,
    hom.loai_san_pham,
    hom.nhom_hang_hoa,
    hom.loai_hom,
    hom.ten_hom_the_hien,
    hom.ten_hom,
    hom.ten_mkt,
    hom.mo_ta,
  ].map(textValue).join(' '));

  if (/(hoa tang|thieu|thieu tai|cremat)/.test(haystack)) return 'Hỏa táng';
  if (/(an tang|chon|chon cat|mai tang|burial)/.test(haystack)) return 'An táng';
  return 'Chưa phân loại';
}

function addToMap(map: Map<string, number>, code: unknown, qty: unknown) {
  const key = textValue(code);
  if (!key) return;
  map.set(key, (map.get(key) || 0) + numberValue(qty));
}

function parentStatus(row: Record<string, unknown>, parentKey: string): string {
  const parent = row[parentKey];
  if (!parent || typeof parent !== 'object') return '';
  return textValue((parent as Record<string, unknown>).trang_thai);
}

function parentText(row: Record<string, unknown>, parentKey: string, field: string): string {
  const parent = row[parentKey];
  if (!parent || typeof parent !== 'object') return '';
  return textValue((parent as Record<string, unknown>)[field]);
}

function uniqueOptions(rows: DashboardOutputRow[], key: string): string[] {
  return Array.from(
    new Set(rows.map((row) => textValue(key === 'serviceType' ? row.serviceType : row.dimensions?.[key])).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'vi'));
}

type DashboardOutputRow = {
  id: unknown;
  ma_hom: string;
  ten_hom: string;
  ten_goc: string;
  serviceType: string;
  dimensions: Record<string, string>;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  totalImport: number;
  totalExport: number;
  stockQty: number;
  importValue: number;
  exportValue: number;
  stockValue: number;
  isActive: boolean;
};

export async function GET() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Thiếu cấu hình Supabase trong môi trường hiện tại.' },
        { status: 500 }
      );
    }

    const supabase = getSupabaseAdmin();

    const [homRes, importRes, exportRes, inventoryRes] = await Promise.all([
      supabase
        .from('dim_hom')
        .select('*')
        .order('ma_hom', { ascending: true })
        .range(0, 9999),
      supabase
        .from('fact_nhap_hang_items')
        .select(`
          ma_hom,
          ten_hom,
          so_luong_thuc_nhan,
          fact_nhap_hang!inner(ma_phieu_nhap, trang_thai)
        `)
        .range(0, 9999),
      supabase
        .from('fact_xuat_hang_items')
        .select(`
          ma_hom,
          ten_hom,
          so_luong,
          fact_xuat_hang!inner(trang_thai)
        `)
        .range(0, 9999),
      supabase
        .from('fact_inventory')
        .select('"Tên hàng hóa", "Số lượng"')
        .range(0, 9999),
    ]);

    if (homRes.error) {
      return NextResponse.json({ error: homRes.error.message }, { status: 500 });
    }

    const products = homRes.data || [];
    const productById = new Map(products.map((hom: HomRow) => [textValue(hom.id), hom]));
    const importQtyByCode = new Map<string, number>();
    const exportQtyByCode = new Map<string, number>();
    const stockQtyByCode = new Map<string, number>();
    const abnormalImports: string[] = [];

    if (!importRes.error) {
      for (const item of importRes.data || []) {
        const row = item as Record<string, unknown>;
        const status = parentStatus(row, 'fact_nhap_hang');
        if (['cancelled', 'rejected'].includes(status)) continue;
        const qty = numberValue(row.so_luong_thuc_nhan);
        if (qty > MAX_REASONABLE_HOM_IMPORT_QTY) {
          const receiptCode = parentText(row, 'fact_nhap_hang', 'ma_phieu_nhap') || 'không rõ phiếu';
          abnormalImports.push(`${receiptCode}/${textValue(row.ma_hom)}=${qty.toLocaleString('vi-VN')}`);
          continue;
        }
        addToMap(importQtyByCode, row.ma_hom, row.so_luong_thuc_nhan);
      }
    }

    if (!exportRes.error) {
      for (const item of exportRes.data || []) {
        const row = item as Record<string, unknown>;
        const status = parentStatus(row, 'fact_xuat_hang');
        if (status === 'cancelled') continue;
        addToMap(exportQtyByCode, row.ma_hom, row.so_luong);
      }
    }

    if (!inventoryRes.error) {
      for (const item of inventoryRes.data || []) {
        const row = item as Record<string, unknown>;
        const hom = productById.get(textValue(row['Tên hàng hóa']));
        if (!hom) continue;
        addToMap(stockQtyByCode, hom.ma_hom, row['Số lượng']);
      }
    }

    const rows = products.map((hom: HomRow) => {
      const code = textValue(hom.ma_hom);
      const costPrice = numberValue(hom.gia_von) || numberValue(hom.gia_ban);
      const sellingPrice = numberValue(hom.gia_ban_1) || numberValue(hom.gia_ban);
      const totalImport = importQtyByCode.get(code) || 0;
      const totalExport = exportQtyByCode.get(code) || 0;
      const stockQty = stockQtyByCode.get(code) || 0;
      const dimensions = Object.fromEntries(dimensionKeys.map((key) => [key, textValue(hom[key])]));

      return {
        id: hom.id,
        ma_hom: code,
        ten_hom: textValue(hom.ten_hom_the_hien) || textValue(hom.ten_hom),
        ten_goc: textValue(hom.ten_hom),
        serviceType: classifyHom(hom),
        dimensions,
        unit: textValue(hom.don_vi_tinh) || 'Cái',
        costPrice,
        sellingPrice,
        totalImport,
        totalExport,
        stockQty,
        importValue: totalImport * costPrice,
        exportValue: totalExport * sellingPrice,
        stockValue: stockQty * costPrice,
        isActive: hom.is_active !== false,
      };
    });

    const totals = rows.reduce(
      (acc, row) => {
        acc.productTypes += 1;
        acc.totalImport += row.totalImport;
        acc.totalExport += row.totalExport;
        acc.stockQty += row.stockQty;
        acc.importValue += row.importValue;
        acc.exportValue += row.exportValue;
        acc.stockValue += row.stockValue;
        return acc;
      },
      {
        productTypes: 0,
        totalImport: 0,
        totalExport: 0,
        stockQty: 0,
        importValue: 0,
        exportValue: 0,
        stockValue: 0,
      }
    );

    const groups = rows.reduce<Record<string, { label: string; productTypes: number; totalImport: number; totalExport: number; stockQty: number; stockValue: number }>>((acc, row) => {
      if (!acc[row.serviceType]) {
        acc[row.serviceType] = {
          label: row.serviceType,
          productTypes: 0,
          totalImport: 0,
          totalExport: 0,
          stockQty: 0,
          stockValue: 0,
        };
      }
      acc[row.serviceType].productTypes += 1;
      acc[row.serviceType].totalImport += row.totalImport;
      acc[row.serviceType].totalExport += row.totalExport;
      acc[row.serviceType].stockQty += row.stockQty;
      acc[row.serviceType].stockValue += row.stockValue;
      return acc;
    }, {});

    return NextResponse.json({
      totals,
      groups: Object.values(groups).sort((a, b) => b.productTypes - a.productTypes),
      filters: {
        serviceType: uniqueOptions(rows, 'serviceType'),
        ...Object.fromEntries(dimensionKeys.map((key) => [key, uniqueOptions(rows, key)])),
      },
      rows: rows.sort((a, b) => b.totalExport - a.totalExport || b.totalImport - a.totalImport || a.ma_hom.localeCompare(b.ma_hom, 'vi')),
      warnings: {
        imports: importRes.error?.message || null,
        importAnomalies: abnormalImports.length
          ? `Đã loại ${abnormalImports.length} dòng nhập bất thường khỏi tổng: ${abnormalImports.slice(0, 6).join(', ')}${abnormalImports.length > 6 ? '...' : ''}`
          : null,
        exports: exportRes.error?.message || null,
        inventory: inventoryRes.error?.message || null,
      },
    });
  } catch (err: unknown) {
    console.error('[admin/hom-dashboard]', err);
    const message = err instanceof Error ? err.message : 'Không tải được dữ liệu dashboard hòm.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
