-- ============================================================================
-- BLACKSTONES — REBUILD CRM SUPABASE cho bộ sheet "Blackstones Data Sync V1"
-- ============================================================================
-- Nguồn: 15 file Google Sheets V1 (folder 1iEqnq7r03nEr2jJPNF2AE04G4TiZ9wbD), append-only.
--
-- Cột generated dùng COALESCE(key ASCII, header tiếng Việt) → ĐIỀN ĐƯỢC dù JSONB
--   đang lưu key tiếng Việt (sync hiện tại) HAY ASCII (sau khi remap writer). Chạy
--   được NGAY, không cần đụng code.
--
-- An toàn: KHÔNG drop bảng nào ngoài getfly_* (legacy). crm_* chỉ THÊM cột + index
--   (idempotent). Link file Hội viên (membership_*) được bảo toàn.
--
-- Nối qua MÃ KHÁCH HÀNG:  crm_khach_hang.id (=GetFly account id) ↔ <con>.account_id
--                          crm_khach_hang.account_code (KHxxxxx)  ↔ <con>.account_code
-- Chạy 1 lần trong Supabase SQL Editor. An toàn chạy lại.
-- ============================================================================

-- ====================== PART A — DỌN LEGACY getfly_* (giữ link Hội viên) ======================
DO $$
DECLARE
  t TEXT;
  has_getfly_contracts BOOLEAN := to_regclass('public.getfly_contracts') IS NOT NULL;
BEGIN
  FOREACH t IN ARRAY ARRAY['membership_attachments','membership_gdrive_attachments'] LOOP
    IF to_regclass('public.'||t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS source_contract_code TEXT;', t);
    IF has_getfly_contracts THEN
      EXECUTE format(
        'UPDATE %I a SET source_contract_code = gc.source_contract_code
           FROM getfly_contracts gc
          WHERE gc.getfly_contract_id = a.getfly_contract_id
            AND COALESCE(a.source_contract_code,'''') = '''';', t);
    END IF;
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (source_contract_code);', 'idx_'||t||'_src_code', t);
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I;', t, t||'_getfly_contract_id_fkey');
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.bulk_upsert_getfly_contracts(jsonb);
DROP FUNCTION IF EXISTS public.bulk_upsert_getfly_accounts(jsonb);
DROP TABLE IF EXISTS getfly_khtt_orders CASCADE;
DROP TABLE IF EXISTS getfly_contracts   CASCADE;
DROP TABLE IF EXISTS getfly_accounts    CASCADE;
DROP TABLE IF EXISTS getfly_customers   CASCADE;


-- ====================== PART B — 15 BẢNG crm_* (THÊM cột generated, KHÔNG xoá) ======================

-- Khách Hàng (crm_khach_hang)
CREATE TABLE IF NOT EXISTS crm_khach_hang (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_khach_hang ADD COLUMN IF NOT EXISTS account_id TEXT GENERATED ALWAYS AS (id) STORED;
ALTER TABLE crm_khach_hang ADD COLUMN IF NOT EXISTS account_code TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'account_code',''), NULLIF(data->>'Mã KH',''))) STORED;
ALTER TABLE crm_khach_hang ADD COLUMN IF NOT EXISTS account_name TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'account_name',''), NULLIF(data->>'Họ tên khách hàng',''))) STORED;
ALTER TABLE crm_khach_hang ADD COLUMN IF NOT EXISTS phone_office TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'phone_office',''), NULLIF(data->>'Điện thoại',''))) STORED;
ALTER TABLE crm_khach_hang ADD COLUMN IF NOT EXISTS email TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'email',''), NULLIF(data->>'Email',''))) STORED;
ALTER TABLE crm_khach_hang ADD COLUMN IF NOT EXISTS cccd TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'cf_so_cccd',''), NULLIF(data->>'Số CCCD',''))) STORED;
ALTER TABLE crm_khach_hang ADD COLUMN IF NOT EXISTS ma_hoi_vien TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'cf_ma_hoi_vien',''), NULLIF(data->>'Mã hội viên',''))) STORED;
ALTER TABLE crm_khach_hang ADD COLUMN IF NOT EXISTS trang_thai_hoi_vien TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'cf_trang_thai_hoi_vien',''), NULLIF(data->>'Trạng thái hội viên',''))) STORED;
ALTER TABLE crm_khach_hang ADD COLUMN IF NOT EXISTS goi_dich_vu TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'cf_goi_dich_vu',''), NULLIF(data->>'Gói dịch vụ dự kiến',''))) STORED;
ALTER TABLE crm_khach_hang ADD COLUMN IF NOT EXISTS lien_he_sdt TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'lh_phone_home',''), NULLIF(data->>'Liên hệ - SĐT',''))) STORED;
CREATE INDEX IF NOT EXISTS idx_khach_hang_account_id ON crm_khach_hang (account_id);
CREATE INDEX IF NOT EXISTS idx_khach_hang_account_code ON crm_khach_hang (account_code);
CREATE INDEX IF NOT EXISTS idx_khach_hang_account_name ON crm_khach_hang (account_name);
CREATE INDEX IF NOT EXISTS idx_khach_hang_phone_office ON crm_khach_hang (phone_office);
CREATE INDEX IF NOT EXISTS idx_khach_hang_email ON crm_khach_hang (email);
CREATE INDEX IF NOT EXISTS idx_khach_hang_cccd ON crm_khach_hang (cccd);
CREATE INDEX IF NOT EXISTS idx_khach_hang_ma_hoi_vien ON crm_khach_hang (ma_hoi_vien);
CREATE INDEX IF NOT EXISTS idx_khach_hang_trang_thai_hoi_vien ON crm_khach_hang (trang_thai_hoi_vien);

