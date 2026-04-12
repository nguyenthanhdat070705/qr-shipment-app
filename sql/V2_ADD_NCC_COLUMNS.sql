-- Thêm các cột mới vào dim_ncc cho quản lý NCC
ALTER TABLE dim_ncc ADD COLUMN IF NOT EXISTS noi_dung text DEFAULT '';
ALTER TABLE dim_ncc ADD COLUMN IF NOT EXISTS thong_tin_lien_he text DEFAULT '';
ALTER TABLE dim_ncc ADD COLUMN IF NOT EXISTS thong_tin_hoa_don text DEFAULT '';
