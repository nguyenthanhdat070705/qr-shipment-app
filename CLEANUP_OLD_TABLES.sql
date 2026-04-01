-- ══════════════════════════════════════════════════════════════
-- LỆNH XÓA CÁC BẢNG CŨ (BẢNG RÁC KHÔNG CÒN SỬ DỤNG)
-- Chạy lệnh này trong SQL Editor của Supabase Database 2
-- Từ khóa CASCADE giúp nó xóa luôn các khóa ngoại (Foreign Keys) bị kẹt.
-- ══════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS delivery_order_items CASCADE;
DROP TABLE IF EXISTS delivery_orders CASCADE;
DROP TABLE IF EXISTS goods_receipt_items CASCADE;
DROP TABLE IF EXISTS goods_receipts CASCADE;
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS qr_codes CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS sale_contracts CASCADE;
DROP TABLE IF EXISTS sale_quotations CASCADE;
DROP TABLE IF EXISTS stocktakes CASCADE;
