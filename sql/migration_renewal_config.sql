-- ══════════════════════════════════════════════════════════════
-- Migration: System Config & Renewal Reminder Support
-- Chạy trong Supabase Dashboard → SQL Editor
-- Ngày tạo: 2026-04-15
-- ══════════════════════════════════════════════════════════════

-- ── 1. Bảng cấu hình hệ thống (lưu Zalo token, v.v.) ────────
CREATE TABLE IF NOT EXISTS system_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: chỉ service_role mới được đọc/ghi
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only system_config" ON system_config;
CREATE POLICY "Service role only system_config" ON system_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 2. Thêm cột expiry_date vào members (nếu chưa có) ───────
-- Cột này lưu ngày hết hạn hợp đồng (đã có từ register API, đảm bảo tồn tại)
ALTER TABLE members ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- ── 3. Thêm cột date_of_birth vào members (nếu chưa có) ────
ALTER TABLE members ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- ── 4. Thêm message_type 'reminder' vào zns_log (nếu có constraint) ──
-- Nếu bảng zns_log đã có CHECK constraint cũ, cần recreate
DO $$
BEGIN
  -- Thử thêm 'reminder' vào constraint (safe - chỉ chạy nếu cần)
  ALTER TABLE zns_log
    DROP CONSTRAINT IF EXISTS zns_log_message_type_check;
  ALTER TABLE zns_log
    ADD CONSTRAINT zns_log_message_type_check
    CHECK (message_type IN ('welcome', 'birthday', 'reminder', 'custom'));
EXCEPTION WHEN OTHERS THEN
  -- Bỏ qua nếu lỗi (constraint không tồn tại)
  NULL;
END $$;

-- ── Confirm ─────────────────────────────────────────────────
SELECT
  'system_config' as table_name, count(*) as rows FROM system_config
UNION ALL
SELECT
  'zns_log', count(*) FROM zns_log
UNION ALL
SELECT
  'birthday_reminders', count(*) FROM birthday_reminders;
