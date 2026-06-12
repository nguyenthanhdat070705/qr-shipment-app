import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { isMembershipContract, dedupeMembershipsByCode } from '@/lib/membership';
import { mapCrmContract } from '@/lib/crmContracts';
import * as XLSX from 'xlsx';

type ContractRow = {
  id: string;
  getfly_contract_id: string;
  contract_name: string | null;
  contract_code: string | null;
  source_contract_code: string | null;
  contract_status: string | null;
  contract_type: string | null;
  remaining_days: number | null;
  created_date: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  person_in_charge: string | null;
  contract_value: number | null;
  actual_value: number | null;
  executed_amount: number | null;
  paid_amount: number | null;
  debt_amount: number | null;
  beneficiary_name_1: string | null;
  beneficiary_vneid_1: string | null;
  beneficiary_phone_1: string | null;
  beneficiary_address_1: string | null;
  beneficiary_name_2: string | null;
  beneficiary_vneid_2: string | null;
  beneficiary_phone_2: string | null;
  beneficiary_address_2: string | null;
  buyer_email: string | null;
  synced_at: string | null;
};

type DriveRow = {
  getfly_contract_id: string;
  source_contract_code?: string | null;
  vneid_front_file_id: string | null;
  vneid_back_file_id: string | null;
  contract_scan_file_id: string | null;
  membership_form_file_id: string | null;
  last_sync_at: string | null;
};

type BucketKey = 'expired' | 'expiring' | 'safe' | 'unknown';
type Period = 'day' | 'month';
type PeriodBucket = {
  count: number;
  value: number;
  paid: number;
  tax_amount: number;
  gross_revenue: number;
  gross_commission: number;
  net_commission: number;
};

function str(v: unknown): string {
  return String(v ?? '').trim();
}

function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function pad2(v: string | number): string {
  return String(v).padStart(2, '0');
}

function dateKey(v: string | null): string {
  const value = str(v);
  if (!value) return '';

  const iso = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(value);
  if (iso) return `${iso[1]}-${pad2(iso[2])}-${pad2(iso[3])}`;

  const vi = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(value);
  if (vi) return `${vi[3]}-${pad2(vi[2])}-${pad2(vi[1])}`;

  return value.slice(0, 10);
}

