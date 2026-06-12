/**
 * Chuẩn hoá Hợp Đồng Bán từ bảng MỚI `crm_hop_dong_ban` (mirror Google Sheet)
 * về SHAPE CŨ của `getfly_contracts`, để các tính năng Hội viên / Hợp đồng / lookup
 * (dùng src/lib/membership.ts) chạy nguyên không phải sửa logic.
 *
 * Ánh xạ dựa trên data thật của Sheet Hợp Đồng Bán:
 *   - Khách hàng (cá nhân) nằm ở nhóm `vendor_*`; Blackstones ở `buyers_*`.
 *   - Giá trị HĐ membership (2.160.000) nằm ở `total_payment`.
 *   - Mã MBS nằm ở `contract_code` (vd "MBS26030"); số HĐ ngắn ở `number_of_contract`.
 *   - Người thụ hưởng ở các custom field cf_*.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

type Json = Record<string, string>;

function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}
function str(v: unknown): string | null {
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
}

export interface NormalizedContract {
  getfly_contract_id: string;
  contract_name: string | null;
  contract_code: string | null;
  source_contract_code: string | null;
  contract_status: string | null;
  contract_status_code: string | null;
  contract_type: string | null;
  remaining_days: number | null;
  created_date: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  person_in_charge: string | null;
  contract_value: number;
  actual_value: number;
  executed_amount: number;
  paid_amount: number;
  debt_amount: number;
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
}

/** crm_hop_dong_ban.data (+ synced_at) → shape getfly_contracts cũ. */
export function mapCrmContract(data: Json, syncedAt?: string | null): NormalizedContract {
  return {
    getfly_contract_id: String(data.id ?? ''),
    contract_name: str(data.contract_name),
    contract_code: str(data.number_of_contract) ?? str(data.contract_code),
    source_contract_code: str(data.contract_code) ?? str(data.contract_origin_code),
    contract_status: str(data.contract_status_label),
    contract_status_code: str(data.contract_status),
    contract_type: str(data.contract_type),
    remaining_days: data.expiration_day_remain ? num(data.expiration_day_remain) : null,
    created_date: str(data.effective_date) ?? str(data.contract_date),
    effective_date: str(data.effective_date),
    expiry_date: str(data.expiration_date),
    customer_name: str(data.vendor_account_name),
    customer_phone: str(data.vendor_account_phone) ?? str(data.contract_name),
    person_in_charge: str(data.create_user_display_name) ?? str(data.approved_by_display_name),
    contract_value: num(data.total_payment),
    actual_value: num(data.total_sale_order_real_amount) || num(data.actual_value),
    executed_amount: num(data.total_sale_order_real_amount),
    paid_amount: num(data.total_sale_order_f_amount),
    debt_amount: num(data.total_sale_order_remain_amount),
    beneficiary_name_1: str(data.cf_nguoi_thu_huong_so_1),
    beneficiary_vneid_1: str(data.cf_vneid_nguoi_thu_huong_1),
    beneficiary_phone_1: str(data.cf_so_dien_thoai_nguoi_thu_huong_01),
    beneficiary_address_1: str(data.cf_dia_chi_nguoi_thu_huong_01),
    beneficiary_name_2: str(data.cf_nguoi_thu_huong_02),
    beneficiary_vneid_2: str(data.cf_vneid_nguoi_thu_huong_02),
    beneficiary_phone_2: str(data.cf_so_dien_thoai_nguoi_thu_huong_02),
    beneficiary_address_2: str(data.cf_dia_chi_nguoi_thu_huong_02),
    buyer_email: str(data.cf_email_nguoi_mua),
    synced_at: syncedAt ?? null,
  };
}

/** Đọc toàn bộ Hợp Đồng Bán từ Supabase và chuẩn hoá. */
export async function loadCrmContracts(supabase: SupabaseClient): Promise<NormalizedContract[]> {
  const { data, error } = await supabase
    .from('crm_hop_dong_ban')
    .select('id, data, synced_at')
    .limit(20000);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { data?: Json; synced_at?: string | null }) =>
    mapCrmContract((r.data ?? {}) as Json, r.synced_at ?? null),
  );
}