-- Đơn Bán (crm_don_ban)
CREATE TABLE IF NOT EXISTS crm_don_ban (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_don_ban ADD COLUMN IF NOT EXISTS account_id TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'account_id',''), NULLIF(data->>'Mã KH (ID)',''))) STORED;
ALTER TABLE crm_don_ban ADD COLUMN IF NOT EXISTS account_code TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'account_code',''), NULLIF(data->>'Mã KH',''))) STORED;
ALTER TABLE crm_don_ban ADD COLUMN IF NOT EXISTS order_code TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'order_code',''), NULLIF(data->>'Mã đơn',''))) STORED;
ALTER TABLE crm_don_ban ADD COLUMN IF NOT EXISTS status TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'status',''), NULLIF(data->>'Trạng thái (mã)',''))) STORED;
ALTER TABLE crm_don_ban ADD COLUMN IF NOT EXISTS status_label TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'status_label',''), NULLIF(data->>'Trạng thái',''))) STORED;
ALTER TABLE crm_don_ban ADD COLUMN IF NOT EXISTS order_date TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'order_date',''), NULLIF(data->>'Ngày đơn hàng',''))) STORED;
ALTER TABLE crm_don_ban ADD COLUMN IF NOT EXISTS account_phone TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'account_phone',''), NULLIF(data->>'SĐT KH',''))) STORED;
ALTER TABLE crm_don_ban ADD COLUMN IF NOT EXISTS contact_phone TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'contact_phone',''), NULLIF(data->>'SĐT liên hệ',''))) STORED;
ALTER TABLE crm_don_ban ADD COLUMN IF NOT EXISTS product_code TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'sp_product_code',''), NULLIF(data->>'SP - Mã SP',''))) STORED;
ALTER TABLE crm_don_ban ADD COLUMN IF NOT EXISTS contract_link_id TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'contract_id',''), NULLIF(data->>'Mã HĐ liên kết',''))) STORED;
ALTER TABLE crm_don_ban ADD COLUMN IF NOT EXISTS nguoi_gioi_thieu TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'cf_nguoi_gioi_thieu',''), NULLIF(data->>'Người giới thiệu',''))) STORED;
CREATE INDEX IF NOT EXISTS idx_don_ban_account_id ON crm_don_ban (account_id);
CREATE INDEX IF NOT EXISTS idx_don_ban_account_code ON crm_don_ban (account_code);
CREATE INDEX IF NOT EXISTS idx_don_ban_order_code ON crm_don_ban (order_code);
CREATE INDEX IF NOT EXISTS idx_don_ban_status ON crm_don_ban (status);
CREATE INDEX IF NOT EXISTS idx_don_ban_order_date ON crm_don_ban (order_date);
CREATE INDEX IF NOT EXISTS idx_don_ban_account_phone ON crm_don_ban (account_phone);
CREATE INDEX IF NOT EXISTS idx_don_ban_contact_phone ON crm_don_ban (contact_phone);
CREATE INDEX IF NOT EXISTS idx_don_ban_contract_link_id ON crm_don_ban (contract_link_id);
CREATE INDEX IF NOT EXISTS idx_don_ban_nguoi_gioi_thieu ON crm_don_ban (nguoi_gioi_thieu);

