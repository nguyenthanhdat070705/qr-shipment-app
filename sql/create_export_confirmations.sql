-- TẠO BẢNG export_confirmations (Hoặc sửa lỗi Schema Cache)
CREATE TABLE IF NOT EXISTS export_confirmations (
  stt SERIAL PRIMARY KEY,
  ma_san_pham TEXT NOT NULL,
  ho_ten TEXT NOT NULL,
  email TEXT NOT NULL,
  chuc_vu TEXT DEFAULT '',
  ghi_chu TEXT,
  ngay_xuat DATE DEFAULT CURRENT_DATE,
  thoi_gian_xuat TIME DEFAULT CURRENT_TIME,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BẮT BUỘC CHẠY DÒNG DƯỚI ĐỂ LÀM MỚI SCHEMA CACHE
-- Lỗi "Could not find the table ... in the schema cache" sẽ được fix ngay sau lệnh này
NOTIFY pgrst, 'reload schema';
