-- SQL Script: Cập nhật cấu trúc bảng "Hòm tháng 3"
-- Dán và chạy đoạn mã này trong Supabase SQL Editor

-- 1. Đổi tên các cột hiện tại để khớp với giao diện hiển thị
ALTER TABLE "Hòm tháng 3" RENAME COLUMN "Tên hàng hóa" TO "sản phẩm";
ALTER TABLE "Hòm tháng 3" RENAME COLUMN "Mã" TO "mã sản phẩm";
ALTER TABLE "Hòm tháng 3" RENAME COLUMN "Ghi chú" TO "gói sản phẩm";
ALTER TABLE "Hòm tháng 3" RENAME COLUMN "Kho" TO "kho nào";

-- 2. Thêm cột mới: "số lượng trên web" và "tình trạng"
ALTER TABLE "Hòm tháng 3" ADD COLUMN "số lượng trên web" integer DEFAULT 0;
ALTER TABLE "Hòm tháng 3" ADD COLUMN "tình trạng" text DEFAULT 'Còn hàng';
