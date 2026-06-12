-- ============================================================================
-- CRM SHEETS → SUPABASE: 14 bảng mirror hiện trạng từ Google Sheets
-- ============================================================================
-- Nguồn: 14 file "BLACKSTONES Data" (Apps Script getfly_drive_sync.gs, append-only).
-- Mỗi bảng = hiện trạng (current-state) của 1 module. Sync engine: src/lib/crmSheetSync.ts
--
-- Shape đồng nhất:
--   id          TEXT PK     -- cột khoá của Sheet (users: user_id)
--   data        JSONB       -- TOÀN BỘ trường data của Sheet (key = header)
--   change_type TEXT        -- "Loại thay đổi" của dòng cuối (Tạo mới/Cập nhật)
--   recorded_at TEXT        -- "Thời điểm ghi nhận" của dòng cuối (giữ nguyên text Sheet)
--   synced_at   TIMESTAMPTZ -- thời điểm sync vào Supabase
--
-- Chạy 1 lần trong Supabase SQL Editor. An toàn chạy lại (IF NOT EXISTS).
-- ============================================================================

-- 1. KHÁCH HÀNG ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_khach_hang (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_kh_account_code ON crm_khach_hang ((data->>'account_code'));
CREATE INDEX IF NOT EXISTS idx_crm_kh_account_id   ON crm_khach_hang ((data->>'account_id'));
CREATE INDEX IF NOT EXISTS idx_crm_kh_phone        ON crm_khach_hang ((data->>'phone_office'));
CREATE INDEX IF NOT EXISTS idx_crm_kh_ma_hoi_vien  ON crm_khach_hang ((data->>'cf_ma_hoi_vien'));
CREATE INDEX IF NOT EXISTS idx_crm_kh_cccd         ON crm_khach_hang ((data->>'cf_so_cccd'));

-- 2. ĐƠN BÁN ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_don_ban (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_db_order_code   ON crm_don_ban ((data->>'order_code'));
CREATE INDEX IF NOT EXISTS idx_crm_db_status       ON crm_don_ban ((data->>'status'));
CREATE INDEX IF NOT EXISTS idx_crm_db_account_id   ON crm_don_ban ((data->>'account_id'));
CREATE INDEX IF NOT EXISTS idx_crm_db_account_phone ON crm_don_ban ((data->>'account_phone'));
CREATE INDEX IF NOT EXISTS idx_crm_db_contact_phone ON crm_don_ban ((data->>'contact_phone'));

-- 3. ĐƠN MUA ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_don_mua (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_dm_order_code ON crm_don_mua ((data->>'order_code'));
CREATE INDEX IF NOT EXISTS idx_crm_dm_status     ON crm_don_mua ((data->>'status'));

-- 4. HỢP ĐỒNG BÁN -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_hop_dong_ban (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_hdb_code        ON crm_hop_dong_ban ((data->>'contract_code'));
CREATE INDEX IF NOT EXISTS idx_crm_hdb_status      ON crm_hop_dong_ban ((data->>'contract_status_label'));
CREATE INDEX IF NOT EXISTS idx_crm_hdb_buyer_phone ON crm_hop_dong_ban ((data->>'buyers_account_phone'));
CREATE INDEX IF NOT EXISTS idx_crm_hdb_cccd        ON crm_hop_dong_ban ((data->>'cf_cccd_kh'));
CREATE INDEX IF NOT EXISTS idx_crm_hdb_bnf_phone1  ON crm_hop_dong_ban ((data->>'cf_so_dien_thoai_nguoi_thu_huong_01'));
CREATE INDEX IF NOT EXISTS idx_crm_hdb_bnf_phone2  ON crm_hop_dong_ban ((data->>'cf_so_dien_thoai_nguoi_thu_huong_02'));
CREATE INDEX IF NOT EXISTS idx_crm_hdb_bnf_vneid1  ON crm_hop_dong_ban ((data->>'cf_vneid_nguoi_thu_huong_1'));
CREATE INDEX IF NOT EXISTS idx_crm_hdb_bnf_vneid2  ON crm_hop_dong_ban ((data->>'cf_vneid_nguoi_thu_huong_02'));

-- 5. HỢP ĐỒNG MUA -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_hop_dong_mua (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_hdm_code   ON crm_hop_dong_mua ((data->>'contract_code'));
CREATE INDEX IF NOT EXISTS idx_crm_hdm_status ON crm_hop_dong_mua ((data->>'contract_status_label'));

-- 6. BÁO GIÁ ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_bao_gia (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_bg_code   ON crm_bao_gia ((data->>'quote_code'));
CREATE INDEX IF NOT EXISTS idx_crm_bg_status ON crm_bao_gia ((data->>'status_title'));

-- 7. SẢN PHẨM -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_san_pham (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_sp_code     ON crm_san_pham ((data->>'product_code'));
CREATE INDEX IF NOT EXISTS idx_crm_sp_category ON crm_san_pham ((data->>'category_name'));

-- 8. CÔNG VIỆC ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_cong_viec (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_cv_status   ON crm_cong_viec ((data->>'task_status_title'));
CREATE INDEX IF NOT EXISTS idx_crm_cv_receiver ON crm_cong_viec ((data->>'task_receiver_display_name'));

-- 9. CƠ HỘI -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_co_hoi (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_ch_status   ON crm_co_hoi ((data->>'opportunity_status_name'));
CREATE INDEX IF NOT EXISTS idx_crm_ch_campaign ON crm_co_hoi ((data->>'campaign_name'));

-- 10. CHIẾN DỊCH --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_chien_dich (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- 11. NGƯỜI DÙNG --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_nguoi_dung (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_nd_dept ON crm_nguoi_dung ((data->>'dept_name'));

-- 12. KHO ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_kho (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- 13. QUỸ ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_quy (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- 14. PHƯƠNG THỨC THANH TOÁN --------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_pt_thanh_toan (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT,
  recorded_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- RLS: bật + cho phép service_role toàn quyền (các API đều dùng service-role).
-- ============================================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'crm_khach_hang','crm_don_ban','crm_don_mua','crm_hop_dong_ban','crm_hop_dong_mua',
    'crm_bao_gia','crm_san_pham','crm_cong_viec','crm_co_hoi','crm_chien_dich',
    'crm_nguoi_dung','crm_kho','crm_quy','crm_pt_thanh_toan'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'service_all_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO service_role USING (true) WITH CHECK (true);',
      'service_all_' || t, t
    );
  END LOOP;
END $$;
