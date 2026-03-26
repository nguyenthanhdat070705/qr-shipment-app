-- ============================================================
-- SQL Helper to clear SCM Database for 1Office Synchronization
-- Chạy đoạn SQL này trong phần SQL Editor của Supabase.
-- Lưu ý: Lệnh này sẽ xoá toàn bộ dữ liệu giao dịch và danh mục (trừ accounts).
-- ============================================================

DO $$ 
DECLARE
    table_name text;
    tables_to_truncate text[] := ARRAY[
        'notifications',
        'qr_codes',
        'delivery_order_items',
        'delivery_orders',
        'goods_receipt_items',
        'goods_receipts',
        'purchase_order_items',
        'purchase_orders',
        'export_confirmations',
        'shipment_confirmations',
        'product_logs',
        'product_holds',
        'product_inventory',
        'products',
        'suppliers',
        'warehouses'
    ];
BEGIN
    FOR table_name IN SELECT unnest(tables_to_truncate)
    LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = table_name) THEN
            EXECUTE format('TRUNCATE TABLE public.%I CASCADE;', table_name);
            RAISE NOTICE 'Đã truncate bảng: %', table_name;
        ELSE
            RAISE NOTICE 'Bảng không tồn tại (bỏ qua): %', table_name;
        END IF;
    END LOOP;
END $$;