-- Đơn Mua (crm_don_mua)
CREATE TABLE IF NOT EXISTS crm_don_mua (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_don_mua ADD COLUMN IF NOT EXISTS account_id TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'account_id',''), NULLIF(data->>'Mã KH (ID)',''))) STORED;
ALTER TABLE crm_don_mua ADD COLUMN IF NOT EXISTS account_code TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'account_code',''), NULLIF(data->>'Mã KH',''))) STORED;
ALTER TABLE crm_don_mua ADD COLUMN IF NOT EXISTS order_code TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'order_code',''), NULLIF(data->>'Mã đơn',''))) STORED;
ALTER TABLE crm_don_mua ADD COLUMN IF NOT EXISTS order_date TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'order_date',''), NULLIF(data->>'Ngày đơn hàng',''))) STORED;
ALTER TABLE crm_don_mua ADD COLUMN IF NOT EXISTS account_phone TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'account_phone',''), NULLIF(data->>'SĐT KH',''))) STORED;
ALTER TABLE crm_don_mua ADD COLUMN IF NOT EXISTS contract_link_id TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'contract_id',''), NULLIF(data->>'Mã HĐ liên kết',''))) STORED;
CREATE INDEX IF NOT EXISTS idx_don_mua_account_id ON crm_don_mua (account_id);
CREATE INDEX IF NOT EXISTS idx_don_mua_account_code ON crm_don_mua (account_code);
CREATE INDEX IF NOT EXISTS idx_don_mua_order_code ON crm_don_mua (order_code);
CREATE INDEX IF NOT EXISTS idx_don_mua_order_date ON crm_don_mua (order_date);
CREATE INDEX IF NOT EXISTS idx_don_mua_contract_link_id ON crm_don_mua (contract_link_id);

