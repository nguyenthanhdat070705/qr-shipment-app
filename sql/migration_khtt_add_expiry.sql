-- ═══════════════════════════════════════════════════════════════
-- Bổ sung cột "Ngày hết hạn" cho hợp đồng Khách Hàng Trăm Tuổi.
-- Giá trị được ĐỒNG BỘ TỰ ĐỘNG từ custom field "ngay_het_han" (field_id 145)
-- trên đơn hàng GetFly, qua web API GET /crm/order/edit?order_id=...&order_type=2.
-- → Muốn đổi ngày hết hạn: sửa "Ngày hết hạn" trên đơn ở GetFly rồi bấm "Đồng bộ GetFly".
--   (Sửa tay trong Supabase sẽ bị ghi đè ở lần sync sau nếu GetFly có giá trị.)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE getfly_khtt_orders
  ADD COLUMN IF NOT EXISTS expiry_date TEXT;   -- 'YYYY-MM-DD'
