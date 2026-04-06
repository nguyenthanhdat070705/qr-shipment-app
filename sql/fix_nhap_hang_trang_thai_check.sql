-- Fix: Mở rộng CHECK constraint cho fact_nhap_hang.trang_thai
-- để hỗ trợ phiếu nhập tạm (pending_po, pending_confirm)

-- Xóa constraint cũ
ALTER TABLE fact_nhap_hang DROP CONSTRAINT IF EXISTS fact_nhap_hang_trang_thai_check;

-- Tạo constraint mới với đầy đủ trạng thái
ALTER TABLE fact_nhap_hang ADD CONSTRAINT fact_nhap_hang_trang_thai_check
  CHECK (trang_thai IN ('draft', 'completed', 'cancelled', 'pending_po', 'pending_confirm'));

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
