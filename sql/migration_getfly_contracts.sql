-- ═══════════════════════════════════════════════════════════════
-- Migration: GetFly Contracts (Quản lý hợp đồng bán)
-- Syncs contract data from GetFly CRM to local Supabase
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS getfly_contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  getfly_contract_id TEXT UNIQUE NOT NULL,

  -- Core contract fields
  contract_name TEXT,                 -- Tên hợp đồng hiển thị (vd: MBS26007 - 0834466303)
  contract_code TEXT,                 -- Số hợp đồng hiển thị (vd: 01)
  source_contract_code TEXT,          -- Mã hợp đồng gốc từ Getfly (vd: MBS26007)
  contract_status TEXT,               -- Trạng thái (Đã duyệt, Đã hoàn thành, Mới, ...)
  contract_status_code TEXT,          -- Mã trạng thái gốc từ Getfly
  contract_type TEXT,                 -- Kiểu hợp đồng (Mới, Gia hạn, ...)
  remaining_days INTEGER,             -- Số ngày còn lại

  -- Dates
  created_date TEXT,                  -- Ngày tạo
  effective_date TEXT,                -- Ngày có hiệu lực
  expiry_date TEXT,                   -- Ngày hết hiệu lực

  -- People
  customer_name TEXT,                 -- Khách hàng
  customer_phone TEXT,                -- SĐT khách hàng / phần sau dấu " - " trong tên HĐ
  person_in_charge TEXT,              -- Người phụ trách

  -- Financial
  contract_value NUMERIC DEFAULT 0,   -- Giá trị hợp đồng
  actual_value NUMERIC DEFAULT 0,     -- Giá trị thực
  executed_amount NUMERIC DEFAULT 0,  -- Đã thực hiện
  paid_amount NUMERIC DEFAULT 0,      -- Đã thanh toán
  debt_amount NUMERIC DEFAULT 0,      -- Công nợ

  -- Beneficiary 1
  beneficiary_name_1 TEXT,            -- Tên Người Thụ Hưởng số 1
  beneficiary_vneid_1 TEXT,           -- VnEid Người Thụ hưởng 1
  beneficiary_phone_1 TEXT,           -- Số Điện Thoại Người Thụ Hưởng 01
  beneficiary_address_1 TEXT,         -- Địa Chỉ Người Thụ Hưởng 01

  -- Beneficiary 2
  beneficiary_name_2 TEXT,            -- Tên Người Thụ Hưởng 02
  beneficiary_vneid_2 TEXT,           -- VNEID Người Thụ Hưởng 02
  beneficiary_phone_2 TEXT,           -- Số Điện Thoại Người Thụ Hưởng 02
  beneficiary_address_2 TEXT,         -- Địa chỉ người thụ hưởng 02

  -- Buyer
  buyer_email TEXT,                   -- Email Người Mua

  -- System
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB                      -- Full raw data from GetFly for reference
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_getfly_contracts_status ON getfly_contracts(contract_status);
CREATE INDEX IF NOT EXISTS idx_getfly_contracts_customer ON getfly_contracts(customer_name);
CREATE INDEX IF NOT EXISTS idx_getfly_contracts_code ON getfly_contracts(contract_code);
CREATE INDEX IF NOT EXISTS idx_getfly_contracts_source_code ON getfly_contracts(source_contract_code);
CREATE INDEX IF NOT EXISTS idx_getfly_contracts_customer_phone ON getfly_contracts(customer_phone);
CREATE INDEX IF NOT EXISTS idx_getfly_contracts_synced ON getfly_contracts(synced_at DESC);
