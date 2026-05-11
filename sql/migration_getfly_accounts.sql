-- ═══════════════════════════════════════════════════════════════
-- Migration: GetFly Accounts (Quản lý Khách Hàng / Hội Viên)
-- Syncs 7,180 customer accounts from GetFly CRM to Supabase
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS getfly_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  getfly_account_id TEXT UNIQUE NOT NULL,     -- account_id from Getfly

  -- Core account fields
  account_code TEXT,                           -- Mã KH (18042023, KH0024, 230101...)
  account_name TEXT,                           -- Tên khách hàng
  phone TEXT,                                  -- SĐT
  email TEXT,                                  -- Email
  address TEXT,                                -- Địa chỉ
  description TEXT,                            -- Ghi chú

  -- Classification
  account_type TEXT,                           -- An Táng, Hỏa Táng, Khách Lẻ
  account_source TEXT,                         -- MKT-Facebook, MKT-Hotline, Sales_CTV...
  relation_name TEXT,                          -- Đã Nghiệm Thu, Từ Chối, TL-Cần Tư Vấn...
  industry_name TEXT,                          -- Nghĩa Trang Sala, Bệnh Viện NTP...

  -- Manager
  manager_email TEXT,                          -- Email người phụ trách
  manager_user_name TEXT,                      -- Username người phụ trách

  -- Membership custom fields
  ma_hoi_vien TEXT,                            -- Mã hội viên
  goi_dich_vu TEXT,                            -- Gói dịch vụ
  trang_thai_hoi_vien TEXT,                    -- Trạng thái hội viên
  ngay_tham_gia TEXT,                          -- Ngày tham gia

  -- Deceased info custom fields
  ho_ten_nguoi_mat TEXT,                       -- Họ tên người mất
  ngay_mat TEXT,                               -- Ngày mất
  thoi_gian_to_chuc_dam TEXT,                  -- Thời gian tổ chức đám
  dia_chi_chon_cat TEXT,                       -- Địa chỉ chôn cất
  dia_chi_lien_he TEXT,                        -- Địa chỉ liên hệ

  -- ID & Bank custom fields
  so_cccd TEXT,                                -- Số CCCD
  so_tk_ngan_hang TEXT,                        -- Số tài khoản ngân hàng
  ten_ngan_hang TEXT,                          -- Tên ngân hàng

  -- Contact info
  contact_name TEXT,                           -- Tên liên hệ chính
  contact_phone TEXT,                          -- SĐT liên hệ chính

  -- Location
  province_name TEXT,                          -- Tỉnh/TP
  revenue NUMERIC DEFAULT 0,                   -- Doanh thu

  -- Google Drive
  gdrive_folder_id TEXT,                       -- Google Drive folder ID for this customer
  gdrive_folder_url TEXT,                      -- Google Drive folder URL

  -- System
  getfly_created_at TEXT,                      -- Ngày tạo trên Getfly
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB                               -- Full raw data for reference
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_getfly_accounts_name ON getfly_accounts(account_name);
CREATE INDEX IF NOT EXISTS idx_getfly_accounts_phone ON getfly_accounts(phone);
CREATE INDEX IF NOT EXISTS idx_getfly_accounts_code ON getfly_accounts(account_code);
CREATE INDEX IF NOT EXISTS idx_getfly_accounts_type ON getfly_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_getfly_accounts_relation ON getfly_accounts(relation_name);
CREATE INDEX IF NOT EXISTS idx_getfly_accounts_hoi_vien ON getfly_accounts(ma_hoi_vien);
CREATE INDEX IF NOT EXISTS idx_getfly_accounts_cccd ON getfly_accounts(so_cccd);
CREATE INDEX IF NOT EXISTS idx_getfly_accounts_synced ON getfly_accounts(synced_at DESC);