-- Hợp Đồng Bán (crm_hop_dong_ban)
CREATE TABLE IF NOT EXISTS crm_hop_dong_ban (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_hop_dong_ban ADD COLUMN IF NOT EXISTS account_id TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'vendor_account_id',''), NULLIF(data->>'Bên bán (ID)',''))) STORED;
ALTER TABLE crm_hop_dong_ban ADD COLUMN IF NOT EXISTS contract_code TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'contract_code',''), NULLIF(data->>'Mã hợp đồng',''))) STORED;
ALTER TABLE crm_hop_dong_ban ADD COLUMN IF NOT EXISTS number_of_contract TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'number_of_contract',''), NULLIF(data->>'Số hợp đồng',''))) STORED;
ALTER TABLE crm_hop_dong_ban ADD COLUMN IF NOT EXISTS contract_status TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'contract_status',''), NULLIF(data->>'Trạng thái (mã)',''))) STORED;
ALTER TABLE crm_hop_dong_ban ADD COLUMN IF NOT EXISTS contract_status_label TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'contract_status_label',''), NULLIF(data->>'Trạng thái',''))) STORED;
ALTER TABLE crm_hop_dong_ban ADD COLUMN IF NOT EXISTS effective_date TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'effective_date',''), NULLIF(data->>'Ngày hiệu lực',''))) STORED;
ALTER TABLE crm_hop_dong_ban ADD COLUMN IF NOT EXISTS expiration_date TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'expiration_date',''), NULLIF(data->>'Ngày hết hạn',''))) STORED;
ALTER TABLE crm_hop_dong_ban ADD COLUMN IF NOT EXISTS customer_name TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'vendor_account_name',''), NULLIF(data->>'Bên bán',''))) STORED;
ALTER TABLE crm_hop_dong_ban ADD COLUMN IF NOT EXISTS customer_phone TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'vendor_account_phone',''), NULLIF(data->>'Bên bán - SĐT',''))) STORED;
ALTER TABLE crm_hop_dong_ban ADD COLUMN IF NOT EXISTS cccd_kh TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'cf_cccd_kh',''), NULLIF(data->>'CCCD khách hàng',''))) STORED;
ALTER TABLE crm_hop_dong_ban ADD COLUMN IF NOT EXISTS beneficiary_vneid_1 TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'cf_vneid_nguoi_thu_huong_1',''), NULLIF(data->>'VNeID thụ hưởng 1',''))) STORED;
ALTER TABLE crm_hop_dong_ban ADD COLUMN IF NOT EXISTS beneficiary_vneid_2 TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'cf_vneid_nguoi_thu_huong_02',''), NULLIF(data->>'VNeID thụ hưởng 2',''))) STORED;
ALTER TABLE crm_hop_dong_ban ADD COLUMN IF NOT EXISTS beneficiary_phone_1 TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'cf_so_dien_thoai_nguoi_thu_huong_01',''), NULLIF(data->>'SĐT thụ hưởng 1',''))) STORED;
ALTER TABLE crm_hop_dong_ban ADD COLUMN IF NOT EXISTS beneficiary_phone_2 TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'cf_so_dien_thoai_nguoi_thu_huong_02',''), NULLIF(data->>'SĐT thụ hưởng 2',''))) STORED;
ALTER TABLE crm_hop_dong_ban ADD COLUMN IF NOT EXISTS total_payment TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'total_payment',''), NULLIF(data->>'Tổng đã thanh toán',''))) STORED;
ALTER TABLE crm_hop_dong_ban ADD COLUMN IF NOT EXISTS quote_code TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'quote_code',''), NULLIF(data->>'Mã báo giá',''))) STORED;
CREATE INDEX IF NOT EXISTS idx_hop_dong_ban_account_id ON crm_hop_dong_ban (account_id);
CREATE INDEX IF NOT EXISTS idx_hop_dong_ban_contract_code ON crm_hop_dong_ban (contract_code);
CREATE INDEX IF NOT EXISTS idx_hop_dong_ban_number_of_contract ON crm_hop_dong_ban (number_of_contract);
CREATE INDEX IF NOT EXISTS idx_hop_dong_ban_contract_status_label ON crm_hop_dong_ban (contract_status_label);
CREATE INDEX IF NOT EXISTS idx_hop_dong_ban_effective_date ON crm_hop_dong_ban (effective_date);
CREATE INDEX IF NOT EXISTS idx_hop_dong_ban_expiration_date ON crm_hop_dong_ban (expiration_date);
CREATE INDEX IF NOT EXISTS idx_hop_dong_ban_customer_name ON crm_hop_dong_ban (customer_name);
CREATE INDEX IF NOT EXISTS idx_hop_dong_ban_customer_phone ON crm_hop_dong_ban (customer_phone);
CREATE INDEX IF NOT EXISTS idx_hop_dong_ban_cccd_kh ON crm_hop_dong_ban (cccd_kh);
CREATE INDEX IF NOT EXISTS idx_hop_dong_ban_beneficiary_vneid_1 ON crm_hop_dong_ban (beneficiary_vneid_1);
CREATE INDEX IF NOT EXISTS idx_hop_dong_ban_beneficiary_vneid_2 ON crm_hop_dong_ban (beneficiary_vneid_2);
CREATE INDEX IF NOT EXISTS idx_hop_dong_ban_beneficiary_phone_1 ON crm_hop_dong_ban (beneficiary_phone_1);
CREATE INDEX IF NOT EXISTS idx_hop_dong_ban_beneficiary_phone_2 ON crm_hop_dong_ban (beneficiary_phone_2);

