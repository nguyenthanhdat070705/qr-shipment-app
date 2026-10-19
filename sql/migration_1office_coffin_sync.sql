-- Chạy sau khi bảng inventory_1office đã được tạo.
-- Mở rộng vùng staging cho snapshot 2AQ và chống tạo bản ghi trùng theo mã hòm + kho.
ALTER TABLE inventory_1office
  ADD COLUMN IF NOT EXISTS source_key text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_1o_source_key
  ON inventory_1office (source_key);
