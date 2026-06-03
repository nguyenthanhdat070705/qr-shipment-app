// ─────────────────────────────────────────────────────────────
// Canonical definition of a valid "Hội Viên Trăm Tuổi" membership.
//
// Source of truth is the GetFly sale contracts synced into the
// `getfly_contracts` table. A single customer (buyer) can hold MANY
// contracts (membership, bất động sản, KHTT…), so a contract only
// counts as a valid membership when ALL of the following hold:
//
//   1. Its code/name carries the "MBS" prefix.
//   2. Its status is exactly "Đã duyệt" (approved). This excludes the
//      upgrade case where a "hội viên trăm tuổi" is promoted to
//      "khách hàng trăm tuổi" and the contract flips to "Đã hoàn thành".
//   3. Its contract value is exactly 2.160.000đ. This excludes the same
//      upgrade case where the value is later zeroed out, and any other
//      non-membership package.
//
// GetFly does NOT expose a "loại khách hàng" (hội viên vs khách hàng
// trăm tuổi) field in its contract payload, so the (status + value)
// pair above is the reliable signature for a genuine membership.
// ─────────────────────────────────────────────────────────────

export const MEMBERSHIP_CONTRACT_VALUE = 2_160_000;
export const MEMBERSHIP_APPROVED_STATUS = 'Đã duyệt';
export const MEMBERSHIP_CODE_PREFIX = 'MBS';

export type MembershipContractLike = {
  source_contract_code?: unknown;
  contract_code?: unknown;
  contract_name?: unknown;
  contract_status?: unknown;
  contract_value?: unknown;
};

export function hasMbsCode(contract: MembershipContractLike): boolean {
  return [contract.source_contract_code, contract.contract_code, contract.contract_name].some(
    (value) => String(value ?? '').trim().toUpperCase().startsWith(MEMBERSHIP_CODE_PREFIX),
  );
}

export function isApprovedStatus(status: unknown): boolean {
  return String(status ?? '').trim() === MEMBERSHIP_APPROVED_STATUS;
}

export function hasMembershipValue(value: unknown): boolean {
  return Number(value) === MEMBERSHIP_CONTRACT_VALUE;
}

export function isMembershipContract(contract: MembershipContractLike): boolean {
  return (
    hasMbsCode(contract) &&
    isApprovedStatus(contract.contract_status) &&
    hasMembershipValue(contract.contract_value)
  );
}

// A membership can be re-synced under a NEW getfly_contract_id when its GetFly
// id changes, leaving stale duplicate rows that share the same MBS code (e.g.
// MBS26017 appearing twice — one current, one with paid_amount = 0). Collapse
// rows by MBS code, keeping the most recently synced one (latest `synced_at`).
export function dedupeMembershipsByCode<
  T extends { source_contract_code?: unknown; contract_name?: unknown; synced_at?: unknown },
>(rows: T[]): T[] {
  const syncedAt = (row: T) => String(row.synced_at ?? '');
  const best = new Map<string, T>();
  const passthrough: T[] = [];

  for (const row of rows) {
    const code = String(row.source_contract_code ?? row.contract_name ?? '').trim().toUpperCase();
    if (!code) {
      passthrough.push(row);
      continue;
    }
    const existing = best.get(code);
    if (!existing || syncedAt(row) > syncedAt(existing)) best.set(code, row);
  }

  return [...best.values(), ...passthrough];
}
