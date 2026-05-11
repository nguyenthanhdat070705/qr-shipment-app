-- ═══════════════════════════════════════════════════════════════
-- CHẠY TOÀN BỘ FILE NÀY TRONG SUPABASE SQL EDITOR
-- Bao gồm: Tạo bảng + Tạo RPC function + Grant permissions
-- ═══════════════════════════════════════════════════════════════

-- ── Step 1: Tạo bảng getfly_accounts ──
CREATE TABLE IF NOT EXISTS getfly_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  getfly_account_id TEXT UNIQUE NOT NULL,
  account_code TEXT,
  account_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  description TEXT,
  account_type TEXT,
  account_source TEXT,
  relation_name TEXT,
  industry_name TEXT,
  manager_email TEXT,
  manager_user_name TEXT,
  ma_hoi_vien TEXT,
  goi_dich_vu TEXT,
  trang_thai_hoi_vien TEXT,
  ngay_tham_gia TEXT,
  ho_ten_nguoi_mat TEXT,
  ngay_mat TEXT,
  thoi_gian_to_chuc_dam TEXT,
  dia_chi_chon_cat TEXT,
  dia_chi_lien_he TEXT,
  so_cccd TEXT,
  so_tk_ngan_hang TEXT,
  ten_ngan_hang TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  province_name TEXT,
  revenue NUMERIC DEFAULT 0,
  gdrive_folder_id TEXT,
  gdrive_folder_url TEXT,
  getfly_created_at TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB
);

-- ── Step 2: Tạo indexes ──
CREATE INDEX IF NOT EXISTS idx_gfa_name ON getfly_accounts(account_name);
CREATE INDEX IF NOT EXISTS idx_gfa_phone ON getfly_accounts(phone);
CREATE INDEX IF NOT EXISTS idx_gfa_code ON getfly_accounts(account_code);
CREATE INDEX IF NOT EXISTS idx_gfa_type ON getfly_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_gfa_cccd ON getfly_accounts(so_cccd);
CREATE INDEX IF NOT EXISTS idx_gfa_hv ON getfly_accounts(ma_hoi_vien);

-- ── Step 3: Grant permissions ──
GRANT ALL ON getfly_accounts TO anon, authenticated, service_role;

-- ── Step 4: Tạo RPC function (bypass PostgREST cache) ──
CREATE OR REPLACE FUNCTION bulk_upsert_getfly_accounts(payload jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item jsonb;
  cnt integer := 0;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(payload)
  LOOP
    INSERT INTO getfly_accounts (
      getfly_account_id, account_code, account_name, phone, email, address, description,
      account_type, account_source, relation_name, industry_name,
      manager_email, manager_user_name,
      ma_hoi_vien, goi_dich_vu, trang_thai_hoi_vien, ngay_tham_gia,
      ho_ten_nguoi_mat, ngay_mat, thoi_gian_to_chuc_dam, dia_chi_chon_cat, dia_chi_lien_he,
      so_cccd, so_tk_ngan_hang, ten_ngan_hang,
      contact_name, contact_phone, province_name, revenue,
      getfly_created_at, synced_at, raw_data
    ) VALUES (
      item->>'getfly_account_id', item->>'account_code', item->>'account_name',
      item->>'phone', item->>'email', item->>'address', item->>'description',
      item->>'account_type', item->>'account_source', item->>'relation_name', item->>'industry_name',
      item->>'manager_email', item->>'manager_user_name',
      item->>'ma_hoi_vien', item->>'goi_dich_vu', item->>'trang_thai_hoi_vien', item->>'ngay_tham_gia',
      item->>'ho_ten_nguoi_mat', item->>'ngay_mat', item->>'thoi_gian_to_chuc_dam',
      item->>'dia_chi_chon_cat', item->>'dia_chi_lien_he',
      item->>'so_cccd', item->>'so_tk_ngan_hang', item->>'ten_ngan_hang',
      item->>'contact_name', item->>'contact_phone', item->>'province_name',
      COALESCE((item->>'revenue')::numeric, 0),
      item->>'getfly_created_at', NOW(), item->'raw_data'
    )
    ON CONFLICT (getfly_account_id) DO UPDATE SET
      account_code = EXCLUDED.account_code,
      account_name = EXCLUDED.account_name,
      phone = EXCLUDED.phone,
      email = EXCLUDED.email,
      address = EXCLUDED.address,
      description = EXCLUDED.description,
      account_type = EXCLUDED.account_type,
      account_source = EXCLUDED.account_source,
      relation_name = EXCLUDED.relation_name,
      industry_name = EXCLUDED.industry_name,
      manager_email = EXCLUDED.manager_email,
      manager_user_name = EXCLUDED.manager_user_name,
      ma_hoi_vien = EXCLUDED.ma_hoi_vien,
      goi_dich_vu = EXCLUDED.goi_dich_vu,
      trang_thai_hoi_vien = EXCLUDED.trang_thai_hoi_vien,
      ngay_tham_gia = EXCLUDED.ngay_tham_gia,
      ho_ten_nguoi_mat = EXCLUDED.ho_ten_nguoi_mat,
      ngay_mat = EXCLUDED.ngay_mat,
      thoi_gian_to_chuc_dam = EXCLUDED.thoi_gian_to_chuc_dam,
      dia_chi_chon_cat = EXCLUDED.dia_chi_chon_cat,
      dia_chi_lien_he = EXCLUDED.dia_chi_lien_he,
      so_cccd = EXCLUDED.so_cccd,
      so_tk_ngan_hang = EXCLUDED.so_tk_ngan_hang,
      ten_ngan_hang = EXCLUDED.ten_ngan_hang,
      contact_name = EXCLUDED.contact_name,
      contact_phone = EXCLUDED.contact_phone,
      province_name = EXCLUDED.province_name,
      revenue = EXCLUDED.revenue,
      getfly_created_at = EXCLUDED.getfly_created_at,
      synced_at = NOW(),
      raw_data = EXCLUDED.raw_data;
    cnt := cnt + 1;
  END LOOP;
  RETURN cnt;
END;
$$;

-- ── Step 5: Reload schema cache ──
NOTIFY pgrst, 'reload schema';