-- Hợp Đồng Mua (crm_hop_dong_mua)
CREATE TABLE IF NOT EXISTS crm_hop_dong_mua (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_hop_dong_mua ADD COLUMN IF NOT EXISTS account_id TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'vendor_account_id',''), NULLIF(data->>'Bên bán (ID)',''))) STORED;
ALTER TABLE crm_hop_dong_mua ADD COLUMN IF NOT EXISTS contract_code TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'contract_code',''), NULLIF(data->>'Mã hợp đồng',''))) STORED;
ALTER TABLE crm_hop_dong_mua ADD COLUMN IF NOT EXISTS contract_status_label TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'contract_status_label',''), NULLIF(data->>'Trạng thái',''))) STORED;
ALTER TABLE crm_hop_dong_mua ADD COLUMN IF NOT EXISTS customer_name TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'vendor_account_name',''), NULLIF(data->>'Bên bán',''))) STORED;
ALTER TABLE crm_hop_dong_mua ADD COLUMN IF NOT EXISTS customer_phone TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'vendor_account_phone',''), NULLIF(data->>'Bên bán - SĐT',''))) STORED;
CREATE INDEX IF NOT EXISTS idx_hop_dong_mua_account_id ON crm_hop_dong_mua (account_id);
CREATE INDEX IF NOT EXISTS idx_hop_dong_mua_contract_code ON crm_hop_dong_mua (contract_code);
CREATE INDEX IF NOT EXISTS idx_hop_dong_mua_contract_status_label ON crm_hop_dong_mua (contract_status_label);
CREATE INDEX IF NOT EXISTS idx_hop_dong_mua_customer_name ON crm_hop_dong_mua (customer_name);

-- Báo Giá (crm_bao_gia)
CREATE TABLE IF NOT EXISTS crm_bao_gia (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_bao_gia ADD COLUMN IF NOT EXISTS account_id TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'account_id',''), NULLIF(data->>'Mã KH (ID)',''))) STORED;
ALTER TABLE crm_bao_gia ADD COLUMN IF NOT EXISTS account_code TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'account_code',''), NULLIF(data->>'Mã KH',''))) STORED;
ALTER TABLE crm_bao_gia ADD COLUMN IF NOT EXISTS quote_code TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'quote_code',''), NULLIF(data->>'Mã báo giá',''))) STORED;
ALTER TABLE crm_bao_gia ADD COLUMN IF NOT EXISTS account_name TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'account_name',''), NULLIF(data->>'Họ tên khách hàng',''))) STORED;
ALTER TABLE crm_bao_gia ADD COLUMN IF NOT EXISTS account_phone TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'account_phone',''), NULLIF(data->>'SĐT KH',''))) STORED;
CREATE INDEX IF NOT EXISTS idx_bao_gia_account_id ON crm_bao_gia (account_id);
CREATE INDEX IF NOT EXISTS idx_bao_gia_account_code ON crm_bao_gia (account_code);
CREATE INDEX IF NOT EXISTS idx_bao_gia_quote_code ON crm_bao_gia (quote_code);

-- Sản Phẩm (crm_san_pham)
CREATE TABLE IF NOT EXISTS crm_san_pham (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_san_pham ADD COLUMN IF NOT EXISTS product_code TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'product_code',''), NULLIF(data->>'Mã SP',''))) STORED;
ALTER TABLE crm_san_pham ADD COLUMN IF NOT EXISTS product_name TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'product_name',''), NULLIF(data->>'Tên SP',''))) STORED;
ALTER TABLE crm_san_pham ADD COLUMN IF NOT EXISTS category_name TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'category_name',''), NULLIF(data->>'Nhóm SP',''))) STORED;
CREATE INDEX IF NOT EXISTS idx_san_pham_product_code ON crm_san_pham (product_code);
CREATE INDEX IF NOT EXISTS idx_san_pham_product_name ON crm_san_pham (product_name);

-- Công Việc (crm_cong_viec)
CREATE TABLE IF NOT EXISTS crm_cong_viec (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_cong_viec ADD COLUMN IF NOT EXISTS account_code TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'kh_account_code',''), NULLIF(data->>'KH liên quan - Mã KH',''))) STORED;
ALTER TABLE crm_cong_viec ADD COLUMN IF NOT EXISTS task_code TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'task_code',''), NULLIF(data->>'Mã công việc',''))) STORED;
ALTER TABLE crm_cong_viec ADD COLUMN IF NOT EXISTS customer_name TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'kh_account_name',''), NULLIF(data->>'KH liên quan - Tên KH',''))) STORED;
ALTER TABLE crm_cong_viec ADD COLUMN IF NOT EXISTS account_phone TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'kh_account_phone',''), NULLIF(data->>'KH liên quan - SĐT KH',''))) STORED;
CREATE INDEX IF NOT EXISTS idx_cong_viec_account_code ON crm_cong_viec (account_code);
CREATE INDEX IF NOT EXISTS idx_cong_viec_task_code ON crm_cong_viec (task_code);