function monthEnd(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return '';
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${pad2(month)}-${pad2(lastDay)}`;
}

function isIsoDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isIsoMonth(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

function dateFromKey(value: string): Date | null {
  if (!isIsoDay(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function dayKeyFromDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function periodKey(date: string, period: Period): string {
  return period === 'month' ? date.slice(0, 7) : date;
}

function emptyPeriodBucket(): PeriodBucket {
  return {
    count: 0,
    value: 0,
    paid: 0,
    tax_amount: 0,
    gross_revenue: 0,
    gross_commission: 0,
    net_commission: 0,
  };
}

function periodLabels(period: Period, dateFrom: string, dateTo: string): string[] {
  if (!dateFrom || !dateTo) return [];

  if (period === 'month') {
    const fromMonth = dateFrom.slice(0, 7);
    const toMonth = dateTo.slice(0, 7);
    if (!isIsoMonth(fromMonth) || !isIsoMonth(toMonth)) return [];

    const labels: string[] = [];
    const [fromYear, fromMonthNumber] = fromMonth.split('-').map(Number);
    const [toYear, toMonthNumber] = toMonth.split('-').map(Number);
    const cursor = new Date(fromYear, fromMonthNumber - 1, 1);
    const end = new Date(toYear, toMonthNumber - 1, 1);

    while (cursor <= end && labels.length < 240) {
      labels.push(`${cursor.getFullYear()}-${pad2(cursor.getMonth() + 1)}`);
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return labels;
  }

  const start = dateFromKey(dateFrom);
  const end = dateFromKey(dateTo);
  if (!start || !end) return [];

  const labels: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end && labels.length < 800) {
    labels.push(dayKeyFromDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return labels;
}

function financialMetrics(paidAmount: number) {
  const taxAmount = paidAmount * 8 / 108;
  const grossRevenue = paidAmount - taxAmount;
  const grossCommission = grossRevenue * 0.10;
  const netCommission = grossCommission * 0.90;

  return {
    tax_amount: taxAmount,
    gross_revenue: grossRevenue,
    gross_commission: grossCommission,
    net_commission: netCommission,
  };
}

function remainingBucket(days: number | null): BucketKey {
  if (days === null || days === undefined) return 'unknown';
  if (days < 0) return 'expired';
  if (days <= 90) return 'expiring';
  return 'safe';
}

function addToMap<T extends { count: number; value: number }>(map: Map<string, T>, key: string, value: number, seed: () => T) {
  const label = key || 'Chưa rõ';
  const item = map.get(label) || seed();
  item.count += 1;
  item.value += value;
  map.set(label, item);
}

function topItems(map: Map<string, { count: number; value: number }>, limit = 8) {
  return Array.from(map.entries())
    .map(([label, data]) => ({ label, ...data }))
    .sort((a, b) => b.value - a.value || b.count - a.count)
    .slice(0, limit);
}

function yesNo(value: boolean): string {
  return value ? 'Có' : 'Không';
}

function fitColumns(rows: unknown[][], min = 10, max = 36) {
  const columnCount = rows.reduce((count, row) => Math.max(count, row.length), 0);
  return Array.from({ length: columnCount }, (_, index) => {
    const width = rows.reduce((longest, row) => {
      const text = String(row[index] ?? '');
      return Math.max(longest, text.length);
    }, min);
    return { wch: Math.min(max, Math.max(min, width + 2)) };
  });
}

function appendSheet(workbook: XLSX.WorkBook, name: string, rows: unknown[][]) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = fitColumns(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

async function fetchAllContracts(supabase: ReturnType<typeof getSupabaseAdmin>) {
  // Nguồn MỚI: crm_hop_dong_ban (mirror Sheet) → chuẩn hoá về shape getfly_contracts cũ.
  const { data, error } = await supabase
    .from('crm_hop_dong_ban')
    .select('id, data, synced_at')
    .limit(20000);
  if (error) throw error;
  return (data || []).map((r) => {
    const d = (r.data || {}) as Record<string, string>;
    return { ...mapCrmContract(d, r.synced_at), id: String(d.id || r.id || '') } as ContractRow;
  });
}

// File đính kèm join qua source_contract_code (cầu nối, bền vững) hoặc getfly_contract_id.
async function fetchDriveMap(supabase: ReturnType<typeof getSupabaseAdmin>, contracts: ContractRow[]) {
  const driveMap = new Map<string, DriveRow>();
  const codes = Array.from(new Set(contracts.map((c) => str(c.source_contract_code)).filter(Boolean)));
  const ids = Array.from(new Set(contracts.map((c) => str(c.getfly_contract_id)).filter(Boolean)));
  const batchSize = 300;

  const fetchByCol = async (col: string, values: string[]) => {
    for (let i = 0; i < values.length; i += batchSize) {
      const slice = values.slice(i, i + batchSize);
      const { data: driveRows } = await supabase
        .from('membership_gdrive_attachments')
        .select('getfly_contract_id, source_contract_code, vneid_front_file_id, vneid_back_file_id, contract_scan_file_id, membership_form_file_id, last_sync_at')
        .in(col, slice);
      (driveRows || []).forEach((row) => {
        const drive = row as DriveRow;
        if (drive.source_contract_code) driveMap.set('code:' + drive.source_contract_code, drive);
        if (drive.getfly_contract_id) driveMap.set('id:' + drive.getfly_contract_id, drive);
      });
    }
  };

  if (codes.length) await fetchByCol('source_contract_code', codes);
  if (ids.length) await fetchByCol('getfly_contract_id', ids);
  return driveMap;
}

function getDrive(driveMap: Map<string, DriveRow>, c: ContractRow): DriveRow | undefined {
  return (
    (c.source_contract_code ? driveMap.get('code:' + c.source_contract_code) : undefined) ||
    driveMap.get('id:' + c.getfly_contract_id)
  );
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const search = str(req.nextUrl.searchParams.get('search')).toLowerCase();
    const status = str(req.nextUrl.searchParams.get('status'));
    const type = str(req.nextUrl.searchParams.get('type'));
    const owner = str(req.nextUrl.searchParams.get('owner'));
    const remaining = str(req.nextUrl.searchParams.get('remaining'));
    const period: Period = str(req.nextUrl.searchParams.get('period')) === 'month' ? 'month' : 'day';
    let dateFrom = str(req.nextUrl.searchParams.get('date_from'));
    let dateTo = str(req.nextUrl.searchParams.get('date_to'));

    if (period === 'month') {
      let monthFrom = str(req.nextUrl.searchParams.get('month_from'));
      let monthTo = str(req.nextUrl.searchParams.get('month_to')) || monthFrom;

      if (monthFrom && monthTo && monthFrom > monthTo) {
        [monthFrom, monthTo] = [monthTo, monthFrom];
      }

      if (isIsoMonth(monthFrom)) dateFrom = `${monthFrom}-01`;
      if (isIsoMonth(monthTo)) dateTo = monthEnd(monthTo);
    }

    if (dateFrom && dateTo && dateFrom > dateTo) {
      [dateFrom, dateTo] = [dateTo, dateFrom];
    }

    const contracts = dedupeMembershipsByCode(
      (await fetchAllContracts(supabase)).filter(isMembershipContract),
    );
    const driveMap = contracts.length > 0 ? await fetchDriveMap(supabase, contracts) : new Map<string, DriveRow>();

    const options = {
      statuses: Array.from(new Set(contracts.map((c) => str(c.contract_status)).filter(Boolean))).sort(),
      types: Array.from(new Set(contracts.map((c) => str(c.contract_type)).filter(Boolean))).sort(),
      owners: Array.from(new Set(contracts.map((c) => str(c.person_in_charge)).filter(Boolean))).sort(),
    };

    const filtered = contracts.filter((c) => {
      const created = dateKey(c.created_date);
      const bucket = remainingBucket(c.remaining_days);
      const searchable = [
        c.contract_name, c.contract_code, c.source_contract_code, c.contract_status,
        c.contract_type, c.customer_name, c.customer_phone, c.person_in_charge,
        c.beneficiary_name_1, c.beneficiary_vneid_1, c.beneficiary_phone_1,
        c.beneficiary_name_2, c.beneficiary_vneid_2, c.beneficiary_phone_2, c.buyer_email,
      ].map(str).join(' ').toLowerCase();

      if (search && !searchable.includes(search)) return false;
      if (status && status !== 'all' && str(c.contract_status) !== status) return false;
      if (type && type !== 'all' && str(c.contract_type) !== type) return false;
      if (owner && owner !== 'all' && str(c.person_in_charge) !== owner) return false;
      if (remaining && remaining !== 'all' && bucket !== remaining) return false;
      if (dateFrom && (!created || created < dateFrom)) return false;
      if (dateTo && (!created || created > dateTo)) return false;
      return true;
    });

    const statusMap = new Map<string, { count: number; value: number }>();
    const typeMap = new Map<string, { count: number; value: number }>();
    const ownerMap = new Map<string, { count: number; value: number }>();
    const periodMap = new Map<string, PeriodBucket>();
    const remainingMap = new Map<string, { count: number; value: number }>([
      ['Đã quá hạn', { count: 0, value: 0 }],
      ['≤ 90 ngày', { count: 0, value: 0 }],
      ['> 90 ngày', { count: 0, value: 0 }],
      ['Chưa rõ', { count: 0, value: 0 }],
    ]);

    let totalValue = 0;
    let actualValue = 0;
    let executedAmount = 0;
    let paidAmount = 0;
    let debtAmount = 0;
    let beneficiaries = 0;
    let beneficiaryWithVneid = 0;
    let beneficiaryWithPhone = 0;
    let docComplete = 0;
    let contractScan = 0;
    let membershipForm = 0;
    let newestSync = '';

    filtered.forEach((c) => {
      const value = num(c.contract_value);
      const paid = num(c.paid_amount);
      totalValue += value;
      actualValue += num(c.actual_value);
      executedAmount += num(c.executed_amount);
      paidAmount += paid;
      debtAmount += num(c.debt_amount);

      addToMap(statusMap, str(c.contract_status), value, () => ({ count: 0, value: 0 }));
      addToMap(typeMap, str(c.contract_type), value, () => ({ count: 0, value: 0 }));
      addToMap(ownerMap, str(c.person_in_charge), value, () => ({ count: 0, value: 0 }));

      const created = dateKey(c.created_date);
      if (created) {
        const key = periodKey(created, period);
        const metrics = financialMetrics(paid);
        const periodItem = periodMap.get(key) || emptyPeriodBucket();
        periodItem.count += 1;
        periodItem.value += value;
        periodItem.paid += paid;
        periodItem.tax_amount += metrics.tax_amount;
        periodItem.gross_revenue += metrics.gross_revenue;
        periodItem.gross_commission += metrics.gross_commission;
        periodItem.net_commission += metrics.net_commission;
        periodMap.set(key, periodItem);
      }

      const bucketLabel = remainingBucket(c.remaining_days) === 'expired'
        ? 'Đã quá hạn'
        : remainingBucket(c.remaining_days) === 'expiring'
          ? '≤ 90 ngày'
          : remainingBucket(c.remaining_days) === 'safe'
            ? '> 90 ngày'
            : 'Chưa rõ';
      const bucketItem = remainingMap.get(bucketLabel) || { count: 0, value: 0 };
      bucketItem.count += 1;
      bucketItem.value += value;
      remainingMap.set(bucketLabel, bucketItem);

      const ben1 = !!str(c.beneficiary_name_1);
      const ben2 = !!str(c.beneficiary_name_2);
      beneficiaries += Number(ben1) + Number(ben2);
      beneficiaryWithVneid += Number(!!str(c.beneficiary_vneid_1)) + Number(!!str(c.beneficiary_vneid_2));
      beneficiaryWithPhone += Number(!!str(c.beneficiary_phone_1)) + Number(!!str(c.beneficiary_phone_2));

      const drive = getDrive(driveMap, c);
      const hasContractScan = !!drive?.contract_scan_file_id;
      const hasMembershipForm = !!drive?.membership_form_file_id;
      if (hasContractScan) contractScan += 1;
      if (hasMembershipForm) membershipForm += 1;
      if (drive?.vneid_front_file_id && drive.vneid_back_file_id && hasContractScan && hasMembershipForm) docComplete += 1;

      const syncTime = str(c.synced_at);
      if (syncTime && syncTime > newestSync) newestSync = syncTime;
    });

    const labels = periodLabels(period, dateFrom, dateTo);
    const daily = (labels.length ? labels : Array.from(periodMap.keys()).sort())
      .map((label) => ({ label, ...(periodMap.get(label) || emptyPeriodBucket()) }));
    const summaryMetrics = financialMetrics(paidAmount);

    const records = filtered.map((c) => {
      const drive = getDrive(driveMap, c);
      return {
        ...c,
        docs: {
          vneid_front: !!drive?.vneid_front_file_id,
          vneid_back: !!drive?.vneid_back_file_id,
          contract_scan: !!drive?.contract_scan_file_id,
          membership_form: !!drive?.membership_form_file_id,
        },
      };
    });

    if (str(req.nextUrl.searchParams.get('export')) === 'excel') {
      const workbook = XLSX.utils.book_new();
      const generatedAt = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

      appendSheet(workbook, 'Tong quan', [
        ['Dashboard Membership', ''],
        ['Xuất lúc', generatedAt],
        ['Từ khóa', search || 'Tất cả'],
        ['Trạng thái', status || 'Tất cả'],
        ['Kiểu hợp đồng', type || 'Tất cả'],
        ['Phụ trách', owner || 'Tất cả'],
        ['Thời hạn', remaining || 'Tất cả'],
        ['Kỳ xem', period === 'month' ? 'Theo tháng' : 'Theo ngày'],
        ['Từ ngày', dateFrom || 'Tất cả'],
        ['Đến ngày', dateTo || 'Tất cả'],
        [],
        ['Chỉ số', 'Giá trị'],
        ['Tổng hợp đồng', filtered.length],
        ['Tổng giá trị HĐ', totalValue],
        ['Giá trị thực', actualValue],
        ['Đã thực hiện', executedAmount],
        ['Đã thanh toán', paidAmount],
        ['Công nợ', debtAmount],
        ['Tiền thuế', summaryMetrics.tax_amount],
        ['Doanh thu thực', summaryMetrics.gross_revenue],
        ['Hoa hồng CTV gộp', summaryMetrics.gross_commission],
        ['Hoa hồng CTV sau thuế', summaryMetrics.net_commission],
        ['Giá trị trung bình / HĐ', filtered.length ? totalValue / filtered.length : 0],
        ['Tỷ lệ thu (%)', totalValue ? Math.round((paidAmount / totalValue) * 1000) / 10 : 0],
        ['Tỷ lệ nợ (%)', totalValue ? Math.round((debtAmount / totalValue) * 1000) / 10 : 0],
        ['Người thụ hưởng', beneficiaries],
        ['Tỷ lệ VnEID người thụ hưởng (%)', beneficiaries ? Math.round((beneficiaryWithVneid / beneficiaries) * 1000) / 10 : 0],
        ['Tỷ lệ SĐT người thụ hưởng (%)', beneficiaries ? Math.round((beneficiaryWithPhone / beneficiaries) * 1000) / 10 : 0],
        ['Tỷ lệ đủ hồ sơ (%)', filtered.length ? Math.round((docComplete / filtered.length) * 1000) / 10 : 0],
        ['Tỷ lệ scan HĐ (%)', filtered.length ? Math.round((contractScan / filtered.length) * 1000) / 10 : 0],
        ['Tỷ lệ phiếu hội viên (%)', filtered.length ? Math.round((membershipForm / filtered.length) * 1000) / 10 : 0],
        ['Sắp hết hạn', filtered.filter((c) => remainingBucket(c.remaining_days) === 'expiring').length],
        ['Đã quá hạn', filtered.filter((c) => remainingBucket(c.remaining_days) === 'expired').length],
        ['Sync cuối', newestSync || ''],
      ]);

      appendSheet(workbook, 'Memberships', [
        [
          'Ngày còn lại', 'Tên hợp đồng', 'Số HĐ', 'Mã nguồn MBS', 'Mã GetFly',
          'Trạng thái', 'Kiểu HĐ', 'Ngày tạo', 'Hiệu lực', 'Hết hiệu lực',
          'Khách hàng', 'SĐT KH', 'Phụ trách', 'Giá trị HĐ', 'Giá trị thực',
          'Đã thực hiện', 'Đã thanh toán', 'Công nợ',
          'Người TH 1', 'VnEID TH 1', 'SĐT TH 1', 'Địa chỉ TH 1',
          'Người TH 2', 'VnEID TH 2', 'SĐT TH 2', 'Địa chỉ TH 2',
          'Email người mua', 'VnEID trước', 'VnEID sau', 'Scan HĐ', 'Phiếu hội viên',
        ],
        ...records.map((row) => [
          row.remaining_days ?? '',
          row.contract_name || '',
          row.contract_code || '',
          row.source_contract_code || '',
          row.getfly_contract_id || '',
          row.contract_status || '',
          row.contract_type || '',
          row.created_date || '',
          row.effective_date || '',
          row.expiry_date || '',
          row.customer_name || '',
          row.customer_phone || '',
          row.person_in_charge || '',
          num(row.contract_value),
          num(row.actual_value),
          num(row.executed_amount),
          num(row.paid_amount),
          num(row.debt_amount),
          row.beneficiary_name_1 || '',
          row.beneficiary_vneid_1 || '',
          row.beneficiary_phone_1 || '',
          row.beneficiary_address_1 || '',
          row.beneficiary_name_2 || '',
          row.beneficiary_vneid_2 || '',
          row.beneficiary_phone_2 || '',
          row.beneficiary_address_2 || '',
          row.buyer_email || '',
          yesNo(row.docs.vneid_front),
          yesNo(row.docs.vneid_back),
          yesNo(row.docs.contract_scan),
          yesNo(row.docs.membership_form),
        ]),
      ]);

      appendSheet(workbook, 'Theo ky', [
        ['Kỳ', 'Số HĐ', 'Giá trị HĐ', 'Đã thanh toán', 'Tiền thuế', 'Doanh thu thực', 'Hoa hồng gộp', 'Hoa hồng sau thuế'],
        ...daily.map((item) => [
          item.label,
          item.count,
          item.value,
          item.paid,
          item.tax_amount,
          item.gross_revenue,
          item.gross_commission,
          item.net_commission,
        ]),
      ]);

      appendSheet(workbook, 'Trang thai', [
        ['Trạng thái', 'Số HĐ', 'Giá trị HĐ'],
        ...topItems(statusMap, 1000).map((item) => [item.label, item.count, item.value]),
      ]);

      appendSheet(workbook, 'Kieu HD', [
        ['Kiểu HĐ', 'Số HĐ', 'Giá trị HĐ'],
        ...topItems(typeMap, 1000).map((item) => [item.label, item.count, item.value]),
      ]);

      appendSheet(workbook, 'Phu trach', [
        ['Phụ trách', 'Số HĐ', 'Giá trị HĐ'],
        ...topItems(ownerMap, 1000).map((item) => [item.label, item.count, item.value]),
      ]);

      appendSheet(workbook, 'Thoi han', [
        ['Thời hạn', 'Số HĐ', 'Giá trị HĐ'],
        ...Array.from(remainingMap.entries()).map(([label, item]) => [label, item.count, item.value]),
      ]);

      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
      const blob = new Blob([new Uint8Array(buffer)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const stamp = new Date().toISOString().slice(0, 10);

      return new NextResponse(blob, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="Membership_Dashboard_${stamp}.xlsx"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    return NextResponse.json({
      filters: { search, status, type, owner, remaining, period, date_from: dateFrom, date_to: dateTo },
      options,
      summary: {
        total_contracts: filtered.length,
        total_value: totalValue,
        actual_value: actualValue,
        executed_amount: executedAmount,
        paid_amount: paidAmount,
        debt_amount: debtAmount,
        ...summaryMetrics,
        average_value: filtered.length ? totalValue / filtered.length : 0,
        collection_rate: totalValue ? Math.round((paidAmount / totalValue) * 1000) / 10 : 0,
        debt_rate: totalValue ? Math.round((debtAmount / totalValue) * 1000) / 10 : 0,
        beneficiaries,
        beneficiary_vneid_rate: beneficiaries ? Math.round((beneficiaryWithVneid / beneficiaries) * 1000) / 10 : 0,
        beneficiary_phone_rate: beneficiaries ? Math.round((beneficiaryWithPhone / beneficiaries) * 1000) / 10 : 0,
        doc_complete_rate: filtered.length ? Math.round((docComplete / filtered.length) * 1000) / 10 : 0,
        contract_scan_rate: filtered.length ? Math.round((contractScan / filtered.length) * 1000) / 10 : 0,
        membership_form_rate: filtered.length ? Math.round((membershipForm / filtered.length) * 1000) / 10 : 0,
        expiring_soon: filtered.filter((c) => remainingBucket(c.remaining_days) === 'expiring').length,
        expired: filtered.filter((c) => remainingBucket(c.remaining_days) === 'expired').length,
        last_sync: newestSync || null,
      },
      charts: {
        status: topItems(statusMap, 9),
        types: topItems(typeMap, 6),
        owners: topItems(ownerMap, 8),
        daily,
        remaining: Array.from(remainingMap.entries()).map(([label, item]) => ({ label, ...item })),
      },
      records: records.slice(0, 50),
      total_available: contracts.length,
    });
  } catch (err) {
    console.error('membership dashboard error:', err);
    const message = err instanceof Error
      ? err.message
      : typeof err === 'object' && err && 'message' in err
        ? String((err as { message?: unknown }).message)
        : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
