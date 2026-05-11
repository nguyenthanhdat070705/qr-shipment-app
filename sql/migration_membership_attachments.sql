-- ═══════════════════════════════════════════════════════════════
-- Migration: Membership Attachments
-- Mục đích: Lưu trữ link backup của các file đính kèm (VNeID, scan) từ Getfly
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS membership_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  getfly_contract_id TEXT NOT NULL REFERENCES getfly_contracts(getfly_contract_id) ON DELETE CASCADE,
  
  -- URLs của file vật lý đã được backup về Supabase Storage (hoặc Drive)
  vneid_front_url TEXT,
  vneid_back_url TEXT,
  contract_scan_url TEXT,
  membership_form_url TEXT,
  
  -- JSON để lưu thêm các file khác nếu có
  other_attachments JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index để truy vấn nhanh theo contract_id
CREATE INDEX IF NOT EXISTS idx_membership_attachments_contract_id ON membership_attachments(getfly_contract_id);

-- Lưu ý trên Supabase:
-- Bạn cần vào trang Supabase Dashboard -> Storage
-- 1. Tạo một bucket tên là `membership_documents` (public hoặc private tuỳ yêu cầu bảo mật, khuyến nghị private).
-- 2. Cài đặt RLS Policies cho bucket này để chỉ những người có quyền (authenticated users) mới được xem và tải file.
