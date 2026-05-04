-- ============================================================
-- Kiểm Kho (Stocktake) — Database Tables
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Header: Phiếu kiểm kho
CREATE TABLE IF NOT EXISTS fact_kiem_kho (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ma_phieu_kiem VARCHAR(50) NOT NULL UNIQUE,
  kho_id UUID,
  trang_thai VARCHAR(30) DEFAULT 'in_progress',
  nguoi_kiem_id UUID,
  nguoi_kiem_email VARCHAR(255),
  ngay_kiem DATE DEFAULT CURRENT_DATE,
  ghi_chu TEXT,
  tong_loai_kiem INT DEFAULT 0,
  tong_lech INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Detail: Từng hòm trong phiếu kiểm kho
CREATE TABLE IF NOT EXISTS fact_kiem_kho_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kiem_kho_id UUID NOT NULL REFERENCES fact_kiem_kho(id) ON DELETE CASCADE,
  hom_id UUID,
  ma_hom VARCHAR(50) NOT NULL,
  ten_hom VARCHAR(500),
  so_luong_he_thong INT DEFAULT 0,
  so_luong_thuc_te INT DEFAULT 0,
  chenh_lech INT GENERATED ALWAYS AS (so_luong_thuc_te - so_luong_he_thong) STORED,
  ghi_chu TEXT,
  trang_thai VARCHAR(30) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_kiem_kho_kho_id ON fact_kiem_kho(kho_id);
CREATE INDEX IF NOT EXISTS idx_kiem_kho_trang_thai ON fact_kiem_kho(trang_thai);
CREATE INDEX IF NOT EXISTS idx_kiem_kho_items_kiem_kho_id ON fact_kiem_kho_items(kiem_kho_id);
CREATE INDEX IF NOT EXISTS idx_kiem_kho_items_ma_hom ON fact_kiem_kho_items(ma_hom);

-- 4. Enable RLS (Row Level Security) — allow all for service role
ALTER TABLE fact_kiem_kho ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_kiem_kho_items ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "service_role_full_access_kiem_kho" ON fact_kiem_kho
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access_kiem_kho_items" ON fact_kiem_kho_items
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Done! Tables created successfully.
-- ============================================================