-- Cơ Hội (crm_co_hoi)
CREATE TABLE IF NOT EXISTS crm_co_hoi (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_co_hoi ADD COLUMN IF NOT EXISTS account_id TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'account_id',''), NULLIF(data->>'Mã KH (ID)',''))) STORED;
ALTER TABLE crm_co_hoi ADD COLUMN IF NOT EXISTS opportunity_code TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'opportunity_code',''), NULLIF(data->>'Mã cơ hội',''))) STORED;
ALTER TABLE crm_co_hoi ADD COLUMN IF NOT EXISTS account_name TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'account_name',''), NULLIF(data->>'Họ tên khách hàng',''))) STORED;
ALTER TABLE crm_co_hoi ADD COLUMN IF NOT EXISTS phone_office TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'phone_office',''), NULLIF(data->>'Điện thoại',''))) STORED;
CREATE INDEX IF NOT EXISTS idx_co_hoi_account_id ON crm_co_hoi (account_id);
CREATE INDEX IF NOT EXISTS idx_co_hoi_opportunity_code ON crm_co_hoi (opportunity_code);

-- Chiến Dịch (crm_chien_dich)
CREATE TABLE IF NOT EXISTS crm_chien_dich (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_chien_dich ADD COLUMN IF NOT EXISTS campaign_code TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'campaign_code',''), NULLIF(data->>'Mã chiến dịch',''))) STORED;
ALTER TABLE crm_chien_dich ADD COLUMN IF NOT EXISTS campaign_name TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'campaign_name',''), NULLIF(data->>'Tên chiến dịch',''))) STORED;
CREATE INDEX IF NOT EXISTS idx_chien_dich_campaign_code ON crm_chien_dich (campaign_code);

-- Người Dùng (crm_nguoi_dung)
CREATE TABLE IF NOT EXISTS crm_nguoi_dung (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_nguoi_dung ADD COLUMN IF NOT EXISTS phone TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'contact_mobile',''), NULLIF(data->>'SĐT',''))) STORED;
ALTER TABLE crm_nguoi_dung ADD COLUMN IF NOT EXISTS email TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'email',''), NULLIF(data->>'Email',''))) STORED;
ALTER TABLE crm_nguoi_dung ADD COLUMN IF NOT EXISTS nguoi_lap TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'user_name',''), NULLIF(data->>'Người lập',''))) STORED;

-- Kho (crm_kho)
CREATE TABLE IF NOT EXISTS crm_kho (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_kho ADD COLUMN IF NOT EXISTS store_name TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'store_name',''), NULLIF(data->>'Tên kho',''))) STORED;

-- Quỹ (crm_quy)
CREATE TABLE IF NOT EXISTS crm_quy (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_quy ADD COLUMN IF NOT EXISTS fund_code TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'fund_code',''), NULLIF(data->>'Mã quỹ',''))) STORED;
ALTER TABLE crm_quy ADD COLUMN IF NOT EXISTS fund_title TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'fund_title',''), NULLIF(data->>'Tên quỹ',''))) STORED;

-- PT Thanh Toán (crm_pt_thanh_toan)
CREATE TABLE IF NOT EXISTS crm_pt_thanh_toan (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_pt_thanh_toan ADD COLUMN IF NOT EXISTS method_name TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'method_name',''), NULLIF(data->>'Tên PT thanh toán',''))) STORED;

-- Trao Đổi (crm_trao_doi)  [BẢNG MỚI]
CREATE TABLE IF NOT EXISTS crm_trao_doi (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE crm_trao_doi ADD COLUMN IF NOT EXISTS account_id TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'account_id',''), NULLIF(data->>'Mã KH (ID)',''))) STORED;
ALTER TABLE crm_trao_doi ADD COLUMN IF NOT EXISTS account_name TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'account_name',''), NULLIF(data->>'Họ tên khách hàng',''))) STORED;
ALTER TABLE crm_trao_doi ADD COLUMN IF NOT EXISTS comment_title TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'comment_title',''), NULLIF(data->>'Tiêu đề',''))) STORED;
ALTER TABLE crm_trao_doi ADD COLUMN IF NOT EXISTS created_at TEXT GENERATED ALWAYS AS (COALESCE(NULLIF(data->>'created_at',''), NULLIF(data->>'Ngày tạo',''))) STORED;
CREATE INDEX IF NOT EXISTS idx_trao_doi_account_id ON crm_trao_doi (account_id);

