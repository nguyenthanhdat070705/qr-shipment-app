-- ══════════════════════════════════════════════════════════════
-- BLACKSTONE SCM — Tạo bảng Dim_Đám
-- Chạy trong Supabase SQL Editor:
-- https://supabase.com/dashboard/project/zspazvdyrrkdosqigomk/sql/new
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS dim_dam (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_dam        text UNIQUE NOT NULL,              -- Mã đám (VD: 260101)
  loai          text,                               -- Loại (Chôn CC, Thiêu TC, ...)
  chi_nhanh     text,                               -- Chi nhánh (CN1, CN2, CN3)
  nguoi_mat     text,                               -- Tên người mất
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Trigger updated_at
CREATE TRIGGER set_dim_dam_updated_at
  BEFORE UPDATE ON dim_dam
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Indexes
CREATE INDEX idx_dim_dam_loai ON dim_dam(loai);
CREATE INDEX idx_dim_dam_chi_nhanh ON dim_dam(chi_nhanh);

-- RLS
ALTER TABLE dim_dam ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dim_dam_select" ON dim_dam FOR SELECT USING (true);
CREATE POLICY "dim_dam_all"    ON dim_dam FOR ALL    USING (true) WITH CHECK (true);
