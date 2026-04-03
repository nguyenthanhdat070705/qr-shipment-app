-- Thêm các cột mới cho dim_hom
-- Chạy trong Supabase SQL Editor

ALTER TABLE dim_hom ADD COLUMN IF NOT EXISTS kich_thuoc text;
ALTER TABLE dim_hom ADD COLUMN IF NOT EXISTS thong_so_khac text;
ALTER TABLE dim_hom ADD COLUMN IF NOT EXISTS do_day_thanh text;
ALTER TABLE dim_hom ADD COLUMN IF NOT EXISTS don_vi_tinh text DEFAULT 'Cái';
ALTER TABLE dim_hom ADD COLUMN IF NOT EXISTS tinh_chat text;
ALTER TABLE dim_hom ADD COLUMN IF NOT EXISTS muc_dich_su_dung text;

NOTIFY pgrst, 'reload schema';
