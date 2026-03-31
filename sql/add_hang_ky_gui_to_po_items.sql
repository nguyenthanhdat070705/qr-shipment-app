-- Thêm trường Hàng ký gửi vào Chi tiết đơn mua hàng
ALTER TABLE fact_don_hang_items ADD COLUMN IF NOT EXISTS hang_ky_gui boolean DEFAULT false;
