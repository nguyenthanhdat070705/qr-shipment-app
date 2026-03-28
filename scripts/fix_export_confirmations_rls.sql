-- Fix RLS cho bảng export_confirmations
-- Chạy file này trong Supabase Dashboard > SQL Editor

-- Cách 1: Tắt RLS hoàn toàn cho bảng này (đơn giản nhất)
ALTER TABLE export_confirmations DISABLE ROW LEVEL SECURITY;

-- HOẶC Cách 2: Giữ RLS nhưng thêm policy cho phép tất cả (cho service role)
-- ALTER TABLE export_confirmations ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "allow_all_insert" ON export_confirmations;
-- DROP POLICY IF EXISTS "allow_all_select" ON export_confirmations;
-- CREATE POLICY "allow_all_insert" ON export_confirmations FOR INSERT WITH CHECK (true);
-- CREATE POLICY "allow_all_select" ON export_confirmations FOR SELECT USING (true);
-- CREATE POLICY "allow_all_update" ON export_confirmations FOR UPDATE USING (true);
