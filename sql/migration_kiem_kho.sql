-- ============================================================
-- Migration: Kiểm kho (Stocktaking / Stock Check)
-- ============================================================
-- Bảng fact_kiem_kho: Header phiếu kiểm kho
-- Bảng fact_kiem_kho_items: Chi tiết từng sản phẩm trong phiếu kiểm kho

-- Phiếu kiểm kho header
CREATE TABLE IF NOT EXISTS fact_kiem_kho (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ma_phieu_kiem VARCHAR(50) NOT NULL UNIQUE,
  kho_id UUID REFERENCES dim_kho(id),
  trang_thai VARCHAR(30) DEFAULT 'draft',     -- draft | in_progress | completed | cancelled
  nguoi_kiem_id UUID REFERENCES dim_account(id),
  nguoi_kiem_email VARCHAR(255),
  ngay_kiem DATE DEFAULT CURRENT_DATE,
  ghi_chu TEXT,
  tong_loai_kiem INT DEFAULT 0,               -- Tổng loại SP đã kiểm
  tong_lech INT DEFAULT 0,                    -- Tổng số loại có chênh lệch
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chi tiết kiểm kho từng sản phẩm
CREATE TABLE IF NOT EXISTS fact_kiem_kho_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kiem_kho_id UUID NOT NULL REFERENCES fact_kiem_kho(id) ON DELETE CASCADE,
  hom_id UUID REFERENCES dim_hom(id),
  ma_hom VARCHAR(50) NOT NULL,
  ten_hom VARCHAR(255),
  so_luong_he_thong INT DEFAULT 0,            -- Tồn kho theo hệ thống
  so_luong_thuc_te INT DEFAULT 0,             -- Số lượng đếm thực tế
  chenh_lech INT GENERATED ALWAYS AS (so_luong_thuc_te - so_luong_he_thong) STORED,
  ghi_chu TEXT,
  trang_thai VARCHAR(30) DEFAULT 'pending',   -- pending | checked | adjusted
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_kiem_kho_kho ON fact_kiem_kho(kho_id);
CREATE INDEX IF NOT EXISTS idx_kiem_kho_status ON fact_kiem_kho(trang_thai);
CREATE INDEX IF NOT EXISTS idx_kiem_kho_items_header ON fact_kiem_kho_items(kiem_kho_id);
CREATE INDEX IF NOT EXISTS idx_kiem_kho_items_hom ON fact_kiem_kho_items(ma_hom);