-- ====================== PART C — VIEW NỐI QUA MÃ KHÁCH HÀNG ======================
CREATE OR REPLACE VIEW v_don_ban_kh AS
SELECT db.id, db.order_code, db.order_date, db.status_label,
       db.account_id, db.account_code, kh.account_name AS ten_khach_hang,
       COALESCE(db.data->>'real_amount', db.data->>'Tổng tiền') AS tong_tien,
       COALESCE(db.data->>'f_amount',    db.data->>'Đã thanh toán') AS da_thanh_toan,
       db.nguoi_gioi_thieu, db.synced_at
FROM crm_don_ban db
LEFT JOIN crm_khach_hang kh ON kh.id = db.account_id;

CREATE OR REPLACE VIEW v_hop_dong_ban_kh AS
SELECT hd.id, hd.contract_code, hd.number_of_contract, hd.contract_status_label,
       hd.effective_date, hd.expiration_date, hd.account_id,
       hd.customer_name, hd.customer_phone, hd.cccd_kh, hd.total_payment,
       kh.account_code, kh.ma_hoi_vien, hd.synced_at
FROM crm_hop_dong_ban hd
LEFT JOIN crm_khach_hang kh ON kh.id = hd.account_id;

CREATE OR REPLACE VIEW v_kh_360 AS
SELECT kh.id AS account_id, kh.account_code, kh.account_name, kh.phone_office,
       kh.ma_hoi_vien, kh.trang_thai_hoi_vien, kh.cccd,
       COALESCE(db.so_don,0) AS so_don_ban, db.don_gan_nhat,
       COALESCE(hd.so_hd,0) AS so_hop_dong_ban,
       COALESCE(tr.so_trao_doi,0) AS so_trao_doi
FROM crm_khach_hang kh
LEFT JOIN (SELECT account_id, COUNT(*) so_don, MAX(order_date) don_gan_nhat FROM crm_don_ban GROUP BY account_id) db ON db.account_id = kh.id
LEFT JOIN (SELECT account_id, COUNT(*) so_hd FROM crm_hop_dong_ban GROUP BY account_id) hd ON hd.account_id = kh.id
LEFT JOIN (SELECT account_id, COUNT(*) so_trao_doi FROM crm_trao_doi GROUP BY account_id) tr ON tr.account_id = kh.id;

-- Người giới thiệu mới nhất / khách hàng (suy từ đơn bán)
CREATE OR REPLACE VIEW v_nguoi_gioi_thieu AS
SELECT DISTINCT ON (account_id)
       account_id, account_code, nguoi_gioi_thieu, order_code AS don_gan_nhat, order_date
FROM crm_don_ban
WHERE account_id IS NOT NULL AND nguoi_gioi_thieu IS NOT NULL
ORDER BY account_id, (CASE WHEN id ~ '^[0-9]+$' THEN id::bigint ELSE 0 END) DESC;

-- ====================== PART D — RLS (service_role toàn quyền) ======================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['crm_khach_hang','crm_don_ban','crm_don_mua','crm_hop_dong_ban','crm_hop_dong_mua','crm_bao_gia','crm_san_pham','crm_cong_viec','crm_co_hoi','crm_chien_dich','crm_nguoi_dung','crm_kho','crm_quy','crm_pt_thanh_toan','crm_trao_doi'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'service_all_'||t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO service_role USING (true) WITH CHECK (true);', 'service_all_'||t, t);
  END LOOP;
END $$;

-- ============== (TÙY CHỌN) XÓA SẠCH DATA crm_* CŨ RỒI SYNC LẠI ==============
-- Bỏ comment dòng dưới nếu muốn xoá data cũ (giữ cấu trúc) — vd để bỏ data import nhầm từ Excel.
-- TRUNCATE crm_khach_hang, crm_don_ban, crm_don_mua, crm_hop_dong_ban, crm_hop_dong_mua, crm_bao_gia, crm_san_pham, crm_cong_viec, crm_co_hoi, crm_chien_dich, crm_nguoi_dung, crm_kho, crm_quy, crm_pt_thanh_toan, crm_trao_doi RESTART IDENTITY;
