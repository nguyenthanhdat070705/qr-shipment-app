-- ═══════════════════════════════════════════
-- THÊM 5 TÀI KHOẢN MỚI VÀO dim_account
-- Chạy trong Supabase SQL Editor
-- ═══════════════════════════════════════════

INSERT INTO dim_account (email, ho_ten, chuc_vu, phong_ban, role) VALUES
  ('bepbanhthumai@blackstone.com.vn',   'Thu mua',   'Thu mua',   'Thu mua',  'procurement'),
  ('bephaivanhhanh7@blackstone.com.vn', 'Văn hành',  'Vận hành',  'Vận hành', 'operations'),
  ('kho1@blackstone.com.vn',            'Kho 1',     'Thủ kho',   'Kho',      'warehouse'),
  ('kho2@blackstone.com.vn',            'Kho 2',     'Thủ kho',   'Kho',      'warehouse'),
  ('kho3@blackstone.com.vn',            'Kho 3',     'Thủ kho',   'Kho',      'warehouse')
ON CONFLICT (email) DO NOTHING;
