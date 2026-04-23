-- Thêm RLS policy cho 2 bảng vừa tạo
-- Chạy trong Supabase → SQL Editor

-- Bảng sale_contracts
CREATE POLICY "allow_service_role_contracts" 
ON sale_contracts 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Bảng sale_quotations
CREATE POLICY "allow_service_role_quotations" 
ON sale_quotations 
FOR ALL 
USING (true)
WITH CHECK (true);
