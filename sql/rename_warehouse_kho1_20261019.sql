-- Authorized 19/10/2026: rename kho1 and keep kho4 as a separate warehouse.
-- No stock transfers, quantity updates, new receipts, or history rewrites.
BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE public.fact_inventory, public.fact_nhap_hang, public.fact_nhap_hang_items,
  public.fact_xuat_hang, public.fact_xuat_hang_items, public.fact_don_hang,
  public.fact_kiem_kho, public.qr_codes IN SHARE MODE;

DO $$
DECLARE
  table_name text;
  row_fingerprint text;
  fingerprints_before jsonb := '{}'::jsonb;
  fingerprints_after jsonb := '{}'::jsonb;
  changed_count integer;
BEGIN
  IF (SELECT count(*) FROM public.dim_kho WHERE ma_kho = 'KHO-01'
      AND ten_kho IN ('Kho Hàm Long', 'Kho Nguyễn Văn Linh (Kho 1)') AND is_active) <> 1 THEN
    RAISE EXCEPTION 'KHO-01 identity differs from the authorized rename';
  END IF;
  IF (SELECT count(*) FROM public.dim_kho WHERE ma_kho = '1O-39'
      AND ten_kho IN ('Kho Nguyễn Văn Linh', 'Kho Nguyễn Văn Linh (Kho 4)') AND is_active) <> 1 THEN
    RAISE EXCEPTION '1O-39 identity differs from the separate kho4 record';
  END IF;
  IF EXISTS (SELECT 1 FROM public.dim_kho WHERE
      (ten_kho = 'Kho Nguyễn Văn Linh (Kho 1)' AND ma_kho <> 'KHO-01') OR
      (ten_kho = 'Kho Nguyễn Văn Linh (Kho 4)' AND ma_kho <> '1O-39')) THEN
    RAISE EXCEPTION 'Target warehouse name is already used by another warehouse';
  END IF;

  FOREACH table_name IN ARRAY ARRAY['fact_inventory', 'fact_nhap_hang', 'fact_nhap_hang_items',
    'fact_xuat_hang', 'fact_xuat_hang_items', 'fact_don_hang', 'fact_kiem_kho', 'qr_codes'] LOOP
    EXECUTE format('SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text, ''[]'')) FROM public.%I t', table_name)
      INTO row_fingerprint;
    fingerprints_before := fingerprints_before || jsonb_build_object(table_name, row_fingerprint);
  END LOOP;

  UPDATE public.dim_kho SET ten_kho = 'Kho Nguyễn Văn Linh (Kho 1)', updated_at = now()
    WHERE ma_kho = 'KHO-01' AND ten_kho IS DISTINCT FROM 'Kho Nguyễn Văn Linh (Kho 1)';
  UPDATE public.dim_kho SET ten_kho = 'Kho Nguyễn Văn Linh (Kho 4)', updated_at = now()
    WHERE ma_kho = '1O-39' AND ten_kho IS DISTINCT FROM 'Kho Nguyễn Văn Linh (Kho 4)';
  UPDATE public.dim_account SET ho_ten = 'Kho Nguyễn Văn Linh (Kho 1)'
    WHERE email = 'kho1@blackstone.com.vn';
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  IF changed_count <> 1 THEN RAISE EXCEPTION 'Expected one kho1 profile'; END IF;
  UPDATE public.dim_account SET ho_ten = 'Kho Nguyễn Văn Linh (Kho 4)'
    WHERE email = 'kho4@blackstone.com.vn';
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  IF changed_count <> 1 THEN RAISE EXCEPTION 'Expected one kho4 profile'; END IF;

  FOREACH table_name IN ARRAY ARRAY['fact_inventory', 'fact_nhap_hang', 'fact_nhap_hang_items',
    'fact_xuat_hang', 'fact_xuat_hang_items', 'fact_don_hang', 'fact_kiem_kho', 'qr_codes'] LOOP
    EXECUTE format('SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text, ''[]'')) FROM public.%I t', table_name)
      INTO row_fingerprint;
    fingerprints_after := fingerprints_after || jsonb_build_object(table_name, row_fingerprint);
  END LOOP;
  IF fingerprints_before IS DISTINCT FROM fingerprints_after THEN
    RAISE EXCEPTION 'Stock or transaction history changed; rolling back the rename';
  END IF;
END $$;
COMMIT;

SELECT k.ma_kho, k.ten_kho, count(i."Mã") AS inventory_rows,
  sum(coalesce(i."Số lượng", 0)) AS raw_quantity,
  sum(coalesce(i."Số lượng", 0)) FILTER (WHERE h.is_active) AS active_product_quantity
FROM public.dim_kho k
LEFT JOIN public.fact_inventory i ON i."Kho" = k.id
LEFT JOIN public.dim_hom h ON h.id = i."Tên hàng hóa"
WHERE k.ma_kho IN ('KHO-01', '1O-39', 'KHO-05')
GROUP BY k.ma_kho, k.ten_kho ORDER BY k.ma_kho;
