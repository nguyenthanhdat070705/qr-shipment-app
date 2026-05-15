-- ═══════════════════════════════════════════════════════════════
-- Migration: Complete GetFly sale-contract fields
-- Adds the fields needed to mirror the "Quản lý hợp đồng bán" screen
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE getfly_contracts
  ADD COLUMN IF NOT EXISTS source_contract_code TEXT,
  ADD COLUMN IF NOT EXISTS contract_status_code TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT;

CREATE INDEX IF NOT EXISTS idx_getfly_contracts_source_code
  ON getfly_contracts(source_contract_code);

CREATE INDEX IF NOT EXISTS idx_getfly_contracts_customer_phone
  ON getfly_contracts(customer_phone);
