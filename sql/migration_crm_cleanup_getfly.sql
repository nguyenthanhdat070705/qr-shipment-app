-- ============================================================================
-- DỌN SẠCH SYNC GETFLY CŨ (v3) — thay bằng luồng Google Sheets → crm_*
-- ============================================================================
-- QUAN TRỌNG: chạy SAU khi đã tạo 14 bảng crm_* (migration_crm_sheets_tables.sql)
-- và đã sync data vào crm_hop_dong_ban.
--
-- Bảo toàn file đính kèm Hội viên: nếu có bảng membership_attachments /
-- membership_gdrive_attachments (FK tới getfly_contracts), backfill cột cầu nối
-- source_contract_code (mã MBS, bền vững) → gỡ FK → rồi mới DROP. KHÔNG mất file.
--
-- Toàn bộ thao tác lên bảng attachment được BỌC trong guard to_regclass nên
-- AN TOÀN kể cả khi 1 trong 2 bảng không tồn tại. Chạy lại nhiều lần đều OK.
-- ============================================================================

DO $$
DECLARE
  t TEXT;
  has_getfly_contracts BOOLEAN := to_regclass('public.getfly_contracts') IS NOT NULL;
BEGIN
  FOREACH t IN ARRAY ARRAY['membership_attachments', 'membership_gdrive_attachments'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;  -- bảng không tồn tại → bỏ qua
    END IF;

    -- 1) Thêm cột cầu nối
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS source_contract_code TEXT;', t);

    -- 2) Backfill từ getfly_contracts (nếu còn)
    IF has_getfly_contracts THEN
      EXECUTE format(
        'UPDATE %I a SET source_contract_code = gc.source_contract_code
           FROM getfly_contracts gc
          WHERE gc.getfly_contract_id = a.getfly_contract_id
            AND COALESCE(a.source_contract_code, '''') = '''';', t);
    END IF;

    -- 3) Index cho cột cầu nối
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (source_contract_code);', 'idx_' || t || '_src_code', t);

    -- 4) Gỡ FK tới getfly_contracts (giữ nguyên các dòng đính kèm)
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I;', t, t || '_getfly_contract_id_fkey');
  END LOOP;
END $$;

-- 5) Xoá RPC + bảng GetFly cũ (CASCADE gỡ nốt FK/policy phụ thuộc, KHÔNG xoá rows attachment)
DROP FUNCTION IF EXISTS public.bulk_upsert_getfly_contracts(jsonb);
DROP FUNCTION IF EXISTS public.bulk_upsert_getfly_accounts(jsonb);

DROP TABLE IF EXISTS getfly_khtt_orders CASCADE;
DROP TABLE IF EXISTS getfly_contracts   CASCADE;
DROP TABLE IF EXISTS getfly_accounts    CASCADE;
DROP TABLE IF EXISTS getfly_customers   CASCADE;

-- Xong. Tính năng Hội viên/Hợp đồng/KHTT giờ đọc từ crm_* (xem repoint trong code).
