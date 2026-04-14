-- ══════════════════════════════════════════════════════════════
-- Migration: Zalo ZNS Automation Tables
-- Chạy trong Supabase Dashboard → SQL Editor
-- Ngày tạo: 2026-04-14
-- ══════════════════════════════════════════════════════════════

-- ── 1. Bảng log gửi ZNS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS zns_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID REFERENCES members(id) ON DELETE SET NULL,
  member_code     TEXT NOT NULL,
  phone           TEXT NOT NULL,
  message_type    TEXT NOT NULL CHECK (message_type IN ('welcome', 'birthday', 'reminder', 'custom')),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  message_id      TEXT,                  -- Zalo message ID trả về
  error_message   TEXT,                  -- Nếu gửi thất bại
  template_id     TEXT,                  -- Zalo ZNS Template ID dùng
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index để query nhanh
CREATE INDEX IF NOT EXISTS idx_zns_log_member_code   ON zns_log (member_code);
CREATE INDEX IF NOT EXISTS idx_zns_log_message_type  ON zns_log (message_type);
CREATE INDEX IF NOT EXISTS idx_zns_log_status        ON zns_log (status);
CREATE INDEX IF NOT EXISTS idx_zns_log_sent_at       ON zns_log (sent_at DESC);

-- ── 2. Bảng nhắc sinh nhật cho Sales ──────────────────────
CREATE TABLE IF NOT EXISTS birthday_reminders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID REFERENCES members(id) ON DELETE CASCADE,
  member_code     TEXT NOT NULL,
  member_name     TEXT NOT NULL,
  phone           TEXT NOT NULL,
  consultant_name TEXT,                   -- Sales phụ trách
  date_of_birth   DATE NOT NULL,
  birthday_date   DATE NOT NULL,          -- Sinh nhật năm hiện tại
  days_until      INT NOT NULL,           -- Số ngày còn lại
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'called', 'skipped')),
  notes           TEXT,                   -- Ghi chú của sales sau khi gọi
  called_at       TIMESTAMPTZ,            -- Thời điểm sales báo đã gọi
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  -- Không tạo reminder trùng
  UNIQUE (member_code, birthday_date)
);

CREATE INDEX IF NOT EXISTS idx_birthday_reminders_date     ON birthday_reminders (birthday_date);
CREATE INDEX IF NOT EXISTS idx_birthday_reminders_status   ON birthday_reminders (status);
CREATE INDEX IF NOT EXISTS idx_birthday_reminders_sales    ON birthday_reminders (consultant_name);

-- ── 3. Thêm cột date_of_birth vào members (nếu chưa có) ────
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- ── 4. Thêm cột zalo_phone vào members (nếu khác SĐT chính) ─
-- Thường dùng chung phone, nhưng để dự phòng
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS zalo_phone TEXT;

-- ── 5. RLS Policies ─────────────────────────────────────────
-- zns_log: service role full access, authenticated read
ALTER TABLE zns_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access zns_log" ON zns_log;
CREATE POLICY "Service role full access zns_log" ON zns_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated read zns_log" ON zns_log;
CREATE POLICY "Authenticated read zns_log" ON zns_log
  FOR SELECT TO authenticated USING (true);

-- birthday_reminders: service role full, authenticated read/update
ALTER TABLE birthday_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access birthday_reminders" ON birthday_reminders;
CREATE POLICY "Service role full access birthday_reminders" ON birthday_reminders
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can manage birthday_reminders" ON birthday_reminders;
CREATE POLICY "Authenticated can manage birthday_reminders" ON birthday_reminders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Confirm ─────────────────────────────────────────────────
SELECT 
  'zns_log' as table_name, count(*) as rows FROM zns_log
UNION ALL
SELECT 
  'birthday_reminders', count(*) FROM birthday_reminders;
