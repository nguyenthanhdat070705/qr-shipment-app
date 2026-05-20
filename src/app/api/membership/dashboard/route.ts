import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

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
  vneid_front_file_id: string | null;
  vneid_back_file_id: string | null;
  contract_scan_file_id: string | null;
  membership_form_file_id: string | null;
  last_sync_at: string | null;
};

type BucketKey = 'expired' | 'expiring' | 'safe' | 'unknown';

function str(v: unknown): string {
  return String(v ?? '').trim();
}

function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function dateKey(v: string | null): string {
  return str(v).slice(0, 10);
}

function monthKey(v: string | null): string {
  const key = dateKey(v).slice(0, 7);
  return /^\d{4}-\d{2}$/.test(key) ? key : 'Chưa rõ';
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

async function fetchAllContracts(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const rows: ContractRow[] = [];
  const batchSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('getfly_contracts')
      .select(`
        id, getfly_contract_id, contract_name, contract_code, source_contract_code,
        contract_status, contract_type, remaining_days, created_date, effective_date, expiry_date,
        customer_name, customer_phone, person_in_charge,
        contract_value, actual_value, executed_amount, paid_amount, debt_amount,
        beneficiary_name_1, beneficiary_vneid_1, beneficiary_phone_1, beneficiary_address_1,
        beneficiary_name_2, beneficiary_vneid_2, beneficiary_phone_2, beneficiary_address_2,
        buyer_email, synced_at
      `)
      .order('synced_at', { ascending: false })
      .range(from, from + batchSize - 1);

    if (error) throw error;

    const batch = (data || []) as ContractRow[];
    rows.push(...batch);
    if (batch.length < batchSize) break;
    from += batchSize;
  }

  return rows;
}

async function fetchDriveMap(supabase: ReturnType<typeof getSupabaseAdmin>, contractIds: string[]) {
  const driveMap = new Map<string, DriveRow>();
  const batchSize = 500;

  for (let i = 0; i < contractIds.length; i += batchSize) {
    const ids = contractIds.slice(i, i + batchSize);
    const { data: driveRows } = await supabase
      .from('membership_gdrive_attachments')
      .select('getfly_contract_id, vneid_front_file_id, vneid_back_file_id, contract_scan_file_id, membership_form_file_id, last_sync_at')
      .in('getfly_contract_id', ids);

    (driveRows || []).forEach((row) => {
      const drive = row as DriveRow;
      driveMap.set(drive.getfly_contract_id, drive);
    });
  }

  return driveMap;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const search = str(req.nextUrl.searchParams.get('search')).toLowerCase();
    const status = str(req.nextUrl.searchParams.get('status'));
    const type = str(req.nextUrl.searchParams.get('type'));
    const owner = str(req.nextUrl.searchParams.get('owner'));
    const remaining = str(req.nextUrl.searchParams.get('remaining'));
    const dateFrom = str(req.nextUrl.searchParams.get('date_from'));
    const dateTo = str(req.nextUrl.searchParams.get('date_to'));

    const contracts = await fetchAllContracts(supabase);
    const contractIds = contracts.map((c) => c.getfly_contract_id).filter(Boolean);
    const driveMap = contractIds.length > 0 ? await fetchDriveMap(supabase, contractIds) : new Map<string, DriveRow>();

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
      if (dateFrom && created && created < dateFrom) return false;
      if (dateTo && created && created > dateTo) return false;
      return true;
    });

    const statusMap = new Map<string, { count: number; value: number }>();
    const typeMap = new Map<string, { count: number; value: number }>();
    const ownerMap = new Map<string, { count: number; value: number }>();
    const monthlyMap = new Map<string, { count: number; value: number; paid: number }>();
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

      const month = monthKey(c.created_date || c.effective_date);
      const monthItem = monthlyMap.get(month) || { count: 0, value: 0, paid: 0 };
      monthItem.count += 1;
      monthItem.value += value;
      monthItem.paid += paid;
      monthlyMap.set(month, monthItem);

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

      const drive = driveMap.get(c.getfly_contract_id);
      const hasContractScan = !!drive?.contract_scan_file_id;
      const hasMembershipForm = !!drive?.membership_form_file_id;
      if (hasContractScan) contractScan += 1;
      if (hasMembershipForm) membershipForm += 1;
      if (drive?.vneid_front_file_id && drive.vneid_back_file_id && hasContractScan && hasMembershipForm) docComplete += 1;

      const syncTime = str(c.synced_at);
      if (syncTime && syncTime > newestSync) newestSync = syncTime;
    });

    const monthly = Array.from(monthlyMap.entries())
      .map(([label, item]) => ({ label, ...item }))
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(-12);

    const records = filtered.slice(0, 50).map((c) => {
      const drive = driveMap.get(c.getfly_contract_id);
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

    return NextResponse.json({
      filters: { search, status, type, owner, remaining, date_from: dateFrom, date_to: dateTo },
      options,
      summary: {
        total_contracts: filtered.length,
        total_value: totalValue,
        actual_value: actualValue,
        executed_amount: executedAmount,
        paid_amount: paidAmount,
        debt_amount: debtAmount,
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
        monthly,
        remaining: Array.from(remainingMap.entries()).map(([label, item]) => ({ label, ...item })),
      },
      records,
      total_available: contracts.length,
    });
  } catch (err) {
    console.error('membership dashboard error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
