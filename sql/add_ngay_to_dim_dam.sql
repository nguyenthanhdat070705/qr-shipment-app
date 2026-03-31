-- THÊM CỘT NGÀY VÀO DIM_DAM
ALTER TABLE dim_dam ADD COLUMN IF NOT EXISTS ngay text;

-- CẬP NHẬT DỮ LIỆU TỪ FACT_DAM SANG LẠI DIM_DAM
UPDATE dim_dam 
SET ngay = fact_dam.ngay 
FROM fact_dam 
WHERE dim_dam.ma_dam = fact_dam.ma_dam;
