-- ============================================================
-- Fix: getfly_customers RLS policy
-- Chạy trong Supabase SQL Editor
-- ============================================================

-- Cách 1: Disable RLS hoàn toàn (đơn giản nhất - table này chỉ server access)
ALTER TABLE getfly_customers DISABLE ROW LEVEL SECURITY;

-- Cách 2 (thay thế): Giữ RLS nhưng cho phép service_role full access
-- ALTER TABLE getfly_customers ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "service_role_all" ON getfly_customers;
-- CREATE POLICY "service_role_all" ON getfly_customers
--   FOR ALL TO service_role USING (true) WITH CHECK (true);
-- DROP POLICY IF EXISTS "authenticated_read" ON getfly_customers;
-- CREATE POLICY "authenticated_read" ON getfly_customers
--   FOR SELECT TO authenticated USING (true);
