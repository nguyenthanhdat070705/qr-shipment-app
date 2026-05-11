-- ═══════════════════════════════════════════════════════════════
-- Migration: Google Drive Attachments Sync Tracking
-- Mục đích: Lưu trữ Folder ID và File ID trên Google Drive
-- Đảm bảo không trùng lặp thư mục và không tải lại file đã có.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS membership_gdrive_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  getfly_contract_id TEXT NOT NULL REFERENCES getfly_contracts(getfly_contract_id) ON DELETE CASCADE,
  
  -- Google Drive Folder ID cho khách hàng này
  gdrive_folder_id TEXT,
  
  -- Google Drive File IDs của từng loại giấy tờ
  vneid_front_file_id TEXT,
  vneid_back_file_id TEXT,
  contract_scan_file_id TEXT,
  membership_form_file_id TEXT,
  
  -- Cờ trạng thái/lịch sử
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index để tối ưu kiểm tra trạng thái sync theo contract_id
CREATE INDEX IF NOT EXISTS idx_membership_gdrive_contract_id ON membership_gdrive_attachments(getfly_contract_id);
